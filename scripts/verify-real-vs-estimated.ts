// scripts/verify-real-vs-estimated.ts
// Check which markets have REAL reward data vs estimates

import { fetchRewardAllocations } from '../lib/polymarket/rewards-client';
import { prisma } from '../lib/prisma';

async function verifyRewards() {
  console.log('🔍 Verifying real vs estimated reward data...\n');

  // Fetch real reward allocations
  const rewardAllocations = await fetchRewardAllocations();
  console.log(`📊 CLOB API has ${rewardAllocations.size} markets with reward data\n`);

  // Fetch our database markets
  const dbMarkets = await prisma.market.findMany({
    select: {
      id: true,
      question: true,
      rewardPool: true,
      maxSpread: true,
      minSize: true,
    },
  });

  console.log(`💾 Database has ${dbMarkets.length} markets\n`);

  let withRealData = 0;
  let withEstimatedData = 0;

  console.log('📋 Market Reward Data Analysis:\n');

  dbMarkets.forEach((market, i) => {
    const realReward = rewardAllocations.get(market.id);

    if (realReward) {
      withRealData++;
      if (i < 10) {
        console.log(`✅ REAL: ${market.question.substring(0, 50)}`);
        console.log(`   Daily Rate: $${realReward.dailyRate} (actual from CLOB API)`);
        console.log(`   DB Value: $${market.rewardPool}`);
        console.log(`   Match: ${realReward.dailyRate === market.rewardPool ? 'YES ✅' : 'NO ❌'}`);
        console.log();
      }
    } else {
      withEstimatedData++;
      if (i < 10 && withEstimatedData <= 3) {
        console.log(`⚠️  ESTIMATED: ${market.question.substring(0, 50)}`);
        console.log(`   DB Value: $${market.rewardPool} (estimate)`);
        console.log(`   Reason: Not in CLOB rewards API`);
        console.log();
      }
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`  Markets with REAL data: ${withRealData}/${dbMarkets.length}`);
  console.log(`  Markets with ESTIMATED data: ${withEstimatedData}/${dbMarkets.length}`);

  // Show some examples of real rewards
  console.log(`\n💰 Examples of REAL daily rates:`);
  const realExamples: { id: string; rate: number }[] = [];
  rewardAllocations.forEach((reward, id) => {
    if (realExamples.length < 10) {
      realExamples.push({ id, rate: reward.dailyRate });
    }
  });

  realExamples.sort((a, b) => b.rate - a.rate);
  realExamples.forEach(({ id, rate }, i) => {
    const market = dbMarkets.find(m => m.id === id);
    if (market) {
      console.log(`${i + 1}. $${rate}/day - ${market.question.substring(0, 50)}...`);
    }
  });

  await prisma.$disconnect();
}

verifyRewards().catch(console.error);
