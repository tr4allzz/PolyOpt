// app/api/markets/[id]/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchMarketDetails } from '@/lib/polymarket/client';

/**
 * GET /api/markets/[id]
 * Get detailed market information
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const fresh = searchParams.get('fresh') === 'true';

    // Get from database
    const market = await prisma.market.findUnique({
      where: { id },
      include: {
        snapshots: {
          orderBy: { timestamp: 'desc' },
          take: 30, // Last 30 snapshots
        },
      },
    });

    if (!market) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    // Optionally fetch fresh data from Polymarket
    if (fresh) {
      const freshData = await fetchMarketDetails(id);
      if (freshData) {
        // Update database with fresh data
        const updated = await prisma.market.update({
          where: { id },
          data: {
            midpoint: freshData.midpoint,
            volume: freshData.volume,
            liquidity: freshData.liquidity,
            active: freshData.active,
            resolved: freshData.resolved,
          },
          include: {
            snapshots: {
              orderBy: { timestamp: 'desc' },
              take: 30,
            },
          },
        });
        return NextResponse.json({ market: updated });
      }
    }

    return NextResponse.json({ market });
  } catch (error) {
    console.error('Error fetching market:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market' },
      { status: 500 }
    );
  }
}
