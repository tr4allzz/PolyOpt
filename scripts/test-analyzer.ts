// scripts/test-analyzer.ts
// Test the market analyzer for small capital

async function testAnalyzer() {
  console.log('🔍 Testing Best Markets Analyzer\n');

  const capital = 100; // $100 test

  console.log(`💰 Finding best markets for $${capital}...\n`);

  const response = await fetch('http://localhost:3001/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ capital, limit: 10 }),
  });

  const data = await response.json();

  if (data.error) {
    console.error('❌ Error:', data.error);
    return;
  }

  console.log(`📊 Summary:`);
  console.log(`   Best ROI: ${data.summary.bestROI.toFixed(1)}% APY`);
  console.log(`   Best Daily: $${data.summary.bestDailyReward.toFixed(2)}/day`);
  console.log(`   Avg Competition: ${data.summary.averageCompetition.toFixed(0)} Q_min\n`);

  console.log(`✅ Top ${data.opportunities.length} Opportunities:\n`);

  data.opportunities.forEach((opp: any, i: number) => {
    console.log(`${i + 1}. ${opp.question}`);
    console.log(`   💰 Reward Pool: $${opp.rewardPool}/day`);
    console.log(`   📊 Competition: ${opp.competitionLevel} (${opp.estimatedCompetition.toFixed(0)} Q_min)`);
    console.log(`   💵 Your Daily: $${opp.estimatedDailyReward.toFixed(2)}/day`);
    console.log(`   📈 ROI: ${opp.roi.toFixed(1)}% APY`);
    console.log(`   ⚡ Efficiency: ${(opp.capitalEfficiency * 100).toFixed(3)}% daily`);
    console.log(`   💡 Recommended Capital: $${opp.recommendedCapital.toFixed(0)}`);
    console.log();
  });

  // Test specific market analysis
  if (data.opportunities.length > 0) {
    const topMarket = data.opportunities[0];
    console.log(`\n🔬 Detailed Analysis of Top Market:\n`);

    const detailResponse = await fetch('http://localhost:3001/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capital, marketId: topMarket.marketId }),
    });

    const detailData = await detailResponse.json();

    if (detailData.opportunity) {
      const opp = detailData.opportunity;
      console.log(`Market: ${opp.question}`);
      console.log(`\nWith $${capital}:`);
      console.log(`  Expected Daily: $${opp.estimatedDailyReward.toFixed(2)}`);
      console.log(`  Expected Monthly: $${(opp.estimatedDailyReward * 30).toFixed(2)}`);
      console.log(`  Expected Yearly: $${(opp.estimatedDailyReward * 365).toFixed(2)}`);
      console.log(`  ROI: ${opp.roi.toFixed(1)}% APY`);
      console.log(`\nCompetition Analysis:`);
      console.log(`  Level: ${opp.competitionLevel}`);
      console.log(`  Estimated Total Q_min: ${opp.estimatedCompetition.toFixed(0)}`);
      console.log(`  Your Share: ${((opp.estimatedDailyReward / opp.rewardPool) * 100).toFixed(2)}%`);
      console.log(`\nRecommendation:`);
      if (capital >= opp.recommendedCapital) {
        console.log(`  ✅ Your $${capital} is sufficient for this market`);
      } else {
        console.log(`  ⚠️  Consider $${opp.recommendedCapital.toFixed(0)} for better competitiveness`);
      }
    }
  }
}

testAnalyzer().catch(console.error);
