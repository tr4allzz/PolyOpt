// lib/rewards/market-analyzer.ts
// Analyze markets to find best opportunities for small capital

import { prisma } from '@/lib/prisma';
import { fetchAllMarketOrders } from '@/lib/polymarket/client';
import { calculateQScore } from './calculator';

export interface MarketOpportunity {
  marketId: string;
  question: string;
  rewardPool: number;
  estimatedCompetition: number; // Total Q_min from all LPs
  estimatedDailyReward: number; // For given capital
  capitalEfficiency: number; // Daily reward / capital
  roi: number; // Annualized ROI %
  competitionLevel: 'Low' | 'Medium' | 'High';
  recommendedCapital: number; // Minimum to be competitive
}

/**
 * Analyze markets to find best opportunities for given capital
 */
export async function analyzeBestMarketsForCapital(
  capital: number,
  limit: number = 10,
  useRealCompetition: boolean = false // Set to true for accurate but slower analysis
): Promise<MarketOpportunity[]> {
  // Fetch all markets
  const markets = await prisma.market.findMany({
    where: { active: true },
    select: {
      id: true,
      question: true,
      rewardPool: true,
      maxSpread: true,
      minSize: true,
      midpoint: true,
      volume: true,
      liquidity: true,
    },
    orderBy: { rewardPool: 'desc' },
  });

  console.log(`📊 Analyzing ${markets.length} markets for $${capital} capital...`);

  const opportunities: MarketOpportunity[] = [];

  for (const market of markets) {
    try {
      // Try to get REAL competition from CLOB API if requested
      let estimatedCompetition: number;

      if (useRealCompetition) {
        const realCompetition = await getRealCompetition(market.id);
        estimatedCompetition = realCompetition ?? estimateMarketCompetition(
          market.liquidity,
          market.volume,
          market.rewardPool
        );
      } else {
        // Use fast estimation
        estimatedCompetition = estimateMarketCompetition(
          market.liquidity,
          market.volume,
          market.rewardPool
        );
      }

      // Simulate optimal placement with given capital
      const optimalQScore = simulateOptimalPlacement(
        capital,
        market.maxSpread,
        market.midpoint
      );

      // Calculate expected reward
      const totalQMin = estimatedCompetition + optimalQScore;
      const userShare = optimalQScore / totalQMin;
      const estimatedDailyReward = userShare * market.rewardPool;
      const capitalEfficiency = estimatedDailyReward / capital;
      const roi = (capitalEfficiency * 365) * 100; // Annualized %

      // Categorize competition level
      let competitionLevel: 'Low' | 'Medium' | 'High';
      if (estimatedCompetition < 50) competitionLevel = 'Low';
      else if (estimatedCompetition < 200) competitionLevel = 'Medium';
      else competitionLevel = 'High';

      // Recommended minimum capital to be competitive (get at least 1% of rewards)
      // Based on: minSize for both sides + buffer for spread
      const minCapitalForOrders = market.minSize * market.midpoint * 2.2; // Both sides + 10% buffer
      const recommendedCapital = Math.max(
        minCapitalForOrders,
        estimatedCompetition * 0.05 // Need ~5% of competition to get meaningful share
      );

      // Only include markets where user has enough capital
      if (capital >= recommendedCapital * 0.8) { // Allow 20% flexibility
        opportunities.push({
          marketId: market.id,
          question: market.question,
          rewardPool: market.rewardPool,
          estimatedCompetition,
          estimatedDailyReward,
          capitalEfficiency,
          roi,
          competitionLevel,
          recommendedCapital,
        });
      }
    } catch (error) {
      console.error(`Error analyzing market ${market.id}:`, error);
    }
  }

  // Sort by capital efficiency (best ROI first)
  opportunities.sort((a, b) => b.capitalEfficiency - a.capitalEfficiency);

  // Return top N opportunities
  return opportunities.slice(0, limit);
}

/**
 * Get REAL competition from CLOB API order book
 */
async function getRealCompetition(marketId: string): Promise<number | null> {
  try {
    // Fetch actual orders from CLOB API
    const allOrders = await fetchAllMarketOrders(marketId);

    if (allOrders.length === 0) {
      return null; // No real data available
    }

    // Get market details for Q-score calculation
    const market = await prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!market) return null;

    // Calculate total Q_min from all orders
    const totalQScore = calculateQScore(allOrders, {
      id: market.id,
      question: market.question,
      midpoint: market.midpoint,
      maxSpread: market.maxSpread,
      minSize: market.minSize,
      rewardPool: market.rewardPool,
    });

    return totalQScore.qMin;
  } catch (error) {
    console.error(`Error fetching real competition for ${marketId}:`, error);
    return null;
  }
}

/**
 * Estimate total competition in a market using liquidity and volume
 * Used as fallback when real data isn't available
 */
function estimateMarketCompetition(
  liquidity: number,
  volume: number,
  rewardPool: number
): number {
  // Liquidity is the best proxy for LP activity
  // More liquidity = more LPs competing for rewards

  // Base competition on liquidity (normalized)
  const liquidityFactor = Math.min(liquidity / 100000, 10); // 0-10 scale

  // Volume indicates market activity (more traders = more LP opportunity)
  const volumeFactor = Math.min(volume / 1000000, 5); // 0-5 scale

  // Reward pool attracts LPs (higher rewards = more competition)
  const rewardFactor = Math.min(rewardPool / 100, 5); // 0-5 scale

  // Combine factors to estimate Q_min competition
  // Average LP might have Q_min of 20-50
  const avgLPScore = 35;
  const estimatedLPs = liquidityFactor + volumeFactor + rewardFactor;

  return estimatedLPs * avgLPScore;
}

/**
 * Simulate optimal Q-score for given capital
 */
function simulateOptimalPlacement(
  capital: number,
  maxSpread: number,
  midpoint: number
): number {
  // Split capital 50/50 for two-sided liquidity
  const halfCapital = capital / 2;

  // Calculate order sizes
  const buySize = halfCapital / (midpoint - maxSpread / 100);
  const sellSize = halfCapital / (midpoint + maxSpread / 100);

  // Optimal spread is close to max (conservative estimate)
  const optimalSpread = maxSpread * 0.8;

  // Calculate spread score for each side
  const spreadRatio = (maxSpread - optimalSpread) / maxSpread;
  const spreadScore = Math.pow(spreadRatio, 2);

  // Q scores
  const qOne = spreadScore * buySize;
  const qTwo = spreadScore * sellSize;

  // Q_min (two-sided, so no penalty in normal range)
  if (midpoint >= 0.10 && midpoint <= 0.90) {
    return Math.min(qOne, qTwo);
  }

  return Math.min(qOne, qTwo);
}

/**
 * Get detailed analysis for a specific market
 */
export async function analyzeMarketOpportunity(
  marketId: string,
  capital: number
): Promise<MarketOpportunity | null> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
  });

  if (!market) return null;

  const estimatedCompetition = estimateMarketCompetition(
    market.liquidity,
    market.volume,
    market.rewardPool
  );

  const optimalQScore = simulateOptimalPlacement(
    capital,
    market.maxSpread,
    market.midpoint
  );

  const totalQMin = estimatedCompetition + optimalQScore;
  const userShare = optimalQScore / totalQMin;
  const estimatedDailyReward = userShare * market.rewardPool;
  const capitalEfficiency = estimatedDailyReward / capital;
  const roi = (capitalEfficiency * 365) * 100;

  let competitionLevel: 'Low' | 'Medium' | 'High';
  if (estimatedCompetition < 50) competitionLevel = 'Low';
  else if (estimatedCompetition < 200) competitionLevel = 'Medium';
  else competitionLevel = 'High';

  const recommendedCapital = Math.max(
    market.minSize * market.midpoint * 2,
    (estimatedCompetition * 0.01) * capital
  );

  return {
    marketId: market.id,
    question: market.question,
    rewardPool: market.rewardPool,
    estimatedCompetition,
    estimatedDailyReward,
    capitalEfficiency,
    roi,
    competitionLevel,
    recommendedCapital,
  };
}

export interface OrderPlacementSuggestion {
  side: 'buy' | 'sell';
  price: number;
  size: number;
  capitalRequired: number;
  expectedQScore: number;
  reasoning: string;
}

export interface PlacementStrategy {
  totalCapital: number;
  suggestions: OrderPlacementSuggestion[];
  expectedTotalQScore: number;
  expectedDailyReward: number;
  estimatedROI: number;
  tips: string[];
}

/**
 * Generate optimal order placement suggestions for a market
 */
export async function generateOrderPlacementSuggestions(
  marketId: string,
  capital: number
): Promise<PlacementStrategy | null> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
  });

  if (!market) return null;

  // Get competition estimate
  const estimatedCompetition = estimateMarketCompetition(
    market.liquidity,
    market.volume,
    market.rewardPool
  );

  // Calculate optimal spread (aim for ~80% of max spread for best Q-score)
  const optimalSpreadPercent = market.maxSpread * 0.8;

  // Split capital 50/50 for two-sided liquidity
  const capitalPerSide = capital / 2;

  // Calculate optimal prices
  const buyPrice = market.midpoint - (optimalSpreadPercent / 100);
  const sellPrice = market.midpoint + (optimalSpreadPercent / 100);

  // Calculate sizes based on capital
  const buySize = capitalPerSide / buyPrice;
  const sellSize = capitalPerSide / sellPrice;

  // Ensure sizes meet minimum requirements
  const adjustedBuySize = Math.max(buySize, market.minSize);
  const adjustedSellSize = Math.max(sellSize, market.minSize);

  // Calculate actual capital needed with adjusted sizes
  const buyCapital = adjustedBuySize * buyPrice;
  const sellCapital = adjustedSellSize * sellPrice;

  // Calculate Q-scores for each order
  const spreadRatio = (market.maxSpread - optimalSpreadPercent) / market.maxSpread;
  const spreadScore = Math.pow(spreadRatio, 2);

  const buyQScore = spreadScore * adjustedBuySize;
  const sellQScore = spreadScore * adjustedSellSize;
  const qMin = Math.min(buyQScore, sellQScore);

  // Calculate expected rewards
  const totalQMin = estimatedCompetition + qMin;
  const userShare = qMin / totalQMin;
  const expectedDailyReward = userShare * market.rewardPool;
  const estimatedROI = ((expectedDailyReward * 365) / capital) * 100;

  const suggestions: OrderPlacementSuggestion[] = [
    {
      side: 'buy',
      price: buyPrice,
      size: adjustedBuySize,
      capitalRequired: buyCapital,
      expectedQScore: buyQScore,
      reasoning: `Place buy order at ${(buyPrice * 100).toFixed(2)}¢ (${optimalSpreadPercent.toFixed(1)}% below midpoint) with size ${adjustedBuySize.toFixed(0)} shares`,
    },
    {
      side: 'sell',
      price: sellPrice,
      size: adjustedSellSize,
      capitalRequired: sellCapital,
      expectedQScore: sellQScore,
      reasoning: `Place sell order at ${(sellPrice * 100).toFixed(2)}¢ (${optimalSpreadPercent.toFixed(1)}% above midpoint) with size ${adjustedSellSize.toFixed(0)} shares`,
    },
  ];

  const tips: string[] = [
    `Keep your spread at ~${optimalSpreadPercent.toFixed(1)}% for optimal Q-score`,
    `Maintain two-sided liquidity (both buy and sell orders) to avoid penalties`,
    `Your Q_min will be ${qMin.toFixed(2)}, competing against estimated ${estimatedCompetition.toFixed(0)} total Q_min`,
    market.midpoint < 0.10 || market.midpoint > 0.90
      ? `⚠️ Market is near edges (${(market.midpoint * 100).toFixed(0)}¢) - consider if you can maintain two-sided orders`
      : `✓ Market midpoint at ${(market.midpoint * 100).toFixed(0)}¢ is good for two-sided liquidity`,
  ];

  // Add capital adjustment tip if needed
  if (buyCapital + sellCapital > capital) {
    tips.unshift(
      `⚠️ Recommended total capital: $${(buyCapital + sellCapital).toFixed(2)} (you have $${capital})`
    );
  }

  return {
    totalCapital: capital,
    suggestions,
    expectedTotalQScore: qMin,
    expectedDailyReward,
    estimatedROI,
    tips,
  };
}
