// scripts/test-gamma-api-fresh.ts
// Test fresh fetch from Gamma API to see what we get

async function testGammaAPI() {
  console.log('🔍 Testing fresh Gamma API fetch...\n');

  const response = await fetch('https://gamma-api.polymarket.com/markets?closed=false&active=true&limit=5');
  const markets = await response.json();

  console.log(`📊 Received ${markets.length} markets\n`);

  markets.forEach((m: any, i: number) => {
    console.log(`Market ${i + 1}: ${m.question}`);
    console.log(`   id: ${m.id}`);
    console.log(`   conditionId: ${m.conditionId}`);
    console.log(`   slug: ${m.slug}`);
    console.log(`   rewardsMinSize: ${m.rewardsMinSize}`);
    console.log(`   rewardsMaxSpread: ${m.rewardsMaxSpread}`);
    console.log(`   active: ${m.active}`);
    console.log(`   closed: ${m.closed}`);
    console.log();
  });

  // Now test fetching one by its conditionId
  const firstMarket = markets[0];
  console.log(`\n🔬 Testing fetch by conditionId: ${firstMarket.conditionId}\n`);

  try {
    const testResponse = await fetch(`https://gamma-api.polymarket.com/markets/${firstMarket.conditionId}`);
    console.log(`Status: ${testResponse.status}`);

    if (testResponse.ok) {
      const data = await testResponse.json();
      console.log(`✅ SUCCESS! Got market: ${data.question}`);
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  }

  // Try fetching by ID instead
  console.log(`\n🔬 Testing fetch by id: ${firstMarket.id}\n`);

  try {
    const testResponse = await fetch(`https://gamma-api.polymarket.com/markets/${firstMarket.id}`);
    console.log(`Status: ${testResponse.status}`);

    if (testResponse.ok) {
      const data = await testResponse.json();
      console.log(`✅ SUCCESS! Got market: ${data.question}`);
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testGammaAPI().catch(console.error);
