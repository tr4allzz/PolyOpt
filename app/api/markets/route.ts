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

    // Fetch markets and count in parallel for better performance
    // Filter out expired markets (endDate in the past)
    const whereClause = activeOnly
      ? {
          active: true,
          endDate: { gt: new Date() },
        }
      : undefined;

    const [markets, total] = await Promise.all([
      prisma.market.findMany({
        where: whereClause,
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
      }),
      prisma.market.count({
        where: whereClause,
      }),
    ]);

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
