// app/api/user/pending-rewards/route.ts
// Calculate pending/accrued rewards that haven't been paid out yet

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/pending-rewards?walletAddress=0x...
 * Calculate estimated pending rewards based on position time and estimated daily rates
 *
 * Note: This is an ESTIMATE. Actual rewards depend on:
 * - Competition from other LPs (which changes constantly)
 * - Polymarket's payout schedule
 * - Market conditions
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

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

    console.log(`💰 Calculating pending rewards for wallet ${walletAddress}...`);

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: {
        positions: {
          where: {
            orderCount: {
              gt: 0, // Only active positions
            },
          },
          include: {
            market: {
              select: {
                id: true,
                question: true,
                active: true,
              },
            },
          },
        },
        payouts: {
          orderBy: {
            date: 'desc',
          },
          take: 1, // Get most recent payout
        },
      },
    });

    if (!user) {
      return NextResponse.json({
        pendingRewards: 0,
        positions: [],
        lastPayoutDate: null,
        message: 'No user found',
      });
    }

    // Get the most recent payout date, or use a default starting point
    const lastPayoutDate = user.payouts[0]?.date || null;
    const startDate = lastPayoutDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: 7 days ago

    console.log(`   Last payout: ${lastPayoutDate ? lastPayoutDate.toISOString() : 'None found'}`);
    console.log(`   Calculating from: ${startDate.toISOString()}`);

    // Fetch historical market share to make better estimates
    console.log(`\n   📊 Fetching historical market share...`);
    let marketShare = 0.5; // Default fallback
    let marketShareSource = 'default (50%)';

    try {
      const marketShareResponse = await fetch(
        `${request.url.split('/api/')[0]}/api/user/market-share?walletAddress=${walletAddress}`
      );
      if (marketShareResponse.ok) {
        const marketShareData = await marketShareResponse.json();
        if (marketShareData.marketShare !== null && marketShareData.calculationMethod === 'historical') {
          marketShare = marketShareData.marketShare;
          marketShareSource = `historical (${(marketShare * 100).toFixed(1)}% based on ${marketShareData.totalPayouts} payouts)`;
          console.log(`   ✅ Using historical market share: ${(marketShare * 100).toFixed(1)}%`);
        } else {
          console.log(`   ⚠️ No historical data, using default 50%`);
        }
      }
    } catch (error) {
      console.log(`   ⚠️ Could not fetch market share, using default 50%`);
    }

    const now = new Date();
    let totalPending = 0;
    const positionDetails: any[] = [];

    for (const position of user.positions) {
      // Only calculate for active markets
      if (!position.market.active) {
        continue;
      }

      // Use the later of: last payout date or position calculation date
      const positionStartDate = position.calculatedAt > startDate ? position.calculatedAt : startDate;

      // Calculate days elapsed since this position started earning
      const daysElapsed = (now.getTime() - positionStartDate.getTime()) / (1000 * 60 * 60 * 24);

      // Estimate pending rewards using historical market share
      const estimatedDailyEarnings = position.estimatedDaily * marketShare;
      const pendingForPosition = estimatedDailyEarnings * daysElapsed;

      console.log(`   Position ${position.market.question.substring(0, 40)}...`);
      console.log(`     Days elapsed: ${daysElapsed.toFixed(2)}`);
      console.log(`     Estimated daily: $${estimatedDailyEarnings.toFixed(2)}`);
      console.log(`     Pending: $${pendingForPosition.toFixed(2)}`);

      totalPending += pendingForPosition;

      positionDetails.push({
        marketId: position.marketId,
        question: position.market.question,
        daysElapsed: daysElapsed,
        estimatedDaily: estimatedDailyEarnings,
        pending: pendingForPosition,
        startDate: positionStartDate,
      });
    }

    console.log(`   ✅ Total pending rewards: $${totalPending.toFixed(2)}`);

    return NextResponse.json({
      pendingRewards: totalPending,
      positions: positionDetails,
      lastPayoutDate: lastPayoutDate,
      calculationStartDate: startDate,
      daysElapsed: (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      marketShare: marketShare,
      marketSharePercent: marketShare * 100,
      marketShareSource: marketShareSource,
      estimateNote: `Estimate based on ${marketShareSource}. Actual rewards depend on competition.`,
    });
  } catch (error) {
    console.error('Error calculating pending rewards:', error);
    return NextResponse.json(
      { error: 'Failed to calculate pending rewards' },
      { status: 500 }
    );
  }
}
