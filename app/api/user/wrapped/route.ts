// app/api/user/wrapped/route.ts
// Yearly "LP Wrapped" stats - like Spotify Wrapped for LP rewards

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboardData } from '@/lib/leaderboard-cache';
import { prisma } from '@/lib/prisma';

const DATA_API_URL = 'https://data-api.polymarket.com';

interface WrappedStats {
  year: number;
  totalEarned: number;
  rewardCount: number;
  activeDays: number;
  bestDay: {
    date: string;
    earned: number;
  } | null;
  rank: number | null;
  totalLPs: number;
  percentile: number | null;
  streakDays: number;
  avgPerDay: number;
  avgPerReward: number;
}

/**
 * GET /api/user/wrapped?walletAddress=0x...&year=2024
 * Get yearly wrapped stats for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress parameter is required' },
        { status: 400 }
      );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Get user's funder/proxy address if they have one
    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      select: { funderAddress: true },
    });

    // Use funderAddress (proxy wallet) if available, otherwise use login wallet
    const rewardsWallet = user?.funderAddress || walletAddress.toLowerCase();

    console.log(`🎁 Generating wrapped stats for ${walletAddress} (${year})...`);
    console.log(`💰 Fetching rewards for wallet: ${rewardsWallet}`);

    // Fetch all rewards from Polymarket Data API
    const url = new URL(`${DATA_API_URL}/activity`);
    url.searchParams.append('user', rewardsWallet);
    url.searchParams.append('type', 'REWARD');
    url.searchParams.append('limit', '1000');
    url.searchParams.append('sortBy', 'TIMESTAMP');
    url.searchParams.append('sortDirection', 'DESC');

    console.log(`📡 Fetching rewards from: ${url.toString()}`);
    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error(`Data API error: ${response.status}`);
      const errorText = await response.text();
      console.error(`Error body: ${errorText}`);
      return NextResponse.json(
        { error: 'Failed to fetch rewards data' },
        { status: response.status }
      );
    }

    const rewards = await response.json();
    console.log(`📊 Raw rewards response (first 2):`, JSON.stringify(rewards?.slice?.(0, 2) || rewards, null, 2));

    // Filter rewards for the specified year
    const yearStart = new Date(year, 0, 1).getTime();
    const yearEnd = new Date(year + 1, 0, 1).getTime();

    console.log(`📅 Filtering for year ${year}: ${new Date(yearStart).toISOString()} to ${new Date(yearEnd).toISOString()}`);
    console.log(`📦 Total rewards received: ${Array.isArray(rewards) ? rewards.length : 'not an array'}`);

    const yearRewards = Array.isArray(rewards)
      ? rewards.filter((r: any) => {
          // timestamp is in seconds, convert to ms
          const timestampMs = (r.timestamp || 0) * 1000;
          return timestampMs >= yearStart && timestampMs < yearEnd;
        })
      : [];

    console.log(`📆 Rewards in ${year}: ${yearRewards.length}`);

    // Calculate stats
    let totalEarned = 0;
    const rewardsByDay = new Map<string, number>();

    for (const reward of yearRewards) {
      // Use usdcSize or size for the amount
      const amount = parseFloat(reward.usdcSize || reward.size || 0);
      totalEarned += amount;

      // Track by day - timestamp is in seconds
      const date = new Date(reward.timestamp * 1000).toISOString().split('T')[0];
      rewardsByDay.set(date, (rewardsByDay.get(date) || 0) + amount);
    }

    // Find best day
    let bestDay: { date: string; earned: number } | null = null;
    for (const [date, earned] of rewardsByDay.entries()) {
      if (!bestDay || earned > bestDay.earned) {
        bestDay = { date, earned };
      }
    }

    // Calculate streak (consecutive days with rewards)
    const sortedDays = Array.from(rewardsByDay.keys()).sort();
    let maxStreak = 0;
    let currentStreak = 1;

    for (let i = 1; i < sortedDays.length; i++) {
      const prevDate = new Date(sortedDays[i - 1]);
      const currDate = new Date(sortedDays[i]);
      const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    maxStreak = Math.max(maxStreak, currentStreak);

    // Get rank from leaderboard (check both login wallet and proxy wallet)
    const leaderboard = getLeaderboardData();
    const userEntry = leaderboard.find(
      (e) => e.walletAddress.toLowerCase() === walletAddress.toLowerCase() ||
             e.walletAddress.toLowerCase() === rewardsWallet.toLowerCase()
    );
    const rank = userEntry?.rank || null;
    const totalLPs = leaderboard.length;
    const percentile = rank && totalLPs > 0 ? Math.round((1 - rank / totalLPs) * 100) : null;

    // Calculate active days count
    const activeDays = rewardsByDay.size;
    const avgPerDay = activeDays > 0
      ? Math.round((totalEarned / activeDays) * 100) / 100
      : 0;

    const stats: WrappedStats = {
      year,
      totalEarned: Math.round(totalEarned * 100) / 100,
      rewardCount: yearRewards.length,
      activeDays,
      bestDay: bestDay ? {
        date: bestDay.date,
        earned: Math.round(bestDay.earned * 100) / 100,
      } : null,
      rank,
      totalLPs,
      percentile,
      streakDays: maxStreak,
      avgPerDay,
      avgPerReward: yearRewards.length > 0
        ? Math.round((totalEarned / yearRewards.length) * 100) / 100
        : 0,
    };

    console.log(`✅ Wrapped stats generated: $${stats.totalEarned} earned, rank #${rank || 'N/A'}`);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error generating wrapped stats:', error);
    return NextResponse.json(
      { error: 'Failed to generate wrapped stats', details: String(error) },
      { status: 500 }
    );
  }
}
