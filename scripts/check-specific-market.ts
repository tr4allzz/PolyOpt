// scripts/check-specific-market.ts
// Check a specific market for rewards

async function checkMarket() {
  console.log('🔍 Checking "How many Fed rate cuts in 2025?" market...\n');

  // This is an event page, let's search for markets with "Fed rate cuts"
  const gammaResponse = await fetch('https://gamma-api.polymarket.com/markets?limit=100');
  const gammaMarkets = await gammaResponse.json();

  console.log('🔎 Searching Gamma API for Fed rate cuts markets...\n');

  const fedMarkets = gammaMarkets.filter((m: any) =>
    m.question.toLowerCase().includes('fed') &&
    m.question.toLowerCase().includes('rate') &&
    m.question.toLowerCase().includes('2025')
  );

  console.log(`Found ${fedMarkets.length} Fed rate markets:\n`);

  fedMarkets.forEach((m: any, i: number) => {
    console.log(`${i + 1}. ${m.question}`);
    console.log(`   Condition ID: ${m.conditionId}`);
    console.log(`   rewardsMinSize: ${m.rewardsMinSize}`);
    console.log(`   rewardsMaxSpread: ${m.rewardsMaxSpread}`);
    console.log(`   Has Rewards: ${m.rewardsMinSize > 0 && m.rewardsMaxSpread > 0 ? 'YES ✅' : 'NO ❌'}`);
    console.log();
  });

  // Check CLOB API for rewards
  console.log('\n💰 Checking CLOB API for these markets...\n');
  const clobResponse = await fetch('https://clob.polymarket.com/sampling-simplified-markets');
  const clobData = await clobResponse.json();

  fedMarkets.forEach((m: any) => {
    const clobMarket = clobData.data.find((cm: any) => cm.condition_id === m.conditionId);
    if (clobMarket && clobMarket.rewards) {
      console.log(`✅ ${m.question}`);
      console.log(`   CLOB Daily Rate: ${clobMarket.rewards.rates?.[0]?.rewards_daily_rate || 'N/A'}`);
      console.log(`   CLOB Min Size: ${clobMarket.rewards.min_size}`);
      console.log(`   CLOB Max Spread: ${clobMarket.rewards.max_spread}`);
    } else {
      console.log(`❌ ${m.question}`);
      console.log(`   NOT in CLOB rewards API`);
    }
    console.log();
  });

  // Check what's in our database
  console.log('\n💾 Checking our database...\n');
  const dbResponse = await fetch('http://localhost:3001/api/markets?limit=100');
  const dbData = await dbResponse.json();

  const ourFedMarkets = dbData.markets.filter((m: any) =>
    m.question.toLowerCase().includes('fed') &&
    m.question.toLowerCase().includes('rate') &&
    m.question.toLowerCase().includes('2025')
  );

  console.log(`Found ${ourFedMarkets.length} Fed rate markets in our DB:\n`);
  ourFedMarkets.forEach((m: any) => {
    console.log(`- ${m.question}`);
    console.log(`  Reward Pool: $${m.rewardPool}/day`);
    console.log(`  Min Size: ${m.minSize}`);
    console.log(`  Max Spread: ${m.maxSpread}`);
    console.log();
  });
}

checkMarket().catch(console.error);
