// scripts/check-rewards-api.ts
// Check if there's a rewards-specific API endpoint

async function checkRewardsAPI() {
  console.log('🔍 Checking for Polymarket rewards API...\n');

  // Try different potential endpoints
  const endpoints = [
    'https://gamma-api.polymarket.com/rewards',
    'https://gamma-api.polymarket.com/rewards/config',
    'https://gamma-api.polymarket.com/rewards/markets',
    'https://clob.polymarket.com/rewards',
    'https://data-api.polymarket.com/rewards',
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint}`);
      const response = await fetch(endpoint);
      console.log(`  Status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ SUCCESS! Response:`, JSON.stringify(data, null, 2).substring(0, 500));
        return;
      }
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log('');
  }

  console.log('\n📝 None of the standard endpoints worked.');
  console.log('   The markets API with rewardsMinSize/rewardsMaxSpread is likely correct.');
  console.log('   These fields indicate markets eligible for LP rewards.\n');

  // Let's check a specific market to understand better
  console.log('🔬 Examining a specific market in detail...\n');

  const marketsResponse = await fetch('https://gamma-api.polymarket.com/markets?closed=false&active=true&limit=1');
  const markets = await marketsResponse.json();
  const market = markets[0];

  console.log('Full market object:');
  console.log(JSON.stringify(market, null, 2));
}

checkRewardsAPI().catch(console.error);
