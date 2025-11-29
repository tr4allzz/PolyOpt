// app/api/user/positions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { withErrorHandler } from '@/lib/errors/handler';

/**
 * GET /api/user/positions
 * Get user's positions and Q-scores from database
 * Requires authentication - wallet signature verification
 *
 * Note: Positions are created when you calculate Q-scores on individual market pages.
 * Visit market pages and use the calculator to see your positions here.
 */
export const GET = requireAuth(async (request: NextRequest, auth) => {
  // Use the verified wallet address from authentication
  const walletAddress = auth.walletAddress;

  console.log(`📊 Fetching positions for authenticated wallet ${walletAddress}...`);

  // Find user in database
  const user = await prisma.user.findUnique({
    where: { walletAddress },
    include: {
      positions: {
        where: {
          orderCount: {
            gt: 0, // Only positions with orders
          },
        },
        include: {
          market: {
            select: {
              id: true,
              question: true,
              midpoint: true,
              rewardPool: true,
              endDate: true,
              active: true,
            },
          },
        },
        orderBy: {
          estimatedDaily: 'desc',
        },
      },
    },
  });

  if (!user || user.positions.length === 0) {
    console.log(`No positions found for wallet ${walletAddress}`);
    return NextResponse.json({
      positions: [],
      summary: {
        totalMarkets: 0,
        totalDailyReward: 0,
        totalCapitalDeployed: 0,
      },
    });
  }

  // Calculate summary statistics
  const totalDailyReward = user.positions.reduce(
    (sum, pos) => sum + pos.estimatedDaily,
    0
  );
  const totalCapitalDeployed = user.positions.reduce(
    (sum, pos) => sum + pos.capitalDeployed,
    0
  );

  console.log(`✅ Found ${user.positions.length} positions`);

  return NextResponse.json({
    positions: user.positions,
    summary: {
      totalMarkets: user.positions.length,
      totalDailyReward,
      totalCapitalDeployed,
    },
  });
});
