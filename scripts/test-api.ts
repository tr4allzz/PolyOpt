// scripts/test-api.ts
async function main() {
  const response = await fetch('http://localhost:3001/api/markets?limit=3');
  const data = await response.json();

  console.log('📊 Markets API Response:\n');
  data.markets.forEach((m: any) => {
    console.log(`${m.question}`);
    console.log(`  ID: ${m.id}`);
    console.log(`  Reward Pool: $${m.rewardPool}`);
    console.log(`  Max Spread: ${m.maxSpread}`);
    console.log(`  Min Size: ${m.minSize}`);
    console.log(`  Volume: $${m.volume.toLocaleString()}`);
    console.log('');
  });

  console.log(`Total markets: ${data.total}`);
}

main().catch(console.error);
