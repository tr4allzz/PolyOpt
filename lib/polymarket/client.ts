// lib/polymarket/client.ts

import { API_ENDPOINTS, CACHE_DURATIONS } from '@/lib/constants';
import {
  PolymarketMarket,
  PolymarketOrder,
  RewardConfig,
  OrderBookSummary,
} from '@/types/api';
import { RewardMarketData, UserOrderData } from './types';
import { Order } from '@/types/rewards';
import { LRUCache } from '@/lib/cache/lru-cache';
import { fetchWithTimeout, fetchWithRetry } from '@/lib/utils/fetch-with-timeout';

// Default timeout for API requests (10 seconds)
const DEFAULT_TIMEOUT = 10000;

/**
 * LRU Cache for API responses (max 500 entries to prevent memory leaks)
 */
const cache = new LRUCache(500);

/**
 * Estimate daily reward pool based on market parameters
 * This is a heuristic until we have access to actual reward config data
 */
function estimateRewardPool(
  liquidity: number,
  volume: number,
  maxSpread: number,
  minSize: number
): number {
  // Base reward on liquidity (higher liquidity = more rewards)
  // Polymarket typically allocates $50-500/day per market based on size
  const liquidityFactor = Math.min(liquidity / 100000, 1.0); // Normalize to 0-1

  // Volume factor (more active markets get more rewards)
  const volumeFactor = Math.min(volume / 1000000, 1.0);

  // Spread factor (tighter spreads = higher quality = more rewards)
  const spreadFactor = Math.max(0, 1 - maxSpread / 10); // Normalize spread

  // Combine factors for base reward (range: $10-400/day)
  const baseReward = 50; // Minimum $50/day
  const maxReward = 400; // Maximum $400/day
  const combinedFactor = (liquidityFactor * 0.5 + volumeFactor * 0.3 + spreadFactor * 0.2);

  return baseReward + (maxReward - baseReward) * combinedFactor;
}

function getCached<T>(key: string): T | null {
  return cache.get(key) as T | null;
}

function setCache<T>(key: string, data: T, ttlSeconds: number): void {
  cache.set(key, data, ttlSeconds);
}

/**
 * Fetch all reward markets from Polymarket
 */
export async function fetchRewardMarkets(): Promise<RewardMarketData[]> {
  const cacheKey = 'reward-markets';
  const cached = getCached<RewardMarketData[]>(cacheKey);
  if (cached) return cached;

  try {
    // Fetch ONLY from CLOB API - these have ACTUAL active liquidity rewards
    console.log('💰 Fetching markets with ACTUAL active rewards from CLOB API...');

    const clobResponse = await fetchWithTimeout(
      `${API_ENDPOINTS.CLOB_API}/sampling-simplified-markets`,
      { timeout: DEFAULT_TIMEOUT }
    );
    if (!clobResponse.ok) {
      throw new Error(`CLOB API error: ${clobResponse.status}`);
    }

    const clobData = await clobResponse.json();
    const marketsWithActiveRewards = clobData.data.filter((m: any) => m.rewards);

    console.log(`✅ Found ${marketsWithActiveRewards.length} markets with ACTIVE liquidity rewards`);

    // Fetch Gamma API for market details
    console.log('📦 Fetching market details from Gamma API...');
    const gammaResponse = await fetchWithTimeout(
      `${API_ENDPOINTS.POLYMARKET_API}/markets?closed=false&active=true&limit=1000`,
      { timeout: DEFAULT_TIMEOUT }
    );
    if (!gammaResponse.ok) {
      throw new Error(`Gamma API error: ${gammaResponse.status}`);
    }

    const gammaMarkets: PolymarketMarket[] = await gammaResponse.json();
    const gammaMap = new Map(gammaMarkets.map(m => [m.conditionId, m]));

    console.log(`📦 Received ${gammaMarkets.length} markets from Gamma API`);

    // Transform to our format using CLOB data as source of truth
    const markets: RewardMarketData[] = marketsWithActiveRewards
      .map((clobMarket: any) => {
        const gammaMarket = gammaMap.get(clobMarket.condition_id);
        if (!gammaMarket) return null;

        // Use REAL reward data from CLOB
        const dailyRate = clobMarket.rewards.rates?.[0]?.rewards_daily_rate || 0;
        const minSize = clobMarket.rewards.min_size || 0;
        const maxSpread = clobMarket.rewards.max_spread || 0;

        const m = gammaMarket;
        // Parse outcomePrices if available
        let midpoint = 0.5;
        try {
          if (m.outcomePrices) {
            const prices = JSON.parse(m.outcomePrices);
            if (prices.length >= 2) {
              midpoint = parseFloat(prices[0]); // YES price
            }
          } else if (m.lastTradePrice !== undefined) {
            midpoint = m.lastTradePrice;
          } else if (m.bestBid !== undefined && m.bestAsk !== undefined) {
            midpoint = (m.bestBid + m.bestAsk) / 2;
          }
        } catch (e) {
          console.warn(`Could not parse price for ${m.question}`, e);
        }

        // Gamma API returns volumeClob/liquidityClob for CLOB trading
        const volume = parseFloat(m.volumeClob || m.volume || '0');
        const liquidity = parseFloat(m.liquidityClob || m.liquidity || '0');

        return {
          id: m.id, // Use Gamma API id
          conditionId: clobMarket.condition_id, // From CLOB (for Data API)
          question: m.question,
          description: m.description,
          endDate: new Date(m.endDate || m.endDateIso || Date.now()),
          midpoint,
          volume,
          liquidity,
          active: m.active && !m.closed,
          resolved: m.closed,
          maxSpread, // From CLOB (actual)
          minSize, // From CLOB (actual)
          rewardPool: dailyRate, // From CLOB (actual daily rate!)
        };
      })
      .filter((m: any) => m !== null && m.midpoint > 0); // Filter out nulls and invalid prices

    console.log(`✅ Found ${markets.length} markets with ACTUAL active rewards`);

    setCache(cacheKey, markets, CACHE_DURATIONS.MARKETS);
    return markets;
  } catch (error) {
    console.error('Error fetching reward markets:', error);
    return [];
  }
}

/**
 * Fetch market details by ID
 */
export async function fetchMarketDetails(
  marketId: string
): Promise<RewardMarketData | null> {
  const cacheKey = `market-${marketId}`;
  const cached = getCached<RewardMarketData>(cacheKey);
  if (cached) return cached;

  try {
    // Fetch from Polymarket Gamma API with timeout
    const response = await fetchWithTimeout(
      `${API_ENDPOINTS.POLYMARKET_API}/markets/${marketId}`,
      { timeout: DEFAULT_TIMEOUT }
    );

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }

    const data: PolymarketMarket = await response.json();

    // Parse outcomePrices if available
    let midpoint = 0.5;
    try {
      if (data.outcomePrices) {
        const prices = JSON.parse(data.outcomePrices);
        if (prices.length >= 2) {
          midpoint = parseFloat(prices[0]); // YES price
        }
      } else if (data.lastTradePrice !== undefined) {
        midpoint = data.lastTradePrice;
      } else if (data.bestBid !== undefined && data.bestAsk !== undefined) {
        midpoint = (data.bestBid + data.bestAsk) / 2;
      }
    } catch (e) {
      console.warn(`Could not parse price for ${data.question}`, e);
    }

    // Gamma API returns volumeClob/liquidityClob for CLOB trading
    const volume = parseFloat((data as any).volumeClob || data.volume || '0');
    const liquidity = parseFloat((data as any).liquidityClob || data.liquidity || '0');
    const maxSpread = data.rewardsMaxSpread;
    const minSize = data.rewardsMinSize;

    const market: RewardMarketData = {
      id: data.id, // Use Gamma API id, NOT conditionId!
      question: data.question,
      description: data.description,
      endDate: new Date(data.endDate || data.endDateIso || Date.now()),
      midpoint,
      volume,
      liquidity,
      active: data.active && !data.closed,
      resolved: data.closed,
      maxSpread,
      minSize,
      rewardPool: estimateRewardPool(liquidity, volume, maxSpread, minSize),
    };

    setCache(cacheKey, market, CACHE_DURATIONS.MARKETS);
    return market;
  } catch (error) {
    console.error(`Error fetching market ${marketId}:`, error);
    return null;
  }
}

/**
 * Fetch order book for a market
 */
export async function fetchOrderBook(
  marketId: string,
  assetId: string
): Promise<OrderBookSummary | null> {
  const cacheKey = `orderbook-${marketId}-${assetId}`;
  const cached = getCached<OrderBookSummary>(cacheKey);
  if (cached) return cached;

  try {
    // Fetch from Polymarket CLOB API with timeout
    const response = await fetchWithTimeout(
      `${API_ENDPOINTS.CLOB_API}/book?token_id=${assetId}`,
      { timeout: DEFAULT_TIMEOUT }
    );

    if (!response.ok) {
      throw new Error(`CLOB API error: ${response.status}`);
    }

    const data: OrderBookSummary = await response.json();

    setCache(cacheKey, data, CACHE_DURATIONS.ORDER_BOOK);
    return data;
  } catch (error) {
    console.error(`Error fetching order book for ${marketId}:`, error);
    return null;
  }
}

/**
 * Fetch user's trading activity for a specific market
 * Note: This returns completed trades, not open orders
 * Use this to detect markets where user has been active
 */
export async function fetchUserActivity(
  walletAddress: string,
  marketId?: string
): Promise<any[]> {
  const cacheKey = `user-activity-${walletAddress}-${marketId || 'all'}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    // Fetch from Polymarket Data API (public, no auth required) with timeout
    const url = new URL(`${API_ENDPOINTS.DATA_API}/activity`);
    url.searchParams.append('user', walletAddress);
    if (marketId) {
      url.searchParams.append('market', marketId);
    }
    url.searchParams.append('type', 'TRADE');
    url.searchParams.append('limit', '500');

    const response = await fetchWithTimeout(url.toString(), { timeout: DEFAULT_TIMEOUT });

    if (!response.ok) {
      throw new Error(`Data API error: ${response.status}`);
    }

    const data = await response.json();
    setCache(cacheKey, data, CACHE_DURATIONS.USER_POSITIONS);
    return data;
  } catch (error) {
    console.error(`Error fetching activity for ${walletAddress}:`, error);
    return [];
  }
}

/**
 * Check if a wallet holds shares in a specific market
 * Returns holder data if found, null otherwise
 */
export async function checkUserHoldings(
  walletAddress: string,
  marketConditionId: string
): Promise<any | null> {
  try {
    // Fetch top holders for this market with timeout
    const url = new URL(`${API_ENDPOINTS.DATA_API}/holders`);
    url.searchParams.append('market', marketConditionId);
    url.searchParams.append('limit', '500');
    url.searchParams.append('minBalance', '1');

    const response = await fetchWithTimeout(url.toString(), { timeout: DEFAULT_TIMEOUT });

    if (!response.ok) {
      console.warn(`Holders API error for market ${marketConditionId}: ${response.status}`);
      return null;
    }

    const holders = await response.json();

    // Check if our wallet is in the holders list
    const userHolder = holders.find(
      (h: any) => h.proxyWallet?.toLowerCase() === walletAddress.toLowerCase()
    );

    return userHolder || null;
  } catch (error) {
    console.error(`Error checking holdings for ${walletAddress} in ${marketConditionId}:`, error);
    return null;
  }
}

/**
 * Fetch user's orders for a specific market
 * Note: This requires authentication via CLOB API which we cannot do without user's API credentials
 * For now, we use activity and holdings as a proxy to detect user participation
 */
export async function fetchUserOrders(
  walletAddress: string,
  marketId: string
): Promise<Order[]> {
  // NOTE: The CLOB /data/orders endpoint requires L2 authentication
  // We cannot fetch arbitrary users' orders without their API credentials
  // Instead, we detect their activity and prompt them to use the calculator
  console.warn(`Cannot fetch orders without authentication. Use activity endpoint instead.`);
  return [];
}

/**
 * Fetch all orders in a market (for competition analysis)
 */
export async function fetchAllMarketOrders(
  marketId: string
): Promise<Order[]> {
  const cacheKey = `all-orders-${marketId}`;
  const cached = getCached<Order[]>(cacheKey);
  if (cached) return cached;

  try {
    // Mock implementation - replace with actual CLOB API call
    // This would aggregate orders from order book
    const orders: Order[] = [];

    setCache(cacheKey, orders, CACHE_DURATIONS.ORDER_BOOK);
    return orders;
  } catch (error) {
    console.error(`Error fetching all orders for ${marketId}:`, error);
    return [];
  }
}

/**
 * Transform Polymarket market data to our format
 */
export function transformMarketData(
  market: PolymarketMarket,
  rewardConfig?: RewardConfig
): RewardMarketData {
  // Calculate midpoint from token prices
  const yesToken = (market as any).tokens?.find((t: any) => t.outcome === 'YES');
  const midpoint = yesToken ? parseFloat(yesToken.price) : 0.5;

  return {
    id: (market as any).condition_id || (market as any).conditionId,
    question: market.question,
    description: market.description || '',
    endDate: new Date((market as any).end_date_iso || (market as any).endDateIso || Date.now()),
    midpoint,
    volume: parseFloat((market as any).volumeClob || (market as any).volume || '0'),
    liquidity: parseFloat((market as any).liquidityClob || (market as any).liquidity || '0'),
    active: (market as any).active && !(market as any).closed,
    resolved: (market as any).closed || false,
    maxSpread: rewardConfig
      ? parseFloat(rewardConfig.max_spread)
      : (market as any).max_incentive_spread || 0.03,
    minSize: rewardConfig
      ? parseFloat(rewardConfig.min_size)
      : (market as any).min_incentive_size || 0,
    rewardPool: rewardConfig ? parseFloat(rewardConfig.daily_reward_amount) : 0,
  };
}

/**
 * Clear cache (useful for testing or forced refresh)
 */
export function clearCache(): void {
  cache.clear();
}
