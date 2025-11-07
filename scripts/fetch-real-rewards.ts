// scripts/fetch-real-rewards.ts
// Fetch ACTUAL reward data from CLOB API

async function fetchRealRewards() {
  console.log('🎯 Fetching REAL reward data from CLOB API...\n');

  const response = await fetch('https://clob.polymarket.com/sampling-simplified-markets');
  const data = await response.json();

  console.log(`📊 Received ${data.data.length} markets with reward data\n`);

  // Parse the reward data
  const marketsWithRewards = data.data.filter((m: any) => m.rewards);

  console.log(`✅ Markets with rewards: ${marketsWithRewards.length}\n`);

  // Show first 10 markets with their ACTUAL reward data
  console.log('📋 Sample markets with REAL reward data:\n');

  marketsWithRewards.slice(0, 10).forEach((m: any, i: number) => {
    console.log(`${i + 1}. Condition ID: ${m.condition_id.substring(0, 20)}...`);

    if (m.rewards) {
      console.log(`   Min Size: ${m.rewards.min_size}`);
      console.log(`   Max Spread: ${m.rewards.max_spread}`);

      if (m.rewards.rates && m.rewards.rates.length > 0) {
        m.rewards.rates.forEach((rate: any) => {
          console.log(`   Daily Rate: ${rate.rewards_daily_rate} (asset: ${rate.asset_address.substring(0, 10)}...)`);
        });
      }
    }

    console.log();
  });

  // Calculate total daily rewards
  let totalDailyRewards = 0;
  marketsWithRewards.forEach((m: any) => {
    if (m.rewards && m.rewards.rates) {
      m.rewards.rates.forEach((rate: any) => {
        totalDailyRewards += parseFloat(rate.rewards_daily_rate || 0);
      });
    }
  });

  console.log(`\n💰 Total daily rewards across all markets: ${totalDailyRewards.toFixed(2)}\n`);

  // Sample response structure
  console.log('📝 Full structure of one market:');
  console.log(JSON.stringify(marketsWithRewards[0], null, 2));
}

fetchRealRewards().catch(console.error);
