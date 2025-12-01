// lib/rewards/calculator.ts

import { Order, Market, QScore, RewardEstimate } from '@/types/rewards';
import { SCALING_FACTOR } from '@/lib/constants';

/**
 * Equation 1: S(v,s) = ((v-s)/v)^2 * b
 * Calculate score for a single order
 *
 * @param maxSpread - Maximum qualifying spread (v)
 * @param orderSpread - Actual spread of this order (s)
 * @param orderSize - Number of shares
 * @param boost - Multiplier (b), default 1.0
 * @returns Order score
 */
export function calculateOrderScore(
  maxSpread: number,
  orderSpread: number,
  orderSize: number,
  boost: number = 1.0
): number {
  // Orders outside max spread don't qualify
  if (orderSpread > maxSpread) {
    return 0;
  }

  // S(v,s) = ((v-s)/v)^2 * b
  const spreadRatio = (maxSpread - orderSpread) / maxSpread;
  const spreadScore = Math.pow(spreadRatio, 2) * boost;

  return spreadScore * orderSize;
}

/**
 * Calculate spread from midpoint for an order
 * For YES orders: spread from YES midpoint
 * For NO orders: spread from NO midpoint (1 - YES midpoint)
 */
export function calculateSpread(
  orderPrice: number,
  midpoint: number,
  side?: 'YES' | 'NO'
): number {
  // For NO orders, the midpoint is 1 - YES_midpoint
  const effectiveMidpoint = side === 'NO' ? (1 - midpoint) : midpoint;
  return Math.abs(orderPrice - effectiveMidpoint);
}

/**
 * Equation 2: Calculate Q_one
 * Q_one = sum of (YES bids + NO asks)
 *
 * @param orders - All user orders
 * @param market - Market configuration
 * @returns Q_one score
 */
export function calculateQOne(
  orders: Order[],
  market: Market
): number {
  let score = 0;

  for (const order of orders) {
    // Skip orders below minimum size
    if (order.size < market.minSize) {
      continue;
    }

    const spread = calculateSpread(order.price, market.midpoint, order.side);

    // Only count YES bids and NO asks
    if (
      (order.side === 'YES' && order.type === 'BID') ||
      (order.side === 'NO' && order.type === 'ASK')
    ) {
      score += calculateOrderScore(
        market.maxSpread,
        spread,
        order.size
      );
    }
  }

  return score;
}

/**
 * Equation 3: Calculate Q_two
 * Q_two = sum of (YES asks + NO bids)
 *
 * @param orders - All user orders
 * @param market - Market configuration
 * @returns Q_two score
 */
export function calculateQTwo(
  orders: Order[],
  market: Market
): number {
  let score = 0;

  for (const order of orders) {
    // Skip orders below minimum size
    if (order.size < market.minSize) {
      continue;
    }

    const spread = calculateSpread(order.price, market.midpoint, order.side);

    // Only count YES asks and NO bids
    if (
      (order.side === 'YES' && order.type === 'ASK') ||
      (order.side === 'NO' && order.type === 'BID')
    ) {
      score += calculateOrderScore(
        market.maxSpread,
        spread,
        order.size
      );
    }
  }

  return score;
}

/**
 * Equation 4: Calculate Q_min
 * Handles single-sided vs two-sided liquidity
 *
 * @param qOne - First side score
 * @param qTwo - Second side score
 * @param midpoint - Current market midpoint
 * @param c - Scaling factor (default 3.0 from docs)
 * @returns Q_min score
 */
export function calculateQMin(
  qOne: number,
  qTwo: number,
  midpoint: number,
  c: number = SCALING_FACTOR
): number {
  // Equation 4a: If midpoint in [0.10, 0.90]
  // Allow single-sided with penalty
  if (midpoint >= 0.10 && midpoint <= 0.90) {
    const minScore = Math.min(qOne, qTwo);
    const maxSingleSided = Math.max(qOne / c, qTwo / c);
    return Math.max(minScore, maxSingleSided);
  }

  // Equation 4b: If midpoint < 0.10 or > 0.90
  // Require two-sided liquidity
  return Math.min(qOne, qTwo);
}

/**
 * Calculate complete Q-score for a user
 *
 * @param orders - User's orders
 * @param market - Market configuration
 * @returns Complete Q-score breakdown
 */
export function calculateQScore(
  orders: Order[],
  market: Market
): QScore {
  const qOne = calculateQOne(orders, market);
  const qTwo = calculateQTwo(orders, market);
  const qMin = calculateQMin(qOne, qTwo, market.midpoint);

  return { qOne, qTwo, qMin };
}

/**
 * Equations 5-7: Calculate expected daily reward
 *
 * @param userQMin - User's Q_min score
 * @param totalQMin - Sum of all LPs' Q_min in the market
 * @param rewardPool - Daily reward pool amount
 * @param capitalDeployed - Optional: user's capital for APY calculation
 * @returns Reward estimate
 */
export function calculateExpectedReward(
  userQMin: number,
  totalQMin: number,
  rewardPool: number,
  capitalDeployed?: number
): RewardEstimate {
  if (totalQMin === 0 || userQMin === 0) {
    return {
      userShare: 0,
      dailyReward: 0,
      monthlyReward: 0,
      annualizedAPY: 0,
    };
  }

  // Equation 5: Q_normal = Q_min / sum(Q_min)
  const userShare = userQMin / totalQMin;

  // Equation 7: Final reward = share * pool
  const dailyReward = userShare * rewardPool;
  const monthlyReward = dailyReward * 30;

  // Calculate APY if capital provided
  let annualizedAPY: number | undefined;
  if (capitalDeployed && capitalDeployed > 0) {
    const yearlyReward = dailyReward * 365;
    annualizedAPY = yearlyReward / capitalDeployed;
  }

  return {
    userShare,
    dailyReward,
    monthlyReward,
    annualizedAPY,
  };
}

/**
 * Calculate total competition Q_min from order book
 * This analyzes all orders in the market to determine total Q_min
 *
 * @param allOrders - All orders in the market
 * @param market - Market configuration
 * @returns Total Q_min of all LPs
 */
export function calculateTotalCompetitionQMin(
  allOrders: Order[],
  market: Market
): number {
  // In real implementation, group orders by LP address
  // For now, calculate total score
  const score = calculateQScore(allOrders, market);
  return score.qMin;
}

/**
 * Validate calculation against known payout
 * Used for testing accuracy
 */
export function validateCalculation(
  calculatedReward: number,
  actualPayout: number,
  tolerance: number = 0.01 // 1% tolerance
): {
  isValid: boolean;
  error: number;
  errorPercent: number;
} {
  const error = Math.abs(calculatedReward - actualPayout);
  const errorPercent = actualPayout > 0 ? error / actualPayout : 0;

  return {
    isValid: errorPercent <= tolerance,
    error,
    errorPercent,
  };
}
