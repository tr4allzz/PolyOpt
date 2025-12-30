// app/api/optimize/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { optimizeOrderPlacement, optimizeAdvanced, optimizeOrderPlacementDynamic } from '@/lib/rewards/optimizer';
import { fetchAllMarketOrders } from '@/lib/polymarket/client';
import { calculateQScore } from '@/lib/rewards/calculator';

const OptimizeSchema = z.object({
  capital: z.number().positive(),
  marketId: z.string(),
  strategy: z.enum(['balanced', 'advanced', 'dynamic']).optional().default('dynamic'), // NEW: Default to dynamic!
  timeHorizon: z.number().int().positive().optional().default(30), // Days to optimize for
  riskTolerance: z.enum(['low', 'medium', 'high']).optional().default('medium'),
});

/**
 * POST /api/optimize
 * Calculate optimal order placement for a given capital amount
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { capital, marketId, strategy, timeHorizon, riskTolerance } = OptimizeSchema.parse(body);

    // Fetch market
    const market = await prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!market) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    // Fetch all orders in market for competition analysis
    const allOrders = await fetchAllMarketOrders(marketId);
    const currentCompetitionQMin = allOrders.length > 0
      ? calculateQScore(allOrders, {
          id: market.id,
          question: market.question,
          midpoint: market.midpoint,
          maxSpread: market.maxSpread,
          minSize: market.minSize,
          rewardPool: market.rewardPool,
        }).qMin
      : 0;

    // Calculate optimal placement
    const marketData = {
      id: market.id,
      question: market.question,
      midpoint: market.midpoint,
      maxSpread: market.maxSpread,
      minSize: market.minSize,
      rewardPool: market.rewardPool,
    };

    let optimalPlacement: any;
    let isDynamic = false;

    if (strategy === 'dynamic') {
      // NEW: Use dynamic optimization with volatility & fill risk analysis
      isDynamic = true;

      // Set spread range based on risk tolerance
      const spreadRanges = {
        low: { minSpreadRatio: 0.40, maxSpreadRatio: 0.80 },    // Conservative: wide spreads
        medium: { minSpreadRatio: 0.25, maxSpreadRatio: 0.70 }, // Balanced
        high: { minSpreadRatio: 0.20, maxSpreadRatio: 0.50 },   // Aggressive: tight spreads
      };

      const conditionId = market.conditionId || market.id;
      optimalPlacement = await optimizeOrderPlacementDynamic(
        capital,
        marketData,
        conditionId,
        currentCompetitionQMin,
        {
          timeHorizon,
          ...spreadRanges[riskTolerance],
        }
      );
    } else if (strategy === 'advanced') {
      optimalPlacement = optimizeAdvanced(capital, marketData, currentCompetitionQMin);
    } else {
      optimalPlacement = optimizeOrderPlacement(capital, marketData, currentCompetitionQMin);
    }

    // Calculate expected metrics
    const expectedAPY = optimalPlacement.expectedDailyReward * 365 / capital;
    const expectedMonthly = optimalPlacement.expectedDailyReward * 30;

    // Build response
    const response: any = {
      market: {
        id: market.id,
        question: market.question,
        midpoint: market.midpoint,
        rewardPool: market.rewardPool,
      },
      capital,
      strategy,
      optimalPlacement,
      metrics: {
        expectedDailyReward: optimalPlacement.expectedDailyReward,
        expectedMonthlyReward: expectedMonthly,
        expectedAPY: expectedAPY,
        capitalEfficiency: optimalPlacement.capitalEfficiency,
      },
      competition: {
        currentQMin: currentCompetitionQMin,
        afterEntry: currentCompetitionQMin + optimalPlacement.expectedQScore.qMin,
      },
      recommendation: {
        buyOrder: {
          price: optimalPlacement.buyOrder.price.toFixed(3),
          size: Math.floor(optimalPlacement.buyOrder.size),
          cost: (optimalPlacement.buyOrder.price * optimalPlacement.buyOrder.size).toFixed(2),
        },
        sellOrder: {
          price: optimalPlacement.sellOrder.price.toFixed(3),
          size: Math.floor(optimalPlacement.sellOrder.size),
          cost: (optimalPlacement.sellOrder.price * optimalPlacement.sellOrder.size).toFixed(2),
        },
      },
    };

    // Add dynamic-specific metrics if using dynamic strategy
    if (isDynamic) {
      response.riskMetrics = {
        fillProbability: optimalPlacement.fillProbability,
        fillRiskLevel: optimalPlacement.fillProbability < 0.10 ? 'Low'
          : optimalPlacement.fillProbability < 0.25 ? 'Medium'
          : optimalPlacement.fillProbability < 0.50 ? 'High' : 'Very High',
        volatilityScore: optimalPlacement.volatilityScore,
        volatilityLevel: optimalPlacement.volatilityScore < 20 ? 'Very Stable'
          : optimalPlacement.volatilityScore < 40 ? 'Stable'
          : optimalPlacement.volatilityScore < 60 ? 'Moderate'
          : optimalPlacement.volatilityScore < 80 ? 'Volatile' : 'Extremely Volatile',
        expectedValue: optimalPlacement.expectedValue,
        riskAdjustedReturn: optimalPlacement.riskAdjustedReturn,
        optimalSpreadRatio: optimalPlacement.optimalSpreadRatio,
      };

      // Add warnings based on risk
      const warnings = [];
      if (optimalPlacement.fillProbability > 0.40) {
        warnings.push('HIGH FILL RISK: Consider wider spread or different market');
      } else if (optimalPlacement.fillProbability > 0.25) {
        warnings.push('Moderate fill risk: Monitor market closely');
      }
      if (optimalPlacement.volatilityScore > 70) {
        warnings.push('High volatility market: Wider spreads recommended');
      }
      if (warnings.length > 0) {
        response.warnings = warnings;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error optimizing placement:', error);
    return NextResponse.json(
      { error: 'Failed to optimize placement' },
      { status: 500 }
    );
  }
}
