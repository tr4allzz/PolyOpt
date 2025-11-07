// scripts/compare-gamma-vs-clob.ts
// Compare markets with reward parameters vs markets with ACTUAL active rewards

async function compareAPIs() {
  console.log('🔍 Comparing Gamma API vs CLOB API for rewards...\n');

  // Fetch from Gamma API (markets with reward parameters)
  const gammaResponse = await fetch('https://gamma-api.polymarket.com/markets?closed=false&active=true&limit=100');
  const gammaMarkets = await gammaResponse.json();

  const gammaWithParams = gammaMarkets.filter((m: any) =>
    m.rewardsMinSize > 0 && m.rewardsMaxSpread > 0
  );

  console.log(`📊 Gamma API: ${gammaWithParams.length} markets with reward PARAMETERS\n`);

  // Fetch from CLOB API (markets with ACTUAL active rewards)
  const clobResponse = await fetch('https://clob.polymarket.com/sampling-simplified-markets');
  const clobData = await clobResponse.json();

  const clobWithRewards = clobData.data.filter((m: any) => m.rewards);

  console.log(`💰 CLOB API: ${clobWithRewards.length} markets with ACTUAL active rewards\n`);

  // Compare overlap
  const gammaConditionIds = new Set(
    gammaWithParams.map((m: any) => m.conditionId).filter((id: any) => id)
  );

  const clobConditionIds = new Set(
    clobWithRewards.map((m: any) => m.condition_id)
  );

  let inBoth = 0;
  let onlyInGamma = 0;
  let onlyInClob = 0;

  console.log('📋 Analysis:\n');

  // Markets in Gamma but not in CLOB (have params but NO active rewards)
  console.log('⚠️  Markets with reward PARAMETERS but NO active rewards:');
  let count = 0;
  gammaWithParams.forEach((m: any) => {
    if (m.conditionId && !clobConditionIds.has(m.conditionId)) {
      onlyInGamma++;
      if (count < 10) {
        console.log(`   ${count + 1}. ${m.question}`);
        console.log(`      rewardsMinSize: ${m.rewardsMinSize}, rewardsMaxSpread: ${m.rewardsMaxSpread}`);
        console.log(`      ❌ NOT in CLOB rewards API - NO ACTUAL REWARDS`);
      }
      count++;
    } else if (m.conditionId && clobConditionIds.has(m.conditionId)) {
      inBoth++;
    }
  });
  if (count > 10) {
    console.log(`   ... and ${count - 10} more\n`);
  } else {
    console.log();
  }

  // Markets in CLOB (these have ACTUAL rewards)
  console.log('✅ Markets with ACTUAL active rewards in CLOB:');
  clobWithRewards.slice(0, 10).forEach((m: any, i: number) => {
    const gammaMarket = gammaMarkets.find((gm: any) => gm.conditionId === m.condition_id);
    console.log(`   ${i + 1}. ${gammaMarket ? gammaMarket.question : m.condition_id}`);
    if (m.rewards && m.rewards.rates) {
      console.log(`      Daily Rate: $${m.rewards.rates[0]?.rewards_daily_rate || 'N/A'}`);
      console.log(`      Min Size: ${m.rewards.min_size}, Max Spread: ${m.rewards.max_spread}`);
    }
  });
  console.log();

  console.log(`\n📊 Summary:`);
  console.log(`   Markets in BOTH (have params AND active rewards): ${inBoth}`);
  console.log(`   Markets ONLY in Gamma (params but NO active rewards): ${onlyInGamma}`);
  console.log(`   Markets ONLY in CLOB (active rewards): ${clobWithRewards.length - inBoth}`);

  console.log(`\n💡 Conclusion:`);
  console.log(`   We should ONLY show the ${clobWithRewards.length} markets from CLOB API`);
  console.log(`   These are the ones with ACTUAL active rewards RIGHT NOW`);
}

compareAPIs().catch(console.error);
