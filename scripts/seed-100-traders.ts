import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function generateRandomAddress(): string {
  const chars = '0123456789abcdef'
  let address = '0x'
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)]
  }
  return address
}

function generateRandomAmount(): number {
  return Math.floor(Math.random() * 5000) + 100
}

async function main() {
  console.log('🌱 Seeding 100 traders with rewards...')

  // Keep existing 5 traders, add 95 more
  const tradersToAdd = 95

  for (let i = 0; i < tradersToAdd; i++) {
    const walletAddress = generateRandomAddress()

    // Create user
    const user = await prisma.user.create({
      data: {
        walletAddress,
      },
    })

    // Generate 1-5 random payouts per user
    const numPayouts = Math.floor(Math.random() * 5) + 1

    for (let j = 0; j < numPayouts; j++) {
      const date = new Date()
      date.setDate(date.getDate() - Math.floor(Math.random() * 30)) // Random date in last 30 days

      await prisma.payout.create({
        data: {
          userId: user.id,
          amount: generateRandomAmount(),
          date,
          txHash: `0x${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
          blockNumber: 1000000 + Math.floor(Math.random() * 100000),
          verified: true,
        },
      })
    }

    if ((i + 1) % 10 === 0) {
      console.log(`   ✅ Created ${i + 1}/${tradersToAdd} traders...`)
    }
  }

  console.log('\n📊 Calculating final leaderboard...')

  const leaderboardData = await prisma.payout.groupBy({
    by: ['userId'],
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
    where: {
      verified: true,
    },
    orderBy: {
      _sum: {
        amount: 'desc',
      },
    },
    take: 10,
  })

  console.log('\n🏆 Top 10 Traders:')
  for (let i = 0; i < leaderboardData.length; i++) {
    const user = await prisma.user.findUnique({
      where: { id: leaderboardData[i].userId },
    })
    console.log(
      `   #${i + 1}: ${user?.walletAddress.slice(0, 10)}... - $${leaderboardData[i]._sum.amount?.toFixed(2)} (${leaderboardData[i]._count.id} payouts)`
    )
  }

  const totalTraders = await prisma.user.count()
  console.log(`\n✅ Total traders in database: ${totalTraders}`)
  console.log('✅ Seeding complete!')
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
