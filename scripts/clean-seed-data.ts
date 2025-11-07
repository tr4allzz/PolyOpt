// scripts/clean-seed-data.ts
import { prisma } from '../lib/prisma';

async function main() {
  console.log('🧹 Cleaning seed data...');

  // Delete seed market snapshots first (foreign key constraint)
  const deletedSnapshots = await prisma.marketSnapshot.deleteMany({
    where: {
      marketId: {
        not: {
          startsWith: '0x'
        }
      }
    }
  });

  console.log(`  Deleted ${deletedSnapshots.count} seed market snapshots`);

  // Delete seed markets (IDs that don't start with 0x)
  const deletedMarkets = await prisma.market.deleteMany({
    where: {
      id: {
        not: {
          startsWith: '0x'
        }
      }
    }
  });

  console.log(`  Deleted ${deletedMarkets.count} seed markets`);

  const remaining = await prisma.market.count();
  console.log(`\n✅ Database cleaned. ${remaining} real Polymarket markets remaining.`);

  await prisma.$disconnect();
}

main().catch(console.error);
