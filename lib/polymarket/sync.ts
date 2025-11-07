// lib/polymarket/sync.ts
// Sync Polymarket markets to local database

import { prisma } from '@/lib/prisma';
import { fetchRewardMarkets } from './client';

/**
 * Sync markets from Polymarket to database
 * This should be run periodically (e.g., every hour)
 */
export async function syncMarketsFromPolymarket(): Promise<{
  synced: number;
  errors: number;
}> {
  let synced = 0;
  let errors = 0;

  try {
    console.log('🔄 Syncing markets from Polymarket...');

    // Fetch markets with ACTUAL active rewards (already includes CLOB data)
    const markets = await fetchRewardMarkets();

    console.log(`📊 Found ${markets.length} markets with ACTUAL active liquidity rewards`);

    // Upsert each market to database
    for (const market of markets) {
      try {
        // Market already has REAL reward data from CLOB API

        await prisma.market.upsert({
          where: { id: market.id },
          update: {
            conditionId: market.conditionId,
            question: market.question,
            description: market.description,
            maxSpread: market.maxSpread, // Real from CLOB
            minSize: market.minSize, // Real from CLOB
            rewardPool: market.rewardPool, // Real daily rate from CLOB
            midpoint: market.midpoint,
            volume: market.volume,
            liquidity: market.liquidity,
            endDate: market.endDate,
            active: market.active,
            resolved: market.resolved,
            updatedAt: new Date(),
          },
          create: {
            id: market.id,
            conditionId: market.conditionId,
            question: market.question,
            description: market.description,
            maxSpread: market.maxSpread,
            minSize: market.minSize,
            rewardPool: market.rewardPool,
            midpoint: market.midpoint,
            volume: market.volume,
            liquidity: market.liquidity,
            endDate: market.endDate,
            active: market.active,
            resolved: market.resolved,
          },
        });

        // Skip snapshot for now (too slow during bulk sync)

        synced++;
      } catch (error) {
        console.error(`Error syncing market ${market.id}:`, error);
        errors++;
      }
    }

    console.log(`✅ Synced ${synced} markets, ${errors} errors`);

    return { synced, errors };
  } catch (error) {
    console.error('Error syncing markets:', error);
    return { synced, errors };
  }
}

/**
 * Update a single market from Polymarket
 */
export async function syncSingleMarket(marketId: string): Promise<boolean> {
  try {
    const { fetchMarketDetails } = await import('./client');
    const market = await fetchMarketDetails(marketId);

    if (!market) {
      return false;
    }

    // Market already has REAL reward data from CLOB
    await prisma.market.upsert({
      where: { id: market.id },
      update: {
        conditionId: market.conditionId,
        question: market.question,
        description: market.description,
        maxSpread: market.maxSpread,
        minSize: market.minSize,
        rewardPool: market.rewardPool,
        midpoint: market.midpoint,
        volume: market.volume,
        liquidity: market.liquidity,
        endDate: market.endDate,
        active: market.active,
        resolved: market.resolved,
        updatedAt: new Date(),
      },
      create: {
        id: market.id,
        conditionId: market.conditionId,
        question: market.question,
        description: market.description,
        maxSpread: market.maxSpread,
        minSize: market.minSize,
        rewardPool: market.rewardPool,
        midpoint: market.midpoint,
        volume: market.volume,
        liquidity: market.liquidity,
        endDate: market.endDate,
        active: market.active,
        resolved: market.resolved,
      },
    });

    return true;
  } catch (error) {
    console.error(`Error syncing market ${marketId}:`, error);
    return false;
  }
}
