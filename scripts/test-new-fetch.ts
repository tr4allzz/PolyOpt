// scripts/test-new-fetch.ts
// Test the new fetchRewardMarkets function

import { fetchRewardMarkets } from '../lib/polymarket/client';

async function test() {
  console.log('🧪 Testing new fetchRewardMarkets...\n');

  try {
    const markets = await fetchRewardMarkets();

    console.log(`✅ Got ${markets.length} markets\n`);

    if (markets.length > 0) {
      console.log('Sample market:');
      const m = markets[0];
      console.log(`  Question: ${m.question}`);
      console.log(`  ID: ${m.id}`);
      console.log(`  Reward Pool: $${m.rewardPool}/day`);
      console.log(`  Min Size: ${m.minSize}`);
      console.log(`  Max Spread: ${m.maxSpread}`);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

test();
