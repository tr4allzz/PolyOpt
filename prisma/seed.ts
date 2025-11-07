// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create sample markets
  await prisma.market.create({
    data: {
      id: 'trump-2024',
      question: 'Will Donald Trump win the 2024 US Presidential Election?',
      description: 'This market will resolve to "Yes" if Donald Trump wins the 2024 US Presidential Election.',
      maxSpread: 0.03,
      minSize: 100,
      rewardPool: 240.50,
      midpoint: 0.552,
      volume: 45000000,
      liquidity: 2000000,
      endDate: new Date('2024-11-05'),
      active: true,
      resolved: false,
    },
  });

  await prisma.market.create({
    data: {
      id: 'btc-100k-2024',
      question: 'Will Bitcoin reach $100,000 in 2024?',
      description: 'This market resolves Yes if BTC/USD reaches or exceeds $100,000 on any major exchange in 2024.',
      maxSpread: 0.025,
      minSize: 75,
      rewardPool: 320.75,
      midpoint: 0.68,
      volume: 28000000,
      liquidity: 1500000,
      endDate: new Date('2024-12-31'),
      active: true,
      resolved: false,
    },
  });

  await prisma.market.create({
    data: {
      id: 'eth-etf-2024',
      question: 'Will an Ethereum spot ETF be approved in 2024?',
      description: 'Resolves Yes if the SEC approves a spot Ethereum ETF in 2024.',
      maxSpread: 0.03,
      minSize: 100,
      rewardPool: 195.25,
      midpoint: 0.82,
      volume: 18500000,
      liquidity: 1200000,
      endDate: new Date('2024-12-31'),
      active: true,
      resolved: false,
    },
  });

  await prisma.market.create({
    data: {
      id: 'fed-rate-cut-2024',
      question: 'Will the Federal Reserve cut rates by 0.5% or more in 2024?',
      description: 'Resolves Yes if the Fed cuts rates by at least 50 basis points cumulatively in 2024.',
      maxSpread: 0.02,
      minSize: 50,
      rewardPool: 280.00,
      midpoint: 0.45,
      volume: 35000000,
      liquidity: 1800000,
      endDate: new Date('2024-12-31'),
      active: true,
      resolved: false,
    },
  });

  await prisma.market.create({
    data: {
      id: 'ai-agi-2025',
      question: 'Will AGI be achieved by end of 2025?',
      description: 'This market resolves Yes if a credible AI research organization announces AGI.',
      maxSpread: 0.02,
      minSize: 50,
      rewardPool: 180.00,
      midpoint: 0.15,
      volume: 12000000,
      liquidity: 800000,
      endDate: new Date('2025-12-31'),
      active: true,
      resolved: false,
    },
  });

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
