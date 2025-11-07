// scripts/verify-fed-rate-hike.ts
// Verify "Fed rate hike in 2025?" specifically

async function verifyFedRateHike() {
  console.log('🔍 Verifying "Fed rate hike in 2025?" market...\n');

  // Search for it in Gamma API
  const response = await fetch('https://gamma-api.polymarket.com/markets?limit=100');
  const markets = await response.json();

  const fedRateHike = markets.find((m: any) =>
    m.question === 'Fed rate hike in 2025?'
  );

  if (fedRateHike) {
    console.log('✅ Found market in Gamma API\n');
    console.log(`Question: ${fedRateHike.question}`);
    console.log(`ID: ${fedRateHike.id}`);
    console.log(`Condition ID: ${fedRateHike.conditionId}`);
    console.log(`Active: ${fedRateHike.active}`);
    console.log(`Closed: ${fedRateHike.closed}`);
    console.log(`rewardsMinSize: ${fedRateHike.rewardsMinSize}`);
    console.log(`rewardsMaxSpread: ${fedRateHike.rewardsMaxSpread}`);

    const hasRewards = fedRateHike.rewardsMinSize > 0 && fedRateHike.rewardsMaxSpread > 0;
    console.log(`\nHas LP Rewards: ${hasRewards ? 'YES ✅' : 'NO ❌'}`);

    if (hasRewards) {
      console.log(`\n✅ This market DOES have LP rewards!`);
      console.log(`   Min Size: ${fedRateHike.rewardsMinSize} shares`);
      console.log(`   Max Spread: ${fedRateHike.rewardsMaxSpread}¢`);
    } else {
      console.log(`\n❌ This market does NOT have LP rewards`);
      console.log(`   It should NOT be in our app`);
    }

    // Check CLOB API
    console.log(`\n🔬 Checking CLOB API for reward rate...`);
    const clobResponse = await fetch('https://clob.polymarket.com/sampling-simplified-markets');
    const clobData = await clobResponse.json();

    const clobMarket = clobData.data.find((cm: any) => cm.condition_id === fedRateHike.conditionId);

    if (clobMarket && clobMarket.rewards) {
      console.log(`✅ Found in CLOB rewards API`);
      console.log(`   Daily Rate: $${clobMarket.rewards.rates?.[0]?.rewards_daily_rate || 'N/A'}/day`);
    } else {
      console.log(`❌ NOT in CLOB rewards API (using estimate)`);
    }
  } else {
    console.log('❌ Market NOT found in Gamma API');
  }
}

verifyFedRateHike().catch(console.error);
