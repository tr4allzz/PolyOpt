// app/api/user/rewards/route.ts
// Fetch actual rewards earned from Polymarket Data API
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const DATA_API_URL = 'https://data-api.polymarket.com';

const RewardsQuerySchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  limit: z.number().int().min(1).max(500).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
});

/**
 * GET /api/user/rewards?walletAddress=0x...
 * Fetch actual rewards earned by a user from Polymarket
 */
export async function GET(request: NextRequest) {
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

    const validated = RewardsQuerySchema.parse({ walletAddress, limit, offset });

    console.log(`💰 Fetching actual rewards for ${validated.walletAddress}...`);

    // Fetch rewards from Polymarket Data API
    const url = new URL(`${DATA_API_URL}/activity`);
    url.searchParams.append('user', validated.walletAddress);
    url.searchParams.append('type', 'REWARD');
    url.searchParams.append('limit', validated.limit.toString());
    url.searchParams.append('offset', validated.offset.toString());
    url.searchParams.append('sortBy', 'TIMESTAMP');
    url.searchParams.append('sortDirection', 'DESC');

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error(`Data API error: ${response.status}`);
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Failed to fetch rewards', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data.length || 0} reward records`);

    // Calculate total rewards earned
    let totalEarned = 0;
    const rewardsByMarket = new Map<string, number>();

    if (Array.isArray(data)) {
      for (const reward of data) {
        const amount = parseFloat(reward.cash_amount || 0);
        totalEarned += amount;

        // Group by market
        const market = reward.market || 'unknown';
        rewardsByMarket.set(market, (rewardsByMarket.get(market) || 0) + amount);
      }
    }

    console.log(`💵 Total rewards earned: $${totalEarned.toFixed(2)}`);

    return NextResponse.json({
      rewards: data,
      summary: {
        totalEarned,
        totalRewards: Array.isArray(data) ? data.length : 0,
        rewardsByMarket: Object.fromEntries(rewardsByMarket),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error fetching rewards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rewards', details: String(error) },
      { status: 500 }
    );
  }
}
