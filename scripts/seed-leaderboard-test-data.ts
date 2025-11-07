import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding test leaderboard data...')

  // Create test users and payouts
  const testUsers = [
    {
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      payouts: [
        { amount: 1500.50, date: new Date('2025-10-15'), txHash: '0xabc1', blockNumber: 1000001 },
        { amount: 2200.75, date: new Date('2025-10-20'), txHash: '0xabc2', blockNumber: 1000002 },
        { amount: 1800.25, date: new Date('2025-10-25'), txHash: '0xabc3', blockNumber: 1000003 },
      ],
    },
    {
      walletAddress: '0x2345678901bcdef23456789012bcdef234567890',
      payouts: [
        { amount: 1200.00, date: new Date('2025-10-16'), txHash: '0xbcd1', blockNumber: 1000004 },
        { amount: 1400.50, date: new Date('2025-10-22'), txHash: '0xbcd2', blockNumber: 1000005 },
      ],
    },
    {
      walletAddress: '0x3456789012cdef345678901234cdef3456789012',
      payouts: [
        { amount: 3500.00, date: new Date('2025-10-18'), txHash: '0xcde1', blockNumber: 1000006 },
        { amount: 1500.00, date: new Date('2025-10-24'), txHash: '0xcde2', blockNumber: 1000007 },
      ],
    },
    {
      walletAddress: '0x456789012def4567890123def45678901234def4',
      payouts: [
        { amount: 800.25, date: new Date('2025-10-17'), txHash: '0xdef1', blockNumber: 1000008 },
        { amount: 950.75, date: new Date('2025-10-23'), txHash: '0xdef2', blockNumber: 1000009 },
      ],
    },
    {
      walletAddress: '0x56789012ef567890123ef567890123456ef56789',
      payouts: [
        { amount: 2500.00, date: new Date('2025-10-19'), txHash: '0xef01', blockNumber: 1000010 },
      ],
    },
  ]

  for (const testUser of testUsers) {
    // Create user
    const user = await prisma.user.upsert({
      where: { walletAddress: testUser.walletAddress },
      update: {},
      create: {
        walletAddress: testUser.walletAddress,
      },
    })

    console.log(`✅ Created/found user: ${user.walletAddress.slice(0, 10)}...`)

    // Create payouts
    for (const payout of testUser.payouts) {
      await prisma.payout.upsert({
        where: { txHash: payout.txHash },
        update: {},
        create: {
          userId: user.id,
          amount: payout.amount,
          date: payout.date,
          txHash: payout.txHash,
          blockNumber: payout.blockNumber,
          verified: true, // Mark as verified so they show up in leaderboard
        },
      })
    }

    console.log(`   💰 Created ${testUser.payouts.length} payouts`)
  }

  // Calculate totals for verification
  const leaderboardData = await prisma.payout.groupBy({
    by: ['userId'],
    _sum: {
      amount: true,
    },
    where: {
      verified: true,
    },
    orderBy: {
      _sum: {
        amount: 'desc',
      },
    },
  })

  console.log('\n📊 Leaderboard Preview:')
  for (let i = 0; i < leaderboardData.length; i++) {
    const user = await prisma.user.findUnique({
      where: { id: leaderboardData[i].userId },
    })
    console.log(
      `   #${i + 1}: ${user?.walletAddress.slice(0, 10)}... - $${leaderboardData[i]._sum.amount?.toFixed(2)}`
    )
  }

  console.log('\n✅ Test data seeded successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
