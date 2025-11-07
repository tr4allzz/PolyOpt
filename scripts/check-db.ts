// scripts/check-db.ts
import { prisma } from '../lib/prisma';

async function main() {
  const markets = await prisma.market.findMany({
    take: 5,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      question: true,
      maxSpread: true,
      minSize: true,
      rewardPool: true,
      updatedAt: true,
    },
  });

  console.log('📊 Recent markets in database:');
  console.log(JSON.stringify(markets, null, 2));

  const count = await prisma.market.count();
  console.log(`\n📈 Total markets: ${count}`);

  await prisma.$disconnect();
}

main().catch(console.error);
