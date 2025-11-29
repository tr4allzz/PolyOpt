// lib/polymarket/rewards-client.ts
// Fetch REAL reward allocations from Polymarket CLOB API

import { API_ENDPOINTS } from '@/lib/constants';

export interface RewardData {
  conditionId: string;
  dailyRate: number; // Actual daily reward in USDC
  minSize: number;
  maxSpread: number;
  assetAddress: string;
}

/**
 * Fetch real reward allocations from CLOB API
 * This endpoint provides actual rewards_daily_rate values
 */
export async function fetchRewardAllocations(): Promise<Map<string, RewardData>> {
  try {
    const response = await fetch(`${API_ENDPOINTS.CLOB_API}/sampling-simplified-markets`);

    if (!response.ok) {
      throw new Error(`CLOB API error: ${response.status}`);
    }

    const data = await response.json();
    const rewardMap = new Map<string, RewardData>();

    data.data.forEach((market: any) => {
      if (market.rewards) {
        const { min_size, max_spread, rates } = market.rewards;

        // Sum up all daily rates (usually just one rate per market)
        let totalDailyRate = 0;
        let assetAddress = '';

        if (rates && rates.length > 0) {
          rates.forEach((rate: any) => {
            totalDailyRate += parseFloat(rate.rewards_daily_rate || 0);
            assetAddress = rate.asset_address;
          });
        }

        rewardMap.set(market.condition_id, {
          conditionId: market.condition_id,
          dailyRate: totalDailyRate,
          minSize: min_size || 0,
          maxSpread: max_spread || 0,
          assetAddress,
        });
      }
    });

    return rewardMap;
  } catch (error) {
    return new Map();
  }
}

/**
 * Get reward data for a specific market
 */
export async function getMarketRewardData(conditionId: string): Promise<RewardData | null> {
  const rewardMap = await fetchRewardAllocations();
  return rewardMap.get(conditionId) || null;
}
