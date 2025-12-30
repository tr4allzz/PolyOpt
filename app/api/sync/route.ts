// app/api/sync/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { syncMarketsFromPolymarket } from '@/lib/polymarket/sync';

/**
 * POST /api/sync
 * Manually trigger sync of markets from Polymarket
 *
 * This can also be called by a cron job
 */
export async function POST(request: Request) {
  try {
    // Optional: Add authentication/authorization here
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('🔄 Starting market sync...');

    const result = await syncMarketsFromPolymarket();

    return NextResponse.json({
      success: true,
      synced: result.synced,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in sync endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync markets',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync
 * Get sync status (last sync time, market count, etc.)
 */
export async function GET() {
  try {
    const { prisma } = await import('@/lib/prisma');

    const marketCount = await prisma.market.count();
    const activeMarkets = await prisma.market.count({
      where: { active: true },
    });
    const lastUpdated = await prisma.market.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    return NextResponse.json({
      marketCount,
      activeMarkets,
      lastSync: lastUpdated?.updatedAt || null,
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
