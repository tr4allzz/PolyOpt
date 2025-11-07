// scripts/deep-check-rewards.ts
// Deep dive into reward fields

async function deepCheckRewards() {
  console.log('🔍 Deep checking reward fields...\n');

  const response = await fetch('https://gamma-api.polymarket.com/markets?closed=false&active=true&limit=100');
  const markets = await response.json();

  console.log(`📊 Analyzing ${markets.length} markets\n`);

  // Check all unique values for reward fields
  const rewardFields = ['rewardsMinSize', 'rewardsMaxSpread', 'umaReward', 'holdingRewardsEnabled', 'rewardsDailyRate'];

  console.log('📋 Sample of markets and their reward fields:\n');

  markets.slice(0, 10).forEach((m: any, i: number) => {
    console.log(`${i + 1}. ${m.question.substring(0, 50)}...`);
    rewardFields.forEach(field => {
      const value = m[field];
      console.log(`   ${field}: ${value !== undefined ? value : 'undefined'}`);
    });
    console.log('');
  });

  // Statistics
  console.log('\n📊 Statistics:');

  const withMinSize = markets.filter((m: any) => m.rewardsMinSize > 0).length;
  const withMaxSpread = markets.filter((m: any) => m.rewardsMaxSpread > 0).length;
  const withBoth = markets.filter((m: any) => m.rewardsMinSize > 0 && m.rewardsMaxSpread > 0).length;
  const withHoldingRewards = markets.filter((m: any) => m.holdingRewardsEnabled).length;
  const withUmaReward = markets.filter((m: any) => m.umaReward).length;

  console.log(`  Markets with rewardsMinSize > 0: ${withMinSize}/${markets.length}`);
  console.log(`  Markets with rewardsMaxSpread > 0: ${withMaxSpread}/${markets.length}`);
  console.log(`  Markets with BOTH (our filter): ${withBoth}/${markets.length}`);
  console.log(`  Markets with holdingRewardsEnabled: ${withHoldingRewards}/${markets.length}`);
  console.log(`  Markets with umaReward: ${withUmaReward}/${markets.length}`);

  // Check if we're missing any markets that should have rewards
  console.log('\n🤔 Markets with holdingRewardsEnabled but NO minSize/maxSpread:');
  const missingRewards = markets.filter((m: any) =>
    m.holdingRewardsEnabled && !(m.rewardsMinSize > 0 && m.rewardsMaxSpread > 0)
  );
  console.log(`  Found: ${missingRewards.length}`);
  if (missingRewards.length > 0) {
    missingRewards.slice(0, 3).forEach((m: any) => {
      console.log(`  - ${m.question.substring(0, 60)}`);
    });
  }

  // Check our current database
  console.log('\n💾 Checking our synced database...');
  const dbResponse = await fetch('http://localhost:3001/api/markets?limit=100');
  const dbData = await dbResponse.json();
  console.log(`  Markets in DB: ${dbData.total}`);
  console.log(`  Markets with rewardPool > 0: ${dbData.markets.filter((m: any) => m.rewardPool > 0).length}`);

  // Sample some DB markets
  console.log('\n📝 Sample DB markets:');
  dbData.markets.slice(0, 5).forEach((m: any, i: number) => {
    console.log(`${i + 1}. ${m.question.substring(0, 50)}...`);
    console.log(`   Reward Pool: $${m.rewardPool}`);
    console.log(`   Max Spread: ${m.maxSpread}`);
    console.log(`   Min Size: ${m.minSize}`);
  });
}

deepCheckRewards().catch(console.error);
