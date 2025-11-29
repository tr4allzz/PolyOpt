/**
 * Position Service
 *
 * Business logic for managing user positions
 * Extracted from API routes for better testability and reusability
 */

import { prisma } from '@/lib/prisma'
import { Position, Market } from '@prisma/client'

export interface PositionWithMarket extends Position {
  market: Market
}

export interface PositionSummary {
  totalMarkets: number
  totalDailyReward: number
  totalCapital: number
  avgQScore: number
}

/**
 * Get all positions for a user with market details
 */
export async function getUserPositions(
  walletAddress: string
): Promise<{ positions: PositionWithMarket[]; summary: PositionSummary }> {
  // Find user
  const user = await prisma.user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
  })

  if (!user) {
    return {
      positions: [],
      summary: {
        totalMarkets: 0,
        totalDailyReward: 0,
        totalCapital: 0,
        avgQScore: 0,
      },
    }
  }

  // Fetch positions with markets
  const positions = await prisma.position.findMany({
    where: { userId: user.id },
    include: {
      market: true,
    },
    orderBy: {
      estimatedDaily: 'desc',
    },
  })

  // Calculate summary
  const summary: PositionSummary = {
    totalMarkets: positions.length,
    totalDailyReward: positions.reduce((sum, p) => sum + p.estimatedDaily, 0),
    totalCapital: positions.reduce((sum, p) => sum + p.capitalDeployed, 0),
    avgQScore:
      positions.length > 0
        ? positions.reduce((sum, p) => sum + p.qMin, 0) / positions.length
        : 0,
  }

  return { positions, summary }
}

/**
 * Create or update a position
 */
export async function upsertPosition(
  walletAddress: string,
  marketId: string,
  data: {
    qOne: number
    qTwo: number
    qMin: number
    estimatedDaily: number
    userShare: number
    competitionQMin: number
    capitalDeployed: number
    orderCount: number
  }
): Promise<Position> {
  // Find or create user
  const user = await prisma.user.upsert({
    where: { walletAddress: walletAddress.toLowerCase() },
    update: {},
    create: {
      walletAddress: walletAddress.toLowerCase(),
      tier: 'FREE',
    },
  })

  // Upsert position
  const position = await prisma.position.upsert({
    where: {
      userId_marketId: {
        userId: user.id,
        marketId: marketId,
      },
    },
    update: {
      ...data,
      calculatedAt: new Date(),
    },
    create: {
      userId: user.id,
      marketId: marketId,
      ...data,
      calculatedAt: new Date(),
    },
  })

  return position
}

/**
 * Delete a position
 */
export async function deletePosition(
  walletAddress: string,
  marketId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
  })

  if (!user) {
    return false
  }

  await prisma.position.delete({
    where: {
      userId_marketId: {
        userId: user.id,
        marketId: marketId,
      },
    },
  })

  return true
}

/**
 * Get position health metrics
 */
export async function getPositionHealth(walletAddress: string): Promise<{
  activePositions: number
  inactiveMarkets: number
  lowPerformingCount: number
  healthScore: number
}> {
  const { positions } = await getUserPositions(walletAddress)

  const activePositions = positions.filter((p) => p.market.active).length
  const inactiveMarkets = positions.filter((p) => !p.market.active).length

  // Low performing: Q-score below 1.0 or estimated daily < $0.50
  const lowPerformingCount = positions.filter(
    (p) => p.qMin < 1.0 || p.estimatedDaily < 0.5
  ).length

  // Health score: 0-100
  // Factors: active positions (good), inactive markets (bad), low performing (bad)
  const healthScore = Math.max(
    0,
    Math.min(
      100,
      100 -
        inactiveMarkets * 10 -
        lowPerformingCount * 5 +
        Math.min(activePositions * 5, 50)
    )
  )

  return {
    activePositions,
    inactiveMarkets,
    lowPerformingCount,
    healthScore,
  }
}
