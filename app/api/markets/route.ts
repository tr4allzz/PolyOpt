// app/api/markets/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/markets
 * Get all active markets with rewards
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const activeOnly = searchParams.get('active') !== 'false';

    // Fetch from database
    const markets = await prisma.market.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { rewardPool: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        question: true,
        maxSpread: true,
        minSize: true,
        rewardPool: true,
        midpoint: true,
        volume: true,
        liquidity: true,
        endDate: true,
        active: true,
        updatedAt: true,
      },
    });

    const total = await prisma.market.count({
      where: activeOnly ? { active: true } : undefined,
    });

    return NextResponse.json({
      markets,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching markets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}
