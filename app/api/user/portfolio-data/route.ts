// app/api/user/portfolio-data/route.ts
// Combined endpoint for portfolio page data

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { decryptCredentials } from '@/lib/crypto/encryption';

const DATA_API_URL = 'https://data-api.polymarket.com';
const CLOB_API_URL = 'https://clob.polymarket.com';

/**
 * GET /api/user/portfolio-data
 * Fetches all portfolio data in one request:
 * - Rewards from Polymarket Data API
 * - Active positions from Polymarket Data API
 * - Open orders (if API credentials exist)
 * - Positions from our database
 * - Credentials status
 */
export const GET = requireAuth(async (request: NextRequest, auth) => {
  const walletAddress = auth.walletAddress;
  console.log(`📊 Fetching portfolio data for ${walletAddress}...`);

  // Run all fetches in parallel
  const [
    rewardsResult,
    activePositionsResult,
    dbUserResult,
  ] = await Promise.allSettled([
    fetchRewards(walletAddress),
    fetchActivePositions(walletAddress),
    fetchDbUser(walletAddress),
  ]);

  // Extract results (handle rejected promises)
  const rewards = rewardsResult.status === 'fulfilled' ? rewardsResult.value : { rewards: [], summary: { totalEarned: 0, totalRewards: 0 } };
  const activePositions = activePositionsResult.status === 'fulfilled' ? activePositionsResult.value : { positions: [], summary: { totalPositions: 0, totalValue: 0, totalPnl: 0 } };
  const dbUser = dbUserResult.status === 'fulfilled' ? dbUserResult.value : null;

  // Check if user has API credentials
  const hasCredentials = !!(dbUser?.apiKey);

  // Fetch open orders if user has credentials
  let openOrders: { orders: any[]; summary: { totalOrders: number } } = { orders: [], summary: { totalOrders: 0 } };
  if (hasCredentials && dbUser) {
    try {
      openOrders = await fetchOpenOrders(walletAddress, dbUser);
    } catch (error) {
      console.error('Error fetching open orders:', error);
    }
  }

  // Get positions from database
  const positions = dbUser?.positions?.length ? {
    positions: dbUser.positions,
    summary: {
      totalMarkets: dbUser.positions.length,
      totalDailyReward: dbUser.positions.reduce((sum: number, pos: any) => sum + (pos.estimatedDaily || 0), 0),
      totalCapitalDeployed: dbUser.positions.reduce((sum: number, pos: any) => sum + (pos.capitalDeployed || 0), 0),
    },
  } : { positions: [], summary: { totalMarkets: 0, totalDailyReward: 0, totalCapitalDeployed: 0 } };

  console.log(`✅ Portfolio data loaded for ${walletAddress}`);

  return NextResponse.json({
    rewards,
    activePositions,
    openOrders,
    positions,
    hasCredentials,
  });
});

/**
 * Fetch rewards from Polymarket Data API
 */
async function fetchRewards(walletAddress: string) {
  try {
    const url = new URL(`${DATA_API_URL}/activity`);
    url.searchParams.append('user', walletAddress);
    url.searchParams.append('type', 'REWARD');
    url.searchParams.append('limit', '100');
    url.searchParams.append('sortBy', 'TIMESTAMP');
    url.searchParams.append('sortDirection', 'DESC');

    const response = await fetch(url.toString(), {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      console.error('Failed to fetch rewards:', response.status);
      return { rewards: [], summary: { totalEarned: 0, totalRewards: 0 } };
    }

    const data = await response.json();

    let totalEarned = 0;
    if (Array.isArray(data)) {
      for (const reward of data) {
        totalEarned += parseFloat(reward.cash_amount || reward.usdcSize || 0);
      }
    }

    return {
      rewards: data || [],
      summary: {
        totalEarned,
        totalRewards: Array.isArray(data) ? data.length : 0,
      },
    };
  } catch (error) {
    console.error('Error fetching rewards:', error);
    return { rewards: [], summary: { totalEarned: 0, totalRewards: 0 } };
  }
}

/**
 * Fetch active positions from Polymarket Data API
 */
async function fetchActivePositions(walletAddress: string) {
  try {
    const url = new URL(`${DATA_API_URL}/positions`);
    url.searchParams.append('user', walletAddress);
    url.searchParams.append('sizeThreshold', '0.1');
    url.searchParams.append('limit', '100');

    const response = await fetch(url.toString(), {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('Failed to fetch positions:', response.status);
      return { positions: [], summary: { totalPositions: 0, totalValue: 0, totalPnl: 0 } };
    }

    const data = await response.json();

    // Process positions
    const positions = Array.isArray(data) ? data.map((pos: any) => ({
      asset: pos.asset,
      title: pos.title || pos.market?.question || 'Unknown Market',
      outcome: pos.outcome,
      size: parseFloat(pos.size || 0),
      avgPrice: parseFloat(pos.avgPrice || 0),
      currentPrice: parseFloat(pos.curPrice || pos.price || 0),
      currentValue: parseFloat(pos.size || 0) * parseFloat(pos.curPrice || pos.price || 0),
      initialValue: parseFloat(pos.size || 0) * parseFloat(pos.avgPrice || 0),
      cashPnl: parseFloat(pos.cashPnl || 0),
      percentPnl: parseFloat(pos.percentPnl || 0),
    })) : [];

    const totalValue = positions.reduce((sum: number, pos: any) => sum + pos.currentValue, 0);
    const totalPnl = positions.reduce((sum: number, pos: any) => sum + pos.cashPnl, 0);

    return {
      positions,
      summary: {
        totalPositions: positions.length,
        totalValue,
        totalPnl,
      },
    };
  } catch (error) {
    console.error('Error fetching active positions:', error);
    return { positions: [], summary: { totalPositions: 0, totalValue: 0, totalPnl: 0 } };
  }
}

/**
 * Fetch user from database with positions
 */
async function fetchDbUser(walletAddress: string) {
  try {
    return await prisma.user.findUnique({
      where: { walletAddress },
      include: {
        positions: {
          where: { orderCount: { gt: 0 } },
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
          orderBy: { estimatedDaily: 'desc' },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching user from database:', error);
    return null;
  }
}

/**
 * Fetch open orders from Polymarket CLOB API
 */
async function fetchOpenOrders(walletAddress: string, user: any) {
  try {
    if (!user.apiKey || !user.apiSecret || !user.apiPassphrase) {
      return { orders: [], summary: { totalOrders: 0 } };
    }

    // Decrypt credentials
    const credentials = decryptCredentials({
      apiKey: user.apiKey,
      apiSecret: user.apiSecret,
      apiPassphrase: user.apiPassphrase,
    });

    // Build auth headers for CLOB API
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method = 'GET';
    const path = '/orders';

    // Create signature
    const crypto = await import('crypto');
    const message = timestamp + method + path;
    const hmac = crypto.createHmac('sha256', Buffer.from(credentials.apiSecret, 'base64'));
    hmac.update(message);
    const signature = hmac.digest('base64');

    const url = `${CLOB_API_URL}${path}?market=all`;

    const response = await fetch(url, {
      headers: {
        'POLY_API_KEY': credentials.apiKey,
        'POLY_SIGNATURE': signature,
        'POLY_TIMESTAMP': timestamp,
        'POLY_PASSPHRASE': credentials.apiPassphrase,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch orders:', response.status);
      return { orders: [], summary: { totalOrders: 0 } };
    }

    const data = await response.json();
    const orders = Array.isArray(data) ? data : [];

    return {
      orders,
      summary: {
        totalOrders: orders.length,
      },
    };
  } catch (error) {
    console.error('Error fetching open orders:', error);
    return { orders: [], summary: { totalOrders: 0 } };
  }
}
