// scripts/verify-remaining-markets.ts
// Verify that remaining markets exist and have rewards

import { prisma } from '../lib/prisma';

async function verifyRemainingMarkets() {
  console.log('🔍 Verifying remaining markets...\n');

  const markets = await prisma.market.findMany({
    select: {
      id: true,
      question: true,
      rewardPool: true,
      minSize: true,
      maxSpread: true,
    },
    take: 10,
  });

  console.log(`Checking first 10 of ${await prisma.market.count()} markets:\n`);

  for (const market of markets) {
    console.log(`📊 ${market.question.substring(0, 50)}...`);

    try {
      // Check Gamma API
      const response = await fetch(`https://gamma-api.polymarket.com/markets/${market.id}`);

      if (response.ok) {
        const data = await response.json();
        const hasRewards = data.rewardsMinSize > 0 && data.rewardsMaxSpread > 0;

        console.log(`   ✅ EXISTS in Gamma API`);
        console.log(`      active: ${data.active}, closed: ${data.closed}`);
        console.log(`      rewardsMinSize: ${data.rewardsMinSize}`);
        console.log(`      rewardsMaxSpread: ${data.rewardsMaxSpread}`);
        console.log(`      Has Rewards: ${hasRewards ? 'YES ✅' : 'NO ❌'}`);

        if (!hasRewards) {
          console.log(`   ⚠️  WARNING: NO REWARDS!`);
        }
      } else {
        console.log(`   ❌ NOT FOUND (${response.status})`);
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log();
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  await prisma.$disconnect();
}

verifyRemainingMarkets().catch(console.error);
