// lib/rewards/volatility-analyzer.ts

import { API_ENDPOINTS } from '@/lib/constants';
import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout';

export interface VolatilityMetrics {
  hourlyStdDev: number;        // Standard deviation of hourly price changes
  dailyStdDev: number;          // Standard deviation of daily price changes
  maxHourlySwing: number;       // Maximum price move in 1 hour (24h lookback)
  maxDailySwing: number;        // Maximum price move in 1 day (7d lookback)
  volatilityScore: number;      // 0-100, normalized volatility score (0 = very stable, 100 = extremely volatile)
  priceHistory: PricePoint[];   // Historical price data used for calculations
}

export interface PricePoint {
  timestamp: Date;
  price: number;
}

/**
 * Calculate volatility metrics for a market
 *
 * @param conditionId - Market condition ID (from CLOB API)
 * @param lookbackDays - Number of days to analyze (default 7)
 * @returns Volatility metrics
 */
export async function calculateVolatility(
  conditionId: string,
  lookbackDays: number = 7
): Promise<VolatilityMetrics> {
  try {
    // Fetch historical price data from Polymarket Data API
    const priceHistory = await fetchPriceHistory(conditionId, lookbackDays);

    if (priceHistory.length < 2) {
      // Not enough data - return default low volatility
      return {
        hourlyStdDev: 0,
        dailyStdDev: 0,
        maxHourlySwing: 0,
        maxDailySwing: 0,
        volatilityScore: 0,
        priceHistory: [],
      };
    }

    // Calculate hourly price changes
    const hourlyChanges = calculatePriceChanges(priceHistory, 'hourly');
    const dailyChanges = calculatePriceChanges(priceHistory, 'daily');

    // Calculate standard deviations
    const hourlyStdDev = calculateStandardDeviation(hourlyChanges);
    const dailyStdDev = calculateStandardDeviation(dailyChanges);

    // Find maximum swings
    const maxHourlySwing = Math.max(...hourlyChanges.map(Math.abs));
    const maxDailySwing = Math.max(...dailyChanges.map(Math.abs));

    // Calculate normalized volatility score (0-100)
    const volatilityScore = calculateVolatilityScore(hourlyStdDev, dailyStdDev, maxHourlySwing);

    return {
      hourlyStdDev,
      dailyStdDev,
      maxHourlySwing,
      maxDailySwing,
      volatilityScore,
      priceHistory,
    };
  } catch (error) {
    console.error(`Error calculating volatility for ${conditionId}:`, error);
    // Return default low volatility on error
    return {
      hourlyStdDev: 0,
      dailyStdDev: 0,
      maxHourlySwing: 0,
      maxDailySwing: 0,
      volatilityScore: 0,
      priceHistory: [],
    };
  }
}

/**
 * Retry helper with exponential backoff for handling connection resets
 */
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      const isNetworkError = error?.code === 'ECONNRESET' ||
                            error?.cause?.code === 'ECONNRESET' ||
                            error?.message?.includes('terminated');

      if (isLastAttempt || !isNetworkError) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`⚠️  Connection reset, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Fetch historical price data from Polymarket CLOB API
 *
 * @param conditionId - Market condition ID
 * @param lookbackDays - Number of days to fetch
 * @returns Array of price points
 */
async function fetchPriceHistory(
  conditionId: string,
  lookbackDays: number
): Promise<PricePoint[]> {
  try {
    // Step 1: Get token IDs from CLOB API (with retry)
    // Query markets by condition_id
    const marketUrl = new URL(`${API_ENDPOINTS.CLOB_API}/markets`);
    marketUrl.searchParams.append('condition_id', conditionId);

    const marketResponse = await fetchWithRetry(() =>
      fetchWithTimeout(marketUrl.toString(), { timeout: 10000 })
    );

    if (!marketResponse.ok) {
      throw new Error(`CLOB API market error: ${marketResponse.status}`);
    }

    const marketListData = await marketResponse.json();

    // Extract first market from paginated response
    const markets = marketListData.data || marketListData || [];
    if (markets.length === 0) {
      console.warn(`No market found for condition_id ${conditionId}`);
      return [];
    }

    const marketData = markets[0]; // Get first matching market

    // Get YES token ID from tokens array
    const tokens = marketData.tokens || [];
    if (tokens.length === 0) {
      console.warn(`No tokens found for market ${conditionId}`);
      return [];
    }

    // Find YES token (first token is typically YES)
    const yesToken = tokens[0];
    const yesTokenId = yesToken.token_id;

    if (!yesTokenId) {
      console.warn(`No token_id found in tokens for market ${conditionId}`);
      return [];
    }

    // Step 2: Fetch price history using token ID (with retry)
    // Try with interval first (simpler and often more reliable)
    const pricesUrl = new URL(`${API_ENDPOINTS.CLOB_API}/prices-history`);
    pricesUrl.searchParams.append('market', yesTokenId);

    // Use interval instead of startTs/endTs (mutually exclusive)
    // Options: 1m, 1w, 1d, 6h, 1h, or max
    const interval = lookbackDays >= 7 ? '1w' : lookbackDays >= 1 ? '1d' : '6h';
    pricesUrl.searchParams.append('interval', interval);
    pricesUrl.searchParams.append('fidelity', '60'); // 60-minute resolution

    const pricesResponse = await fetchWithRetry(() =>
      fetchWithTimeout(pricesUrl.toString(), { timeout: 10000 })
    );

    if (!pricesResponse.ok) {
      throw new Error(`CLOB API prices error: ${pricesResponse.status}`);
    }

    const data = await pricesResponse.json();

    // Transform to our PricePoint format
    const pricePoints: PricePoint[] = (data.history || []).map((point: any) => ({
      timestamp: new Date(point.t * 1000), // Convert Unix timestamp to Date
      price: parseFloat(point.p), // YES token price
    }));

    console.log(`✅ Fetched ${pricePoints.length} price points for market ${conditionId}`);
    if (pricePoints.length > 0) {
      console.log(`   Price range: $${Math.min(...pricePoints.map(p => p.price)).toFixed(4)} - $${Math.max(...pricePoints.map(p => p.price)).toFixed(4)}`);
    }

    return pricePoints;
  } catch (error) {
    console.error(`Error fetching price history for ${conditionId}:`, error);
    return [];
  }
}

/**
 * Calculate price changes between consecutive data points
 *
 * @param priceHistory - Historical price data
 * @param interval - 'hourly' or 'daily'
 * @returns Array of price changes (delta)
 */
function calculatePriceChanges(
  priceHistory: PricePoint[],
  interval: 'hourly' | 'daily'
): number[] {
  const changes: number[] = [];
  const stepSize = interval === 'hourly' ? 1 : 24; // 1 hour or 24 hours

  for (let i = stepSize; i < priceHistory.length; i++) {
    const currentPrice = priceHistory[i].price;
    const previousPrice = priceHistory[i - stepSize].price;
    const change = currentPrice - previousPrice;
    changes.push(change);
  }

  return changes;
}

/**
 * Calculate standard deviation of a dataset
 *
 * @param values - Array of numbers
 * @returns Standard deviation
 */
function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;

  // Calculate mean
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

  // Calculate variance
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

  // Return standard deviation
  return Math.sqrt(variance);
}

/**
 * Calculate normalized volatility score (0-100)
 *
 * Higher score = more volatile
 *
 * @param hourlyStdDev - Standard deviation of hourly changes
 * @param dailyStdDev - Standard deviation of daily changes
 * @param maxHourlySwing - Maximum hourly price swing
 * @returns Score from 0 (stable) to 100 (extremely volatile)
 */
function calculateVolatilityScore(
  hourlyStdDev: number,
  dailyStdDev: number,
  maxHourlySwing: number
): number {
  // Normalize each component to 0-100 scale
  // Based on empirical observations of Polymarket markets:
  // - Stable markets: hourly std dev < 0.01 (1%)
  // - Moderate markets: hourly std dev 0.01-0.03 (1-3%)
  // - Volatile markets: hourly std dev > 0.03 (3%+)

  // Weight hourly std dev heavily (60%)
  const hourlyScore = Math.min(hourlyStdDev / 0.05, 1) * 60; // Cap at 5%

  // Daily std dev component (20%)
  const dailyScore = Math.min(dailyStdDev / 0.10, 1) * 20; // Cap at 10%

  // Max swing component (20%)
  const swingScore = Math.min(maxHourlySwing / 0.10, 1) * 20; // Cap at 10%

  const totalScore = hourlyScore + dailyScore + swingScore;

  // Ensure score is between 0-100
  return Math.min(Math.max(totalScore, 0), 100);
}

/**
 * Classify volatility level based on score
 *
 * @param volatilityScore - Score from 0-100
 * @returns Human-readable volatility level
 */
export function getVolatilityLevel(volatilityScore: number): string {
  if (volatilityScore < 20) return 'Very Stable';
  if (volatilityScore < 40) return 'Stable';
  if (volatilityScore < 60) return 'Moderate';
  if (volatilityScore < 80) return 'Volatile';
  return 'Extremely Volatile';
}

/**
 * Get recommended minimum spread based on volatility
 *
 * Higher volatility = wider spread to avoid fills
 *
 * @param volatilityScore - Score from 0-100
 * @returns Recommended minimum spread as ratio of max spread (0.25-0.80)
 */
export function getRecommendedMinSpread(volatilityScore: number): number {
  if (volatilityScore < 20) return 0.25; // Very stable: 25% of max spread
  if (volatilityScore < 40) return 0.35; // Stable: 35% (current default)
  if (volatilityScore < 60) return 0.45; // Moderate: 45%
  if (volatilityScore < 80) return 0.60; // Volatile: 60%
  return 0.80; // Extremely volatile: 80%
}
