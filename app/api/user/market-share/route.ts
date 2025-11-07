// app/api/user/market-share/route.ts
// Calculate user's historical market share based on actual payouts vs potential

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/market-share?walletAddress=0x...
 * Calculate historical market share by comparing actual payouts to theoretical maximum
 *
 * This gives us a realistic estimate of the user's competitive position
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

    console.log(`📊 Calculating historical market share for ${walletAddress}...`);

    // Find user with payouts and current positions
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: {
        payouts: {
          orderBy: {
            date: 'asc',
          },
        },
        positions: {
          where: {
            orderCount: {
              gt: 0,
            },
          },
          include: {
            market: true,
          },
        },
      },
    });

    if (!user || user.payouts.length === 0) {
      console.log('   No payouts found, cannot calculate market share');
      return NextResponse.json({
        marketShare: null,
        totalPayouts: 0,
        message: 'No historical payouts found. Market share will be estimated at 50%.',
        useDefaultEstimate: true,
      });
    }

    console.log(`   Found ${user.payouts.length} historical payouts`);
    console.log(`   Found ${user.positions.length} current positions`);

    // Calculate total rewards received
    const totalReceived = user.payouts.reduce((sum, payout) => sum + payout.amount, 0);

    // Estimate what the theoretical maximum would have been
    // We'll look at the time period covered by payouts and estimate daily potential
    const firstPayout = user.payouts[0].date;
    const lastPayout = user.payouts[user.payouts.length - 1].date;
    const daysCovered = (lastPayout.getTime() - firstPayout.getTime()) / (1000 * 60 * 60 * 24);

    console.log(`   Payout period: ${firstPayout.toISOString()} to ${lastPayout.toISOString()}`);
    console.log(`   Days covered: ${daysCovered.toFixed(1)}`);
    console.log(`   Total received: $${totalReceived.toFixed(2)}`);

    // For current positions, calculate average daily potential
    // Note: This is imperfect because we don't have historical position data
    const currentDailyPotential = user.positions.reduce(
      (sum, pos) => sum + pos.estimatedDaily,
      0
    );

    console.log(`   Current daily potential (100% share): $${currentDailyPotential.toFixed(2)}`);

    let marketShare = 0.5; // Default 50%
    let calculationMethod = 'default';

    if (daysCovered > 0 && currentDailyPotential > 0) {
      // Calculate theoretical maximum over the payout period
      const theoreticalMaximum = currentDailyPotential * daysCovered;

      // Market share = actual received / theoretical maximum
      marketShare = totalReceived / theoreticalMaximum;

      // Cap at 100% (in case positions changed)
      if (marketShare > 1) {
        console.log(`   ⚠️ Market share > 100% (${(marketShare * 100).toFixed(1)}%), capping at 100%`);
        console.log(`   This suggests positions changed or rewards increased`);
        marketShare = 1;
      }

      // Floor at 1% (sanity check)
      if (marketShare < 0.01) {
        console.log(`   ⚠️ Market share < 1% (${(marketShare * 100).toFixed(2)}%), using 10% default`);
        marketShare = 0.1;
      }

      calculationMethod = 'historical';
      console.log(`   ✅ Calculated market share: ${(marketShare * 100).toFixed(1)}%`);
    } else {
      console.log(`   ⚠️ Insufficient data, using default 50% estimate`);
    }

    // Calculate average daily earnings
    const avgDailyEarnings = daysCovered > 0 ? totalReceived / daysCovered : 0;

    return NextResponse.json({
      marketShare,
      marketSharePercent: marketShare * 100,
      calculationMethod,
      totalPayouts: user.payouts.length,
      totalReceived,
      daysCovered,
      avgDailyEarnings,
      firstPayoutDate: firstPayout,
      lastPayoutDate: lastPayout,
      currentDailyPotential,
      useDefaultEstimate: calculationMethod === 'default',
      note: calculationMethod === 'historical'
        ? `Based on ${user.payouts.length} historical payouts over ${daysCovered.toFixed(0)} days`
        : 'Using default 50% estimate due to insufficient data',
    });
  } catch (error) {
    console.error('Error calculating market share:', error);
    return NextResponse.json(
      { error: 'Failed to calculate market share' },
      { status: 500 }
    );
  }
}
