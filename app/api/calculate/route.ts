// app/api/calculate/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { calculateQScore, calculateExpectedReward } from '@/lib/rewards/calculator';
import { fetchUserOrders, fetchAllMarketOrders } from '@/lib/polymarket/client';

const CalculateSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  marketId: z.string(),
  capital: z.number().positive().optional(),
});

/**
 * POST /api/calculate
 * Calculate Q-score and expected rewards for a user
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, marketId, capital } = CalculateSchema.parse(body);

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

    // Fetch user's orders from Polymarket
    const userOrders = await fetchUserOrders(walletAddress, marketId);

    if (userOrders.length === 0) {
      return NextResponse.json({
        qScore: { qOne: 0, qTwo: 0, qMin: 0 },
        expectedReward: {
          userShare: 0,
          dailyReward: 0,
          monthlyReward: 0,
          annualizedAPY: 0,
        },
        orderCount: 0,
        message: 'No qualifying orders found',
      });
    }

    // Calculate user's Q-score
    const userQScore = calculateQScore(userOrders, {
      id: market.id,
      question: market.question,
      midpoint: market.midpoint,
      maxSpread: market.maxSpread,
      minSize: market.minSize,
      rewardPool: market.rewardPool,
    });

    // Fetch all orders in market for competition analysis
    const allOrders = await fetchAllMarketOrders(marketId);
    const totalQMin = allOrders.length > 0
      ? calculateQScore(allOrders, {
          id: market.id,
          question: market.question,
          midpoint: market.midpoint,
          maxSpread: market.maxSpread,
          minSize: market.minSize,
          rewardPool: market.rewardPool,
        }).qMin
      : userQScore.qMin; // If no competition data, assume user is only LP

    // Calculate expected reward
    const expectedReward = calculateExpectedReward(
      userQScore.qMin,
      totalQMin,
      market.rewardPool,
      capital
    );

    // Save position to database
    const user = await prisma.user.upsert({
      where: { walletAddress },
      create: { walletAddress },
      update: {},
    });

    await prisma.position.upsert({
      where: {
        userId_marketId: {
          userId: user.id,
          marketId: market.id,
        },
      },
      create: {
        userId: user.id,
        marketId: market.id,
        qOne: userQScore.qOne,
        qTwo: userQScore.qTwo,
        qMin: userQScore.qMin,
        estimatedDaily: expectedReward.dailyReward,
        userShare: expectedReward.userShare,
        competitionQMin: totalQMin - userQScore.qMin,
        capitalDeployed: capital || 0,
        orderCount: userOrders.length,
      },
      update: {
        qOne: userQScore.qOne,
        qTwo: userQScore.qTwo,
        qMin: userQScore.qMin,
        estimatedDaily: expectedReward.dailyReward,
        userShare: expectedReward.userShare,
        competitionQMin: totalQMin - userQScore.qMin,
        capitalDeployed: capital || 0,
        orderCount: userOrders.length,
        calculatedAt: new Date(),
      },
    });

    return NextResponse.json({
      qScore: userQScore,
      expectedReward,
      orderCount: userOrders.length,
      competition: {
        totalQMin,
        userQMin: userQScore.qMin,
        competitionQMin: totalQMin - userQScore.qMin,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error calculating rewards:', error);
    return NextResponse.json(
      { error: 'Failed to calculate rewards' },
      { status: 500 }
    );
  }
}
