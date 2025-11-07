// app/api/user/payouts/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/payouts?walletAddress=0x...
 * Get user's reward payout history
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress parameter is required' },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json({
        payouts: [],
        summary: {
          totalPaid: 0,
          payoutCount: 0,
          lastPayoutDate: null,
          avgDailyPayout: 0,
        },
      });
    }

    // Fetch payouts
    const payouts = await prisma.payout.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
    });

    const totalPayouts = await prisma.payout.count({
      where: { userId: user.id },
    });

    // Calculate summary
    const totalPaid = payouts.reduce((sum, p) => sum + p.amount, 0);
    const lastPayout = payouts[0];

    // Calculate average daily payout (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPayouts = await prisma.payout.findMany({
      where: {
        userId: user.id,
        date: { gte: thirtyDaysAgo },
      },
    });

    const recentTotal = recentPayouts.reduce((sum, p) => sum + p.amount, 0);
    const avgDailyPayout = recentPayouts.length > 0
      ? recentTotal / Math.max(recentPayouts.length, 1)
      : 0;

    return NextResponse.json({
      payouts,
      summary: {
        totalPaid,
        payoutCount: totalPayouts,
        lastPayoutDate: lastPayout?.date || null,
        avgDailyPayout,
      },
      pagination: {
        limit,
        offset,
        total: totalPayouts,
      },
    });
  } catch (error) {
    console.error('Error fetching user payouts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payouts' },
      { status: 500 }
    );
  }
}
