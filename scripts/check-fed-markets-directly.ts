// scripts/check-fed-markets-directly.ts
// Check if Fed rate markets actually have rewards

import { prisma } from '../lib/prisma';

async function checkFedMarkets() {
  console.log('🔍 Checking Fed rate markets directly...\n');

  // Get Fed markets from our database
  const dbMarkets = await prisma.market.findMany({
    where: {
      question: {
        contains: 'Fed rate cuts',
      },
    },
    select: {
      id: true,
      question: true,
      rewardPool: true,
      minSize: true,
      maxSpread: true,
      active: true,
    },
  });

  console.log(`💾 Found ${dbMarkets.length} Fed rate markets in our DB\n`);

  // Check each one in the Gamma API directly
  for (const market of dbMarkets) {
    console.log(`\n📊 Checking: ${market.question}`);
    console.log(`   Condition ID: ${market.id}`);
    console.log(`   Our DB: $${market.rewardPool}/day, minSize=${market.minSize}, maxSpread=${market.maxSpread}`);

    try {
      // Try to fetch from Gamma API
      const response = await fetch(`https://gamma-api.polymarket.com/markets/${market.id}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Found in Gamma API`);
        console.log(`      active: ${data.active}`);
        console.log(`      closed: ${data.closed}`);
        console.log(`      rewardsMinSize: ${data.rewardsMinSize}`);
        console.log(`      rewardsMaxSpread: ${data.rewardsMaxSpread}`);

        const hasRewards = data.rewardsMinSize > 0 && data.rewardsMaxSpread > 0;
        console.log(`      Has Rewards: ${hasRewards ? 'YES ✅' : 'NO ❌'}`);

        if (!hasRewards) {
          console.log(`   ⚠️  WARNING: Market in our DB but NO REWARDS in API!`);
        }
      } else if (response.status === 404) {
        console.log(`   ❌ NOT FOUND in Gamma API (404)`);
        console.log(`   ⚠️  Market may have been removed or merged`);
      } else {
        console.log(`   ❌ Error: ${response.status}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Error fetching: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
  }

  await prisma.$disconnect();
}

checkFedMarkets().catch(console.error);
