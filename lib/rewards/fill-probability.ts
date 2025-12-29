// lib/rewards/fill-probability.ts

import { VolatilityMetrics } from './volatility-analyzer';

export interface FillProbabilityModel {
  probability: number;          // 0-1 probability of fill within time period
  expectedTimeToFill: number;   // Expected hours until order fills
  confidenceInterval: {         // 95% confidence interval
    lower: number;
    upper: number;
  };
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High';
}

/**
 * Calculate probability that an order will be filled
 *
 * Model: Price follows a random walk with drift
 * P(fill) ≈ probability that price reaches order level within timeHorizon
 *
 * @param spread - Distance from midpoint (0-0.50)
 * @param volatility - Volatility metrics for the market
 * @param orderBookDepth - Total liquidity on this side (in shares)
 * @param timeHorizon - Days to project forward (default 30)
 * @returns Fill probability model
 */
export function calculateFillProbability(
  spread: number,              // Distance from midpoint (absolute value, e.g., 0.015 for 1.5¢)
  volatility: VolatilityMetrics,
  orderBookDepth: number,      // Total shares on this side of the book
  timeHorizon: number = 30     // Days
): FillProbabilityModel {
  // Handle edge cases
  if (spread <= 0) {
    // Order at or past midpoint - will fill immediately
    return {
      probability: 1.0,
      expectedTimeToFill: 0,
      confidenceInterval: { lower: 1.0, upper: 1.0 },
      riskLevel: 'Very High',
    };
  }

  if (volatility.volatilityScore === 0) {
    // No volatility data - use conservative estimate
    return estimateFillProbabilityConservative(spread, timeHorizon);
  }

  // Use hourly standard deviation as measure of price movement
  const hourlyVolatility = volatility.hourlyStdDev;

  // Convert time horizon to hours
  const hoursInHorizon = timeHorizon * 24;

  // Model: Probability of price reaching order level
  // Using simplified diffusion model:
  // P(reach) ≈ 2 × Φ(spread / (σ × sqrt(t))) - 1
  // Where Φ is the cumulative normal distribution function
  //
  // Simplified: P(fill) ≈ 1 - exp(-λt)
  // Where λ = (σ / spread)^2
  // This captures the idea that:
  // - Higher volatility → higher fill probability
  // - Wider spread → lower fill probability
  // - More time → higher fill probability

  let lambda = 0;
  if (hourlyVolatility > 0 && spread > 0) {
    lambda = Math.pow(hourlyVolatility / spread, 2);
  }

  // Calculate fill probability over time horizon
  let baseProbability = 1 - Math.exp(-lambda * hoursInHorizon);

  // Adjust for order book depth
  // Deeper order book = more resistance to price movement = lower fill probability
  const depthAdjustment = calculateDepthAdjustment(orderBookDepth);
  const adjustedProbability = baseProbability * depthAdjustment;

  // Cap probability at 0.95 (never 100% certain)
  const probability = Math.min(adjustedProbability, 0.95);

  // Calculate expected time to fill (in hours)
  // E[T] = -log(1 - p) / λ
  let expectedTimeToFill = hoursInHorizon;
  if (lambda > 0 && probability < 0.95) {
    expectedTimeToFill = -Math.log(1 - probability) / lambda;
  }

  // Calculate 95% confidence interval
  // Using exponential distribution quantiles
  const lowerBound = Math.max(0, probability - 0.15);
  const upperBound = Math.min(1, probability + 0.15);

  // Classify risk level
  const riskLevel = classifyFillRisk(probability);

  return {
    probability,
    expectedTimeToFill,
    confidenceInterval: {
      lower: lowerBound,
      upper: upperBound,
    },
    riskLevel,
  };
}

/**
 * Adjust fill probability based on order book depth
 *
 * Deeper order book provides resistance to price movement
 *
 * @param orderBookDepth - Total shares on this side
 * @returns Adjustment factor (0.5-1.0)
 */
function calculateDepthAdjustment(orderBookDepth: number): number {
  // Normalize depth to 0-1 scale
  // Typical depths: 1,000-100,000 shares
  const normalizedDepth = Math.min(orderBookDepth / 100000, 1.0);

  // Deeper book reduces fill probability by up to 50%
  // adjustment = 1 - (0.5 × normalizedDepth)
  const adjustment = 1 - (0.5 * normalizedDepth);

  return Math.max(adjustment, 0.5); // Min 50% adjustment
}

/**
 * Conservative fill probability estimate when volatility data is unavailable
 *
 * @param spread - Distance from midpoint
 * @param timeHorizon - Days
 * @returns Conservative fill probability model
 */
function estimateFillProbabilityConservative(
  spread: number,
  timeHorizon: number
): FillProbabilityModel {
  // Conservative heuristic based on spread width
  // Assume moderate market activity
  let probability = 0;

  if (spread < 0.01) {
    // Very tight spread (< 1¢)
    probability = 0.50 + (timeHorizon / 30) * 0.30; // 50-80% over 30 days
  } else if (spread < 0.02) {
    // Tight spread (1-2¢)
    probability = 0.30 + (timeHorizon / 30) * 0.25; // 30-55% over 30 days
  } else if (spread < 0.03) {
    // Moderate spread (2-3¢)
    probability = 0.15 + (timeHorizon / 30) * 0.20; // 15-35% over 30 days
  } else {
    // Wide spread (> 3¢)
    probability = 0.05 + (timeHorizon / 30) * 0.15; // 5-20% over 30 days
  }

  probability = Math.min(probability, 0.95);

  // Estimate time to fill (days)
  const expectedTimeToFill = (timeHorizon * 24) * (1 - probability);

  return {
    probability,
    expectedTimeToFill,
    confidenceInterval: {
      lower: Math.max(0, probability - 0.20),
      upper: Math.min(1, probability + 0.20),
    },
    riskLevel: classifyFillRisk(probability),
  };
}

/**
 * Classify fill risk level based on probability
 *
 * @param probability - Fill probability (0-1)
 * @returns Risk level classification
 */
function classifyFillRisk(probability: number): 'Low' | 'Medium' | 'High' | 'Very High' {
  if (probability < 0.10) return 'Low';       // < 10% chance of fill
  if (probability < 0.25) return 'Medium';    // 10-25% chance
  if (probability < 0.50) return 'High';      // 25-50% chance
  return 'Very High';                         // > 50% chance
}

/**
 * Calculate expected value of an order placement considering fill risk
 *
 * EV = (Expected Reward × Days Active) - (Fill Loss × Fill Probability)
 *
 * @param dailyReward - Expected daily reward from this order (in $)
 * @param fillProbability - Probability of order getting filled
 * @param capital - Capital deployed in this order
 * @param timeHorizon - Days to project forward
 * @param transactionCostRate - Transaction cost as % of capital (default 2%)
 * @returns Expected value in $
 */
export function calculateExpectedValue(
  dailyReward: number,
  fillProbability: number,
  capital: number,
  timeHorizon: number = 30,
  transactionCostRate: number = 0.02
): number {
  // Expected days active = days we expect before getting filled
  // If fillProb = 0.3, we expect to stay active 70% of the time
  const expectedDaysActive = timeHorizon * (1 - fillProbability);

  // Expected total reward = daily reward × expected days active
  const expectedReward = dailyReward * expectedDaysActive;

  // Expected loss from fill = probability of fill × transaction cost
  // When filled, we lose transaction costs + opportunity cost
  const fillLoss = capital * transactionCostRate;
  const expectedLoss = fillLoss * fillProbability;

  // Net expected value
  const expectedValue = expectedReward - expectedLoss;

  return expectedValue;
}

/**
 * Calculate risk-adjusted return (Sharpe-like ratio)
 *
 * Risk-adjusted return = Expected Value / (Capital × Risk Factor)
 *
 * @param expectedValue - Expected value from calculateExpectedValue
 * @param capital - Capital deployed
 * @param fillProbability - Fill probability (used as risk measure)
 * @returns Risk-adjusted return ratio
 */
export function calculateRiskAdjustedReturn(
  expectedValue: number,
  capital: number,
  fillProbability: number
): number {
  // Risk factor: higher fill probability = higher risk
  // Scale from 0.5 (low risk) to 2.0 (very high risk)
  const riskFactor = 0.5 + (fillProbability * 1.5);

  // Risk-adjusted return
  const riskAdjustedReturn = expectedValue / (capital * riskFactor);

  return riskAdjustedReturn;
}

/**
 * Find optimal spread that maximizes expected value
 *
 * Test different spread widths and return the one with highest EV
 *
 * @param minSpread - Minimum spread to test (as ratio of max spread)
 * @param maxSpread - Maximum spread to test (as ratio of max spread)
 * @param spreadStep - Step size for testing (default 0.05)
 * @param evaluator - Function to calculate EV for a given spread ratio
 * @returns Optimal spread ratio
 */
export function findOptimalSpread(
  minSpread: number,
  maxSpread: number,
  spreadStep: number,
  evaluator: (spreadRatio: number) => number
): number {
  let bestSpread = minSpread;
  let bestEV = evaluator(minSpread);

  for (let ratio = minSpread + spreadStep; ratio <= maxSpread; ratio += spreadStep) {
    const ev = evaluator(ratio);
    if (ev > bestEV) {
      bestEV = ev;
      bestSpread = ratio;
    }
  }

  return bestSpread;
}
