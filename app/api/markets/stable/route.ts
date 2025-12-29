/**
 * API Route: Find Stable/Calm Markets
 * GET /api/markets/stable
 *
 * Analyzes markets to find ones that are less volatile and easier to place orders
 * Considers: volume, price stability, trading frequency, spread consistency
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const CLOB_API_URL = 'https://clob.polymarket.com';
const GAMMA_API_URL = 'https://gamma-api.polymarket.com';

interface MarketStability {
  id: string;
  question: string;
  rewardPool: number;
  midpoint: number;
  volume24h: number;
  liquidity: number;
  endDate: string;
  clobTokenIds: string[];    // Token IDs for order placement
  conditionId: string | null;
  // Actual values
  spread: number;            // Actual spread (e.g., 0.03 = 3%)
  // Stability metrics (scores 0-100)
  stabilityScore: number;    // 0-100, higher = more stable/calm
  volumeScore: number;       // Lower volume = higher score
  spreadScore: number;       // Wider spread = higher score (less competition)
  depthScore: number;        // Moderate depth = higher score
  rewardEfficiency: number;  // Reward per $1000 liquidity
  recommendation: string;
}

/**
 * Fetch orderbook and calculate spread/depth metrics
 */
async function getOrderBookMetrics(tokenId: string): Promise<{
  spread: number;
  bidDepth: number;
  askDepth: number;
  topBidSize: number;
  topAskSize: number;
}> {
  try {
    const response = await fetch(`${CLOB_API_URL}/book?token_id=${tokenId}`);
    if (!response.ok) {
      return { spread: 0.1, bidDepth: 0, askDepth: 0, topBidSize: 0, topAskSize: 0 };
    }

    const data = await response.json();
    const bids = data.bids || [];
    const asks = data.asks || [];

    if (bids.length === 0 || asks.length === 0) {
      return { spread: 0.1, bidDepth: 0, askDepth: 0, topBidSize: 0, topAskSize: 0 };
    }

    // API returns: bids sorted ascending (lowest first), asks sorted descending (highest first)
    // Best bid = highest bid = last in bids array
    // Best ask = lowest ask = last in asks array
    const bestBid = parseFloat(bids[bids.length - 1].price);
    const bestAsk = parseFloat(asks[asks.length - 1].price);
    const spread = Math.max(0, bestAsk - bestBid);

    console.log(`   Token ${tokenId.substring(0, 10)}... Best bid: ${bestBid}, Best ask: ${bestAsk}, Spread: ${(spread * 100).toFixed(2)}%`);

    // Calculate depth (total size within 5% of best price)
    const bidDepth = bids
      .filter((b: any) => parseFloat(b.price) >= bestBid * 0.95)
      .reduce((sum: number, b: any) => sum + parseFloat(b.size) * parseFloat(b.price), 0);

    const askDepth = asks
      .filter((a: any) => parseFloat(a.price) <= bestAsk * 1.05)
      .reduce((sum: number, a: any) => sum + parseFloat(a.size) * parseFloat(a.price), 0);

    const topBidSize = parseFloat(bids[bids.length - 1].size);
    const topAskSize = parseFloat(asks[asks.length - 1].size);

    return { spread, bidDepth, askDepth, topBidSize, topAskSize };
  } catch (error) {
    console.error('Error fetching orderbook:', error);
    return { spread: 0.1, bidDepth: 0, askDepth: 0, topBidSize: 0, topAskSize: 0 };
  }
}

/**
 * Calculate stability score for a market
 * Higher score = easier to place orders without quick fills or competition
 */
function calculateStabilityScore(
  volume24h: number,
  liquidity: number,
  spread: number,
  depth: number,
  rewardPool: number
): { stabilityScore: number; volumeScore: number; spreadScore: number; depthScore: number; rewardEfficiency: number } {
  // Volume score: Lower volume = more stable (less trading activity)
  // Scale: <$5k = 100, $50k = 70, $500k = 40, $5M+ = 10
  let volumeScore = 100;
  if (volume24h > 0) {
    volumeScore = Math.max(10, Math.min(100, 120 - Math.log10(volume24h) * 18));
  }

  // Spread score: Wider spread = less competition
  // Scale: 1% = 30, 3% = 60, 5% = 80, 8%+ = 100
  let spreadScore = 50;
  if (spread <= 0.01) {
    spreadScore = 30; // Very tight = highly competitive
  } else if (spread <= 0.03) {
    spreadScore = 30 + (spread - 0.01) * 1500; // 30-60
  } else if (spread <= 0.05) {
    spreadScore = 60 + (spread - 0.03) * 1000; // 60-80
  } else if (spread <= 0.08) {
    spreadScore = 80 + (spread - 0.05) * 666; // 80-100
  } else {
    spreadScore = 100; // Wide spread = little competition
  }

  // Depth score: Moderate depth is best
  // Too shallow = risky, too deep = lots of competition
  // Scale: $100-$1000 = 100, $1k-$10k = 80, $10k-$50k = 60, $50k+ = 40
  let depthScore = 50;
  if (depth < 100) {
    depthScore = Math.max(20, depth / 2); // Very shallow
  } else if (depth <= 1000) {
    depthScore = 100; // Ideal - some depth but not overcrowded
  } else if (depth <= 10000) {
    depthScore = 100 - (depth - 1000) / 150; // 80-100 range
  } else if (depth <= 50000) {
    depthScore = 60 - (depth - 10000) / 2000; // 40-60 range
  } else {
    depthScore = 40; // Very deep = competitive
  }

  // Reward efficiency: reward per $1000 liquidity
  // Higher = better opportunity
  const rewardEfficiency = liquidity > 0 ? (rewardPool / liquidity) * 1000 : 0;

  // Weighted average - spread and volume matter most for "calmness"
  const stabilityScore = Math.round(
    volumeScore * 0.35 +
    spreadScore * 0.35 +
    depthScore * 0.30
  );

  return {
    stabilityScore,
    volumeScore: Math.round(volumeScore),
    spreadScore: Math.round(spreadScore),
    depthScore: Math.round(depthScore),
    rewardEfficiency: Math.round(rewardEfficiency * 100) / 100,
  };
}

/**
 * Generate recommendation based on scores
 */
function getRecommendation(
  stabilityScore: number,
  rewardPool: number,
  volume24h: number
): string {
  if (stabilityScore >= 80 && rewardPool >= 50) {
    return 'Excellent - Low activity, good rewards, easy to place orders';
  } else if (stabilityScore >= 70 && rewardPool >= 30) {
    return 'Good - Moderate activity, decent rewards';
  } else if (stabilityScore >= 60) {
    return 'Fair - Some competition, monitor orderbook';
  } else if (volume24h > 50000) {
    return 'Active - High volume, orders may fill quickly';
  } else if (rewardPool < 20) {
    return 'Low reward - May not be worth the effort';
  } else {
    return 'Competitive - Tight spreads, experienced LPs present';
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const minReward = parseFloat(searchParams.get('minReward') || '20');
  const minStability = parseFloat(searchParams.get('minStability') || '50');

  try {
    // Get active markets with good reward pools
    const markets = await prisma.market.findMany({
      where: {
        active: true,
        rewardPool: { gte: minReward },
        endDate: { gt: new Date() },
      },
      orderBy: { rewardPool: 'desc' },
      take: 50, // Get more, then filter by stability
    });

    console.log(`📊 Analyzing ${markets.length} markets for stability...`);

    // Analyze each market
    const analyzedMarkets: MarketStability[] = [];

    for (const market of markets) {
      try {
        // Get first token ID for orderbook analysis
        const tokenIds = market.clobTokenIds ? JSON.parse(market.clobTokenIds) : [];
        if (tokenIds.length === 0) continue;

        const orderBookMetrics = await getOrderBookMetrics(tokenIds[0]);
        const totalDepth = orderBookMetrics.bidDepth + orderBookMetrics.askDepth;

        const scores = calculateStabilityScore(
          market.volume || 0,
          market.liquidity || 0,
          orderBookMetrics.spread,
          totalDepth,
          market.rewardPool
        );

        if (scores.stabilityScore >= minStability) {
          analyzedMarkets.push({
            id: market.id,
            question: market.question,
            rewardPool: market.rewardPool,
            midpoint: market.midpoint,
            volume24h: market.volume || 0,
            liquidity: market.liquidity || 0,
            endDate: market.endDate.toISOString(),
            clobTokenIds: tokenIds,
            conditionId: market.conditionId || null,
            spread: orderBookMetrics.spread || 0, // Actual spread value (0 if unavailable)
            ...scores,
            recommendation: getRecommendation(
              scores.stabilityScore,
              market.rewardPool,
              market.volume || 0
            ),
          });
        }
      } catch (error) {
        console.error(`Error analyzing market ${market.id}:`, error);
      }
    }

    // Sort by stability score (highest first), then by reward pool
    analyzedMarkets.sort((a, b) => {
      if (b.stabilityScore !== a.stabilityScore) {
        return b.stabilityScore - a.stabilityScore;
      }
      return b.rewardPool - a.rewardPool;
    });

    return NextResponse.json({
      markets: analyzedMarkets.slice(0, limit),
      total: analyzedMarkets.length,
      criteria: {
        minReward,
        minStability,
        analyzedCount: markets.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching stable markets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze markets' },
      { status: 500 }
    );
  }
}
