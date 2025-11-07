// scripts/check-rewards.ts
// Check actual reward data from Polymarket API

async function checkPolymarketRewards() {
  console.log('🔍 Fetching markets from Polymarket API...\n');

  const response = await fetch('https://gamma-api.polymarket.com/markets?closed=false&active=true&limit=20');
  const markets = await response.json();

  console.log(`📊 Received ${markets.length} markets\n`);

  let withRewards = 0;
  let withoutRewards = 0;

  markets.forEach((m: any, i: number) => {
    const hasRewards = m.rewardsMinSize > 0 && m.rewardsMaxSpread > 0;

    if (i < 5) {
      console.log(`Market ${i + 1}: ${m.question.substring(0, 60)}...`);
      console.log(`  rewardsMinSize: ${m.rewardsMinSize}`);
      console.log(`  rewardsMaxSpread: ${m.rewardsMaxSpread}`);
      console.log(`  rewardsDailyRate: ${m.rewardsDailyRate || 'N/A'}`);
      console.log(`  rewards: ${JSON.stringify(m.rewards || 'N/A')}`);
      console.log(`  Has Rewards: ${hasRewards ? '✅' : '❌'}`);
      console.log('');
    }

    if (hasRewards) {
      withRewards++;
    } else {
      withoutRewards++;
    }
  });

  console.log(`\n📈 Summary:`);
  console.log(`  Markets WITH rewards: ${withRewards}`);
  console.log(`  Markets WITHOUT rewards: ${withoutRewards}`);
  console.log(`  Total: ${markets.length}`);

  // Check if there's a rewards field we're missing
  console.log(`\n🔍 Checking for other reward-related fields...`);
  const firstMarket = markets[0];
  const rewardFields = Object.keys(firstMarket).filter(k => k.toLowerCase().includes('reward'));
  console.log(`  Reward-related fields found: ${JSON.stringify(rewardFields)}`);
}

checkPolymarketRewards().catch(console.error);
