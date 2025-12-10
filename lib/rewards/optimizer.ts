// lib/rewards/optimizer.ts

import {
  calculateQScore,
  calculateExpectedReward
} from './calculator';
import { Market, Order, OptimalPlacement } from '@/types/rewards';

/**
 * Calculate optimal order placement to maximize Q_min
 *
 * Strategy:
 * 1. Q_min = min(Q_one, Q_two), so want balanced sides
 * 2. Place orders close to midpoint for higher scores
 * 3. But not TOO close (avoid adverse selection)
 *
 * @param capital - Total capital to deploy
 * @param market - Market configuration
 * @param currentCompetitionQMin - Total Q_min of other LPs
 * @returns Optimal order placement
 */
export function optimizeOrderPlacement(
  capital: number,
  market: Market,
  currentCompetitionQMin: number
): OptimalPlacement {
  // Optimal spread: 30-40% of max spread
  // This balances score (closer = better) vs risk (too close = adverse selection)
  const optimalSpreadRatio = 0.35;
  const spreadFromMid = market.maxSpread * optimalSpreadRatio;

  const buyPrice = market.midpoint - spreadFromMid;
  const sellPrice = market.midpoint + spreadFromMid;

  // Split capital to balance Q_one ≈ Q_two
  // Since spread is same on both sides, equal $ gives balanced Q-scores
  const capitalPerSide = capital / 2;

  // For two-sided liquidity on Polymarket:
  // - Buy YES at price below midpoint (e.g., 48¢ when midpoint is 50¢)
  // - Buy NO at price = 1 - sellPrice (e.g., if sellPrice is 52¢, buy NO at 48¢)
  const buyYesPrice = buyPrice;
  const buyNoPrice = 1 - sellPrice; // NO price is inverse of YES price

  const buyYesSize = capitalPerSide / buyYesPrice;
  const buyNoSize = capitalPerSide / buyNoPrice;

  // Calculate expected scores
  const orders: Order[] = [
    { price: buyYesPrice, size: buyYesSize, side: 'YES', type: 'BID' },
    { price: buyNoPrice, size: buyNoSize, side: 'NO', type: 'BID' },
  ];

  const expectedQScore = calculateQScore(orders, market);

  // Calculate expected reward
  const totalQMin = currentCompetitionQMin + expectedQScore.qMin;
  const { dailyReward } = calculateExpectedReward(
    expectedQScore.qMin,
    totalQMin,
    market.rewardPool
  );

  return {
    buyOrder: { price: buyYesPrice, size: buyYesSize },      // Buy YES order
    sellOrder: { price: buyNoPrice, size: buyNoSize },       // Buy NO order (provides sell-side liquidity)
    expectedQScore,
    expectedDailyReward: dailyReward,
    capitalEfficiency: dailyReward / capital,
  };
}

/**
 * Advanced optimizer that tests multiple strategies
 * and returns the best one
 */
export function optimizeAdvanced(
  capital: number,
  market: Market,
  currentCompetitionQMin: number
): OptimalPlacement {
  const strategies = [
    0.25, // Aggressive (closer to midpoint)
    0.35, // Balanced (recommended)
    0.50, // Conservative (further from midpoint)
  ];

  let bestPlacement: OptimalPlacement | null = null;
  let bestExpectedReward = 0;

  for (const spreadRatio of strategies) {
    const spreadFromMid = market.maxSpread * spreadRatio;
    const buyYesPrice = market.midpoint - spreadFromMid;
    const sellYesPrice = market.midpoint + spreadFromMid;
    const buyNoPrice = 1 - sellYesPrice; // NO price is inverse

    const capitalPerSide = capital / 2;
    const buyYesSize = capitalPerSide / buyYesPrice;
    const buyNoSize = capitalPerSide / buyNoPrice;

    const orders: Order[] = [
      { price: buyYesPrice, size: buyYesSize, side: 'YES', type: 'BID' },
      { price: buyNoPrice, size: buyNoSize, side: 'NO', type: 'BID' },
    ];

    const expectedQScore = calculateQScore(orders, market);
    const totalQMin = currentCompetitionQMin + expectedQScore.qMin;
    const { dailyReward } = calculateExpectedReward(
      expectedQScore.qMin,
      totalQMin,
      market.rewardPool
    );

    if (dailyReward > bestExpectedReward) {
      bestExpectedReward = dailyReward;
      bestPlacement = {
        buyOrder: { price: buyYesPrice, size: buyYesSize },
        sellOrder: { price: buyNoPrice, size: buyNoSize },
        expectedQScore,
        expectedDailyReward: dailyReward,
        capitalEfficiency: dailyReward / capital,
      };
    }
  }

  return bestPlacement!;
}

/**
 * Compare multiple markets and recommend best one for given capital
 */
export function compareMarkets(
  capital: number,
  markets: Array<{ market: Market; competitionQMin: number }>
): Array<{
  market: Market;
  placement: OptimalPlacement;
  roi: number;
}> {
  const results = markets.map(({ market, competitionQMin }) => {
    const placement = optimizeOrderPlacement(capital, market, competitionQMin);
    const roi = placement.expectedDailyReward / capital;

    return {
      market,
      placement,
      roi,
    };
  });

  // Sort by ROI (descending)
  return results.sort((a, b) => b.roi - a.roi);
}

/**
 * Calculate optimal capital allocation across multiple markets
 */
export function allocateCapital(
  totalCapital: number,
  markets: Array<{ market: Market; competitionQMin: number }>,
  maxMarketsToUse: number = 3
): Array<{
  market: Market;
  allocation: number;
  placement: OptimalPlacement;
}> {
  // Get best markets by ROI
  const rankedMarkets = compareMarkets(totalCapital, markets);
  const selectedMarkets = rankedMarkets.slice(0, maxMarketsToUse);

  // Simple strategy: allocate proportionally to expected ROI
  const totalRoi = selectedMarkets.reduce((sum, m) => sum + m.roi, 0);

  return selectedMarkets.map(({ market, placement, roi }) => {
    const allocationPercent = roi / totalRoi;
    const allocation = totalCapital * allocationPercent;

    // Recalculate placement with allocated capital
    const newPlacement = optimizeOrderPlacement(
      allocation,
      market,
      placement.expectedQScore.qMin
    );

    return {
      market,
      allocation,
      placement: newPlacement,
    };
  });
}
