// scripts/clear-and-resync.ts
// Clear all markets and re-sync with correct IDs

import { prisma } from '../lib/prisma';

async function clearAndResync() {
  console.log('🗑️  Clearing all markets...\n');

  // Delete all snapshots first
  const deletedSnapshots = await prisma.marketSnapshot.deleteMany();
  console.log(`   Deleted ${deletedSnapshots.count} snapshots`);

  // Delete all positions
  const deletedPositions = await prisma.position.deleteMany();
  console.log(`   Deleted ${deletedPositions.count} positions`);

  // Delete all markets
  const deletedMarkets = await prisma.market.deleteMany();
  console.log(`   Deleted ${deletedMarkets.count} markets\n`);

  console.log('✅ Database cleared\n');
  console.log('🔄 Now trigger sync with: curl -X POST http://localhost:3001/api/sync\n');

  await prisma.$disconnect();
}

clearAndResync().catch(console.error);
