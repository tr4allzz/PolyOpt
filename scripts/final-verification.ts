// scripts/final-verification.ts
// Final verification that all our markets have ACTUAL active rewards

import { prisma } from '../lib/prisma';

async function finalVerification() {
  console.log('🔍 Final Verification: All markets have ACTUAL active rewards\n');

  // Get all markets from our database
  const dbMarkets = await prisma.market.findMany({
    select: {
      id: true,
      question: true,
      rewardPool: true,
      minSize: true,
      maxSpread: true,
    },
  });

  console.log(`📊 Database has ${dbMarkets.length} markets\n`);

  // Fetch CLOB API to verify
  const clobResponse = await fetch('https://clob.polymarket.com/sampling-simplified-markets');
  const clobData = await clobResponse.json();

  const clobRewardsMap = new Map();
  clobData.data.filter((m: any) => m.rewards).forEach((m: any) => {
    clobRewardsMap.set(m.condition_id, {
      dailyRate: m.rewards.rates?.[0]?.rewards_daily_rate || 0,
      minSize: m.rewards.min_size,
      maxSpread: m.rewards.max_spread,
    });
  });

  console.log(`💰 CLOB API has ${clobRewardsMap.size} markets with rewards\n`);

  // Fetch Gamma API to map IDs
  const gammaResponse = await fetch('https://gamma-api.polymarket.com/markets?closed=false&active=true&limit=1000');
  const gammaMarkets = await gammaResponse.json();

  const idToConditionId = new Map(
    gammaMarkets.map((m: any) => [m.id, m.conditionId])
  );

  // Verify each market in our DB
  let verified = 0;
  let failed = 0;

  console.log('✅ Verifying markets...\n');

  dbMarkets.slice(0, 10).forEach((dbMarket, i) => {
    const conditionId = idToConditionId.get(dbMarket.id);
    const clobReward = clobRewardsMap.get(conditionId);

    if (clobReward) {
      const match = clobReward.dailyRate === dbMarket.rewardPool;
      console.log(`${i + 1}. ${dbMarket.question.substring(0, 50)}`);
      console.log(`   DB: $${dbMarket.rewardPool}/day`);
      console.log(`   CLOB: $${clobReward.dailyRate}/day`);
      console.log(`   ${match ? '✅ MATCH' : '⚠️  MISMATCH'}`);
      if (match) verified++;
      else failed++;
    } else {
      console.log(`${i + 1}. ${dbMarket.question.substring(0, 50)}`);
      console.log(`   ❌ NOT in CLOB rewards API!`);
      failed++;
    }
    console.log();
  });

  // Check all remaining (not just first 10)
  let totalVerified = 0;
  let totalFailed = 0;

  dbMarkets.forEach((dbMarket) => {
    const conditionId = idToConditionId.get(dbMarket.id);
    const clobReward = clobRewardsMap.get(conditionId);

    if (clobReward && clobReward.dailyRate === dbMarket.rewardPool) {
      totalVerified++;
    } else {
      totalFailed++;
    }
  });

  console.log(`\n📊 Final Results:`);
  console.log(`   Total markets: ${dbMarkets.length}`);
  console.log(`   Verified (have ACTUAL rewards): ${totalVerified} (${(totalVerified / dbMarkets.length * 100).toFixed(1)}%)`);
  console.log(`   Failed verification: ${totalFailed}`);

  if (totalVerified === dbMarkets.length) {
    console.log(`\n🎉 SUCCESS! All ${dbMarkets.length} markets have ACTUAL active liquidity rewards!`);
  } else {
    console.log(`\n⚠️  Warning: ${totalFailed} markets failed verification`);
  }

  await prisma.$disconnect();
}

finalVerification().catch(console.error);
