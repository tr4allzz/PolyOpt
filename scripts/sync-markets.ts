// scripts/sync-markets.ts
// Sync reward markets from Polymarket CLOB API to database

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RewardRate {
  asset_address: string;
  rewards_daily_rate: string;
}

interface RewardData {
  min_size: string;
  max_spread: string;
  rates: RewardRate[];
}

interface MarketData {
  condition_id: string;
  question: string;
  description?: string;
  end_date_iso?: string;
  rewards?: RewardData;
}

interface CLOBResponse {
  data: MarketData[];
}

async function syncMarkets() {
  console.log('🔄 Syncing reward markets from Polymarket APIs...\n');

  try {
    // Step 1: Fetch reward data from CLOB API
    console.log('Fetching reward data from CLOB API...');
    const clobResponse = await fetch('https://clob.polymarket.com/sampling-simplified-markets');

    if (!clobResponse.ok) {
      throw new Error(`Failed to fetch from CLOB: ${clobResponse.statusText}`);
    }

    const clobData: CLOBResponse = await clobResponse.json();
    console.log(`📊 Received ${clobData.data.length} markets from CLOB API`);

    // Filter markets that have rewards
    const marketsWithRewards = clobData.data.filter((m: MarketData) => m.rewards);
    console.log(`✅ Markets with rewards: ${marketsWithRewards.length}`);

    // Step 2: Fetch market details from Gamma API
    console.log('Fetching market details from Gamma API...');
    const gammaResponse = await fetch('https://gamma-api.polymarket.com/markets');

    if (!gammaResponse.ok) {
      throw new Error(`Failed to fetch from Gamma: ${gammaResponse.statusText}`);
    }

    const gammaMarkets = await gammaResponse.json();
    console.log(`📊 Received ${gammaMarkets.length} markets from Gamma API\n`);

    // Create a map of condition_id to market details
    const marketDetailsMap = new Map();
    for (const market of gammaMarkets) {
      if (market.condition_id) {
        marketDetailsMap.set(market.condition_id, market);
      }
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const rewardMarket of marketsWithRewards) {
      try {
        // Get market details from Gamma API
        const marketDetails = marketDetailsMap.get(rewardMarket.condition_id);

        if (!marketDetails || !marketDetails.question) {
          skipped++;
          continue;
        }

        // Calculate total daily reward pool
        let dailyRewardPool = 0;
        if (rewardMarket.rewards && rewardMarket.rewards.rates) {
          dailyRewardPool = rewardMarket.rewards.rates.reduce((sum, rate) => {
            return sum + parseFloat(rate.rewards_daily_rate || '0');
          }, 0);
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
          maxSpread: parseFloat(rewardMarket.rewards?.max_spread || '0.05'),
          minSize: parseFloat(rewardMarket.rewards?.min_size || '100'),
          rewardPool: dailyRewardPool,
          midpoint: 0.5, // Default, will be updated from orderbook if needed
          volume: marketDetails.volume || 0,
          liquidity: marketDetails.liquidity || 0,
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
      } catch (error) {
        console.error(`❌ Error syncing market ${rewardMarket.condition_id}:`, error);
      }
    }

    console.log('\n📈 Sync Summary:');
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
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
