// lib/rewards/dynamic-spread-optimizer.ts

import { Market, Order, QScore } from '@/types/rewards';
import { calculateQScore, calculateExpectedReward } from './calculator';
import {
  calculateVolatility,
  VolatilityMetrics,
  getRecommendedMinSpread,
  getVolatilityLevel,
} from './volatility-analyzer';
import {
  calculateFillProbability,
  calculateExpectedValue,
  calculateRiskAdjustedReturn,
  FillProbabilityModel,
} from './fill-probability';

export interface OptimalSpreadResult {
  optimalSpread: number;        // Optimal distance from midpoint (absolute value, e.g., 0.015)
  optimalSpreadRatio: number;   // Optimal ratio of max spread (e.g., 0.35)
  expectedValue: number;        // Expected profit over time horizon
  fillProbability: number;      // Probability of getting filled
  expectedDailyReward: number;  // Daily reward at this spread
  riskAdjustedReturn: number;   // EV / (capital × risk)
  volatilityMetrics: VolatilityMetrics;
  fillRiskModel: FillProbabilityModel;
  recommendedOrders: Order[];   // Optimal orders to place
}

export interface SpreadOptimizationOptions {
  timeHorizon?: number;         // Days to optimize for (default 30)
  minSpreadRatio?: number;      // Minimum spread ratio to test (default 0.25)
  maxSpreadRatio?: number;      // Maximum spread ratio to test (default 0.80)
  spreadStep?: number;          // Step size for testing spreads (default 0.05)
  transactionCostRate?: number; // Transaction cost % (default 0.02 = 2%)
  orderBookDepth?: number;      // Order book depth in shares (default 50000)
}

/**
 * Optimize spread dynamically based on volatility and fill risk
 *
 * This is the main function that ties together:
 * 1. Volatility analysis
 * 2. Fill probability calculation
 * 3. Expected value optimization
 *
 * @param market - Market configuration
 * @param capital - Total capital to deploy
 * @param conditionId - Market condition ID for price history
 * @param currentCompetition - Current total Q_min from competition
 * @param options - Optimization parameters
 * @returns Optimal spread and placement recommendations
 */
export async function optimizeSpread(
  market: Market,
  capital: number,
  conditionId: string,
  currentCompetition: number,
  options: SpreadOptimizationOptions = {}
): Promise<OptimalSpreadResult> {
  // Set default options
  const {
    timeHorizon = 30,
    minSpreadRatio = 0.25,
    maxSpreadRatio = 0.80,
    spreadStep = 0.05,
    transactionCostRate = 0.02,
    orderBookDepth = 50000,
  } = options;

  // Step 1: Calculate market volatility
  const volatilityMetrics = await calculateVolatility(conditionId, 7);

  // Step 2: Determine safe minimum spread based on volatility
  const recommendedMinSpread = getRecommendedMinSpread(volatilityMetrics.volatilityScore);
  const effectiveMinSpread = Math.max(minSpreadRatio, recommendedMinSpread);

  // Step 3: Test different spread ratios to find optimal
  let bestResult: OptimalSpreadResult | null = null;
  let bestEV = -Infinity;

  for (
    let spreadRatio = effectiveMinSpread;
    spreadRatio <= maxSpreadRatio;
    spreadRatio += spreadStep
  ) {
    // Calculate spread from midpoint
    const spread = market.maxSpread * spreadRatio;

    // Calculate orders at this spread
    const orders = calculateOrders(capital, market, spread);

    // Calculate Q-score
    const qScore = calculateQScore(orders, market);

    // Calculate daily reward
    const totalQMin = currentCompetition + qScore.qMin;
    const { dailyReward } = calculateExpectedReward(
      qScore.qMin,
      totalQMin,
      market.rewardPool
    );

    // Calculate fill probability for this spread
    const fillModel = calculateFillProbability(
      spread,
      volatilityMetrics,
      orderBookDepth,
      timeHorizon
    );

    // Calculate expected value
    const expectedValue = calculateExpectedValue(
      dailyReward,
      fillModel.probability,
      capital,
      timeHorizon,
      transactionCostRate
    );

    // Calculate risk-adjusted return
    const riskAdjustedReturn = calculateRiskAdjustedReturn(
      expectedValue,
      capital,
      fillModel.probability
    );

    // Track best result
    if (expectedValue > bestEV) {
      bestEV = expectedValue;
      bestResult = {
        optimalSpread: spread,
        optimalSpreadRatio: spreadRatio,
        expectedValue,
        fillProbability: fillModel.probability,
        expectedDailyReward: dailyReward,
        riskAdjustedReturn,
        volatilityMetrics,
        fillRiskModel: fillModel,
        recommendedOrders: orders,
      };
    }
  }

  // Fallback if no result found (shouldn't happen)
  if (!bestResult) {
    const defaultSpread = market.maxSpread * 0.35;
    const defaultOrders = calculateOrders(capital, market, defaultSpread);
    const defaultQScore = calculateQScore(defaultOrders, market);
    const { dailyReward } = calculateExpectedReward(
      defaultQScore.qMin,
      currentCompetition + defaultQScore.qMin,
      market.rewardPool
    );

    bestResult = {
      optimalSpread: defaultSpread,
      optimalSpreadRatio: 0.35,
      expectedValue: dailyReward * timeHorizon,
      fillProbability: 0.20,
      expectedDailyReward: dailyReward,
      riskAdjustedReturn: dailyReward / capital,
      volatilityMetrics,
      fillRiskModel: calculateFillProbability(
        defaultSpread,
        volatilityMetrics,
        orderBookDepth,
        timeHorizon
      ),
      recommendedOrders: defaultOrders,
    };
  }

  return bestResult;
}

/**
 * Calculate optimal orders given capital, market, and spread
 *
 * @param capital - Total capital to deploy
 * @param market - Market configuration
 * @param spread - Spread from midpoint (absolute value)
 * @returns Array of orders
 */
function calculateOrders(capital: number, market: Market, spread: number): Order[] {
  // Split capital 50/50 for two-sided liquidity
  const capitalPerSide = capital / 2;

  // Calculate order prices
  const buyYesPrice = market.midpoint - spread;
  const buyNoPrice = 1 - (market.midpoint + spread); // NO price is inverse of YES sell price

  // Ensure prices are valid (between 0 and 1)
  const validBuyYesPrice = Math.max(0.01, Math.min(0.99, buyYesPrice));
  const validBuyNoPrice = Math.max(0.01, Math.min(0.99, buyNoPrice));

  // Calculate order sizes
  const buyYesSize = capitalPerSide / validBuyYesPrice;
  const buyNoSize = capitalPerSide / validBuyNoPrice;

  return [
    { price: validBuyYesPrice, size: buyYesSize, side: 'YES', type: 'BID' },
    { price: validBuyNoPrice, size: buyNoSize, side: 'NO', type: 'BID' },
  ];
}

/**
 * Quick spread recommendation without full optimization
 *
 * Useful when you just need a quick estimate
 *
 * @param volatilityScore - Volatility score (0-100)
 * @returns Recommended spread ratio
 */
export function quickSpreadRecommendation(volatilityScore: number): number {
  return getRecommendedMinSpread(volatilityScore);
}

/**
 * Format optimization result for display
 *
 * @param result - Optimization result
 * @returns Human-readable summary
 */
export function formatOptimizationResult(result: OptimalSpreadResult): string {
  const volatilityLevel = getVolatilityLevel(result.volatilityMetrics.volatilityScore);

  return `
Optimal Spread Optimization Result
===================================

Market Volatility: ${volatilityLevel} (Score: ${result.volatilityMetrics.volatilityScore.toFixed(1)}/100)
- Hourly Std Dev: ${(result.volatilityMetrics.hourlyStdDev * 100).toFixed(2)}%
- Max Hourly Swing: ${(result.volatilityMetrics.maxHourlySwing * 100).toFixed(2)}%

Optimal Spread: ${(result.optimalSpread * 100).toFixed(2)}¢ (${(result.optimalSpreadRatio * 100).toFixed(0)}% of max spread)

Fill Risk Assessment:
- Fill Probability: ${(result.fillProbability * 100).toFixed(1)}%
- Risk Level: ${result.fillRiskModel.riskLevel}
- Expected Time to Fill: ${(result.fillRiskModel.expectedTimeToFill / 24).toFixed(1)} days

Expected Returns:
- Daily Reward: $${result.expectedDailyReward.toFixed(2)}
- Expected Value (30d): $${result.expectedValue.toFixed(2)}
- Risk-Adjusted Return: ${(result.riskAdjustedReturn * 100).toFixed(2)}%

Recommended Orders:
${result.recommendedOrders.map((order, i) =>
  `  ${i + 1}. ${order.side} ${order.type} @ $${order.price.toFixed(4)} × ${order.size.toFixed(0)} shares`
).join('\n')}
  `.trim();
}

/**
 * Compare multiple markets with dynamic spread optimization
 *
 * @param capital - Capital per market
 * @param markets - Array of markets with their metadata
 * @param options - Optimization options
 * @returns Sorted array of optimized results
 */
export async function compareMarketsWithDynamicSpread(
  capital: number,
  markets: Array<{
    market: Market;
    conditionId: string;
    currentCompetition: number;
  }>,
  options: SpreadOptimizationOptions = {}
): Promise<Array<OptimalSpreadResult & { market: Market }>> {
  // Optimize each market
  const results = await Promise.all(
    markets.map(async ({ market, conditionId, currentCompetition }) => {
      const optimized = await optimizeSpread(
        market,
        capital,
        conditionId,
        currentCompetition,
        options
      );
      return { ...optimized, market };
    })
  );

  // Sort by risk-adjusted return (descending)
  return results.sort((a, b) => b.riskAdjustedReturn - a.riskAdjustedReturn);
}
