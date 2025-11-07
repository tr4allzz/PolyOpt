// scripts/cleanup-stale-markets.ts
// Remove markets that no longer exist in Polymarket API

import { prisma } from '../lib/prisma';

async function cleanupStaleMarkets() {
  console.log('🧹 Cleaning up stale markets...\n');

  const allMarkets = await prisma.market.findMany({
    select: {
      id: true,
      question: true,
      active: true,
    },
  });

  console.log(`📊 Checking ${allMarkets.length} markets...\n`);

  let removed = 0;
  let kept = 0;
  let errors = 0;

  for (const market of allMarkets) {
    try {
      const response = await fetch(`https://gamma-api.polymarket.com/markets/${market.id}`);

      if (response.status === 404 || response.status === 422) {
        console.log(`❌ REMOVING: ${market.question}`);
        console.log(`   Reason: API returned ${response.status}`);

        // Delete snapshots first (foreign key constraint)
        await prisma.marketSnapshot.deleteMany({
          where: { marketId: market.id },
        });

        // Delete positions
        await prisma.position.deleteMany({
          where: { marketId: market.id },
        });

        // Delete market
        await prisma.market.delete({
          where: { id: market.id },
        });

        removed++;
        console.log('   ✅ Deleted\n');
      } else if (response.ok) {
        const data = await response.json();

        // Check if market still has rewards
        const hasRewards = data.rewardsMinSize > 0 && data.rewardsMaxSpread > 0;

        if (!hasRewards && market.active) {
          console.log(`⚠️  DEACTIVATING: ${market.question}`);
          console.log(`   Reason: No longer has rewards`);

          await prisma.market.update({
            where: { id: market.id },
            data: { active: false, rewardPool: 0 },
          });

          console.log('   ✅ Marked inactive\n');
        }

        kept++;
      } else {
        console.log(`⚠️  Keeping: ${market.question} (status: ${response.status})`);
        errors++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      console.log(`❌ Error checking ${market.question}: ${error.message}`);
      errors++;
    }
  }

  console.log(`\n📈 Cleanup Summary:`);
  console.log(`   Markets removed: ${removed}`);
  console.log(`   Markets kept: ${kept}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total: ${allMarkets.length}`);

  await prisma.$disconnect();
}

cleanupStaleMarkets().catch(console.error);
