// app/api/optimize/route.ts

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { optimizeOrderPlacement, optimizeAdvanced } from '@/lib/rewards/optimizer';
import { fetchAllMarketOrders } from '@/lib/polymarket/client';
import { calculateQScore } from '@/lib/rewards/calculator';

const OptimizeSchema = z.object({
  capital: z.number().positive(),
  marketId: z.string(),
  strategy: z.enum(['balanced', 'advanced']).optional().default('balanced'),
});

/**
 * POST /api/optimize
 * Calculate optimal order placement for a given capital amount
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { capital, marketId, strategy } = OptimizeSchema.parse(body);

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

    const optimalPlacement = strategy === 'advanced'
      ? optimizeAdvanced(capital, marketData, currentCompetitionQMin)
      : optimizeOrderPlacement(capital, marketData, currentCompetitionQMin);

    // Calculate expected metrics
    const expectedAPY = optimalPlacement.expectedDailyReward * 365 / capital;
    const expectedMonthly = optimalPlacement.expectedDailyReward * 30;

    return NextResponse.json({
      market: {
        id: market.id,
        question: market.question,
        midpoint: market.midpoint,
        rewardPool: market.rewardPool,
      },
      capital,
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
    });
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
