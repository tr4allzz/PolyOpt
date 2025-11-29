// scripts/sync-markets.ts
// Sync reward markets from Polymarket CLOB API to database

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SamplingMarket {
  condition_id: string;
  rewards?: any;
  active: boolean;
  closed: boolean;
}

interface CLOBResponse {
  data: SamplingMarket[];
}

async function syncMarkets() {
  console.log('🔄 Syncing reward markets from Polymarket CLOB API...\n');

  try {
    // Step 1: Fetch reward markets list from CLOB API
    console.log('Fetching reward markets from CLOB API...');
    const samplingResponse = await fetch('https://clob.polymarket.com/sampling-simplified-markets');

    if (!samplingResponse.ok) {
      throw new Error(`Failed to fetch from CLOB: ${samplingResponse.statusText}`);
    }

    const samplingData: CLOBResponse = await samplingResponse.json();
    console.log(`📊 Received ${samplingData.data.length} markets from CLOB API`);

    // Filter markets that have rewards and are active
    const marketsWithRewards = samplingData.data.filter((m: SamplingMarket) =>
      m.rewards && m.active && !m.closed
    );
    console.log(`✅ Active markets with rewards: ${marketsWithRewards.length}\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    // Step 2: Fetch full details for each market
    for (const rewardMarket of marketsWithRewards) {
      try {
        // Fetch full market details from CLOB API
        const detailsResponse = await fetch(`https://clob.polymarket.com/markets/${rewardMarket.condition_id}`);

        if (!detailsResponse.ok) {
          failed++;
          continue;
        }

        const marketDetails = await detailsResponse.json();

        if (!marketDetails.question) {
          skipped++;
          continue;
        }

        // Calculate total daily reward pool
        let dailyRewardPool = 0;
        if (marketDetails.rewards && marketDetails.rewards.rates) {
          // rewards.rates is an array of { asset_address, rewards_daily_rate }
          for (const rate of marketDetails.rewards.rates) {
            dailyRewardPool += parseFloat(rate.rewards_daily_rate || '0');
          }
        }

        // Skip if no rewards
        if (dailyRewardPool === 0) {
          skipped++;
          continue;
        }

        const marketData = {
          question: marketDetails.question,
          description: marketDetails.description || '',
          conditionId: rewardMarket.condition_id,
          maxSpread: parseFloat(marketDetails.rewards?.max_spread || '0.05'),
          minSize: parseFloat(marketDetails.rewards?.min_size || '100'),
          rewardPool: dailyRewardPool,
          midpoint: 0.5, // Default, will be updated from orderbook if needed
          volume: 0, // Not provided by CLOB API
          liquidity: 0, // Not provided by CLOB API
          endDate: marketDetails.end_date_iso ? new Date(marketDetails.end_date_iso) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          active: marketDetails.active !== false,
          resolved: marketDetails.closed || false,
        };

        // Upsert market (create or update)
        const result = await prisma.market.upsert({
          where: { conditionId: rewardMarket.condition_id },
          create: {
            id: rewardMarket.condition_id.substring(0, 32), // Use first 32 chars as ID
            ...marketData,
          },
          update: {
            ...marketData,
            updatedAt: new Date(),
          },
        });

        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          created++;
          console.log(`✅ Created: ${marketDetails.question.substring(0, 60)}...`);
        } else {
          updated++;
          console.log(`🔄 Updated: ${marketDetails.question.substring(0, 60)}...`);
        }

        // Rate limit: wait a bit between requests to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error syncing market ${rewardMarket.condition_id}:`, error);
        failed++;
      }
    }

    console.log('\n📈 Sync Summary:');
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Failed: ${failed}`);
    console.log(`\n✅ Market sync completed successfully!`);

  } catch (error) {
    console.error('❌ Error syncing markets:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

syncMarkets()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
