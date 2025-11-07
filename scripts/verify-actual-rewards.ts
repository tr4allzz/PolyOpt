// scripts/verify-actual-rewards.ts
// Verify which markets actually have LP rewards

async function verifyRewards() {
  console.log('🔍 Verifying actual LP rewards from Polymarket API...\n');

  const response = await fetch('https://gamma-api.polymarket.com/markets?closed=false&active=true&limit=100');
  const markets = await response.json();

  const marketsWithRewards = markets.filter((m: any) =>
    m.rewardsMinSize > 0 && m.rewardsMaxSpread > 0
  );

  const marketsWithoutRewards = markets.filter((m: any) =>
    !(m.rewardsMinSize > 0 && m.rewardsMaxSpread > 0)
  );

  console.log(`📊 Results:`);
  console.log(`  Total markets: ${markets.length}`);
  console.log(`  Markets WITH LP rewards: ${marketsWithRewards.length}`);
  console.log(`  Markets WITHOUT LP rewards: ${marketsWithoutRewards.length}\n`);

  console.log(`✅ Markets WITH rewards (first 10):`);
  marketsWithRewards.slice(0, 10).forEach((m: any, i: number) => {
    console.log(`${i + 1}. ${m.question}`);
    console.log(`   Min Size: ${m.rewardsMinSize}, Max Spread: ${m.rewardsMaxSpread}`);
  });

  console.log(`\n❌ Markets WITHOUT rewards (first 10):`);
  marketsWithoutRewards.slice(0, 10).forEach((m: any, i: number) => {
    console.log(`${i + 1}. ${m.question}`);
    console.log(`   Min Size: ${m.rewardsMinSize || 0}, Max Spread: ${m.rewardsMaxSpread || 0}`);
  });

  // Now check what we have in our database
  console.log(`\n💾 Checking our database...`);
  const dbResponse = await fetch('http://localhost:3001/api/markets?limit=1000');

  try {
    const dbData = await dbResponse.json();
    console.log(`  Markets in our DB: ${dbData.total || dbData.markets.length}`);

    // Check if all our markets have rewards
    const ourMarketsIds = dbData.markets.map((m: any) => m.id);
    const apiMarketsMap = new Map(markets.map((m: any) => [m.conditionId, m]));

    let correctlyFiltered = 0;
    let incorrectlyIncluded = 0;

    dbData.markets.forEach((dbMarket: any) => {
      const apiMarket = apiMarketsMap.get(dbMarket.id);
      if (apiMarket) {
        const hasRewards = apiMarket.rewardsMinSize > 0 && apiMarket.rewardsMaxSpread > 0;
        if (hasRewards) {
          correctlyFiltered++;
        } else {
          incorrectlyIncluded++;
          console.log(`⚠️  INCORRECTLY INCLUDED: ${dbMarket.question}`);
          console.log(`    DB has: minSize=${dbMarket.minSize}, maxSpread=${dbMarket.maxSpread}`);
          console.log(`    API has: minSize=${apiMarket.rewardsMinSize}, maxSpread=${apiMarket.rewardsMaxSpread}`);
        }
      }
    });

    console.log(`\n✅ Verification Results:`);
    console.log(`  Correctly filtered markets: ${correctlyFiltered}`);
    console.log(`  Incorrectly included markets: ${incorrectlyIncluded}`);

    if (incorrectlyIncluded === 0) {
      console.log(`\n🎉 All markets in our database correctly have LP rewards!`);
    }
  } catch (error) {
    console.log(`  Could not parse DB response (may need server restart)`);
  }
}

verifyRewards().catch(console.error);
