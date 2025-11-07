// scripts/explore-apis.ts
// Explore CLOB API and Markets API for reward data

async function exploreAPIs() {
  console.log('🔍 Exploring Polymarket APIs for reward data...\n');

  // 1. Check Markets API for rewards endpoint
  console.log('📊 Testing Markets API endpoints:\n');

  const marketsEndpoints = [
    'https://gamma-api.polymarket.com/markets',
    'https://gamma-api.polymarket.com/rewards',
    'https://gamma-api.polymarket.com/rewards/epochs',
    'https://gamma-api.polymarket.com/rewards/allocations',
    'https://gamma-api.polymarket.com/events',
  ];

  for (const url of marketsEndpoints) {
    try {
      console.log(`Testing: ${url}`);
      const response = await fetch(url);
      console.log(`  Status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ Response (first 300 chars):`, JSON.stringify(data).substring(0, 300));
      }
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log();
  }

  // 2. Check CLOB API endpoints
  console.log('\n📈 Testing CLOB API endpoints:\n');

  const clobEndpoints = [
    'https://clob.polymarket.com/markets',
    'https://clob.polymarket.com/rewards',
    'https://clob.polymarket.com/sampling-markets',
    'https://clob.polymarket.com/sampling-simplified-markets',
  ];

  for (const url of clobEndpoints) {
    try {
      console.log(`Testing: ${url}`);
      const response = await fetch(url);
      console.log(`  Status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ Response (first 300 chars):`, JSON.stringify(data).substring(0, 300));
      }
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log();
  }

  // 3. Check actual field names in gamma-api response
  console.log('\n🔬 Checking actual field names in Markets API:\n');

  const response = await fetch('https://gamma-api.polymarket.com/markets?limit=1');
  const markets = await response.json();
  const market = markets[0];

  console.log('All fields in market object:');
  const rewardRelatedFields = Object.keys(market).filter(k =>
    k.toLowerCase().includes('reward') ||
    k.toLowerCase().includes('incentive') ||
    k.toLowerCase().includes('spread') ||
    k.toLowerCase().includes('size')
  );

  console.log('Reward/Incentive related fields:');
  rewardRelatedFields.forEach(field => {
    console.log(`  ${field}: ${market[field]}`);
  });
}

exploreAPIs().catch(console.error);
