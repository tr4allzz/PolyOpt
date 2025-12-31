// app/api/user/portfolio-data/route.ts
// Combined endpoint for portfolio page data
// NOTE: Order fetching disabled - we no longer store API credentials

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { getAddress } from 'viem';

const DATA_API_URL = 'https://data-api.polymarket.com';

/**
 * GET /api/user/portfolio-data
 * Fetches all portfolio data in one request:
 * - Rewards from Polymarket Data API
 * - Active positions from Polymarket Data API
 * - Positions from our database
 */
export const GET = requireAuth(async (request: NextRequest, auth) => {
  const walletAddress = auth.walletAddress;
  console.log(`📊 Fetching portfolio data for ${walletAddress}...`);

  // First fetch the db user to get the proxy wallet address if available
  const dbUserResult = await Promise.resolve(fetchDbUser(walletAddress)).catch(() => null);
  const dbUser = dbUserResult || null;

  // Use funderAddress (proxy wallet) if available, otherwise use main wallet
  const rewardsWallet = dbUser?.funderAddress || walletAddress;

  // Run remaining fetches in parallel
  const [
    rewardsResult,
    activePositionsResult,
  ] = await Promise.allSettled([
    fetchRewardsWithFallback(walletAddress, rewardsWallet),
    fetchActivePositions(walletAddress),
  ]);

  // Extract results (handle rejected promises)
  const rewards = rewardsResult.status === 'fulfilled' ? rewardsResult.value : { rewards: [], summary: { totalEarned: 0, totalRewards: 0 } };
  const activePositions = activePositionsResult.status === 'fulfilled' ? activePositionsResult.value : { positions: [], summary: { totalPositions: 0, totalValue: 0, totalPnl: 0 } };

  // Open orders disabled - we no longer store credentials
  const openOrders = { orders: [], summary: { totalOrders: 0 } };

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
    hasCredentials: false, // We no longer store credentials
  });
});

/**
 * Lookup proxy wallet (Safe) from EOA using Safe Global API
 * Polymarket uses Gnosis Safe for proxy wallets on Polygon
 */
async function lookupProxyWallet(eoaAddress: string): Promise<string | null> {
  try {
    // Safe API requires EIP-55 checksum address - use viem's getAddress
    const checksumAddr = getAddress(eoaAddress);
    const url = `https://safe-transaction-polygon.safe.global/api/v1/owners/${checksumAddr}/safes/`;
    console.log(`Looking up proxy wallet for EOA: ${checksumAddr}`);

    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.log(`Safe API returned ${response.status} - user may not have a proxy wallet`);
      return null;
    }

    const data = await response.json();
    if (data.safes && data.safes.length > 0) {
      // Return the first safe (usually the Polymarket proxy wallet)
      console.log(`Found proxy wallet via Safe API: ${data.safes[0]}`);
      return data.safes[0];
    }

    console.log('No proxy wallet found for this EOA');
    return null;
  } catch (error) {
    console.error('Error looking up proxy wallet:', error);
    return null;
  }
}

/**
 * Try to fetch rewards from Polymarket Data API for a specific wallet
 */
async function fetchRewardsFromDataApi(walletAddress: string) {
  const url = `${DATA_API_URL}/activity?user=${walletAddress}&type=REWARD&limit=500&sortBy=TIMESTAMP&sortDirection=DESC`;
  console.log(`Trying Data API for wallet: ${walletAddress}`);

  const response = await fetch(url, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    console.log(`Data API returned ${response.status} for ${walletAddress}`);
    return null;
  }

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    console.log(`Data API returned empty array for ${walletAddress}`);
    return null;
  }

  console.log(`Found ${data.length} rewards from Data API for ${walletAddress}`);
  let totalEarned = 0;
  for (const reward of data) {
    totalEarned += parseFloat(reward.usdcSize || reward.cash_amount || 0);
  }

  return {
    rewards: data,
    summary: { totalEarned, totalRewards: data.length },
  };
}

/**
 * Fetch rewards - automatically discovers proxy wallet via Safe API
 */
async function fetchRewardsWithFallback(mainWallet: string, knownProxyWallet: string) {
  try {
    // First try the main wallet directly
    const mainResult = await fetchRewardsFromDataApi(mainWallet);
    if (mainResult && mainResult.rewards.length > 0) {
      return mainResult;
    }

    // If we have a known proxy wallet from DB, try that
    if (knownProxyWallet && knownProxyWallet.toLowerCase() !== mainWallet.toLowerCase()) {
      console.log(`Trying known proxy wallet: ${knownProxyWallet}`);
      const knownProxyResult = await fetchRewardsFromDataApi(knownProxyWallet);
      if (knownProxyResult && knownProxyResult.rewards.length > 0) {
        return knownProxyResult;
      }
    }

    // Auto-discover proxy wallet via Safe Global API
    const discoveredProxy = await lookupProxyWallet(mainWallet);
    if (discoveredProxy) {
      const proxyResult = await fetchRewardsFromDataApi(discoveredProxy);
      if (proxyResult && proxyResult.rewards.length > 0) {
        return proxyResult;
      }
    }

    // No rewards found
    console.log('No rewards found for this user');
    return { rewards: [], summary: { totalEarned: 0, totalRewards: 0 } };
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
