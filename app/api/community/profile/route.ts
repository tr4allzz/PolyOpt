export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { API_ENDPOINTS } from '@/lib/constants'
import { getLeaderboardData } from '@/lib/leaderboard-cache'

interface Position {
  asset: string
  market: string
  title: string
  outcome: string
  size: number
  avgPrice: number
  currentPrice: number
  currentValue: number
  cashPnl: number
  percentPnl: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }

    // Normalize address
    const normalizedAddress = address.toLowerCase()

    // Fetch data in parallel
    const [positionsData, leaderboardEntry] = await Promise.all([
      fetchPositions(normalizedAddress),
      getLeaderboardEntry(normalizedAddress),
    ])

    // Use leaderboard data for total rewards (accurate from Dune)
    const totalRewards = leaderboardEntry?.totalRewards ?? 0
    const rewardCount = leaderboardEntry?.payoutCount ?? 0

    // Calculate positions summary
    const totalValue = positionsData.reduce((sum, p) => sum + p.currentValue, 0)
    const totalPnl = positionsData.reduce((sum, p) => sum + p.cashPnl, 0)

    return NextResponse.json({
      address: normalizedAddress,
      summary: {
        totalRewards,
        rewardCount,
        rank: leaderboardEntry?.rank || null,
        totalLPs: leaderboardEntry?.totalLPs || null,
        positionValue: totalValue,
        positionPnl: totalPnl,
        activePositions: positionsData.length,
      },
      positions: positionsData.slice(0, 10),
    })
  } catch (error: any) {
    console.error('Profile API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

async function fetchPositions(address: string): Promise<Position[]> {
  try {
    const url = `${API_ENDPOINTS.DATA_API}/positions?user=${address}&limit=100&sortBy=currentValue&sortOrder=desc`
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      console.error('Positions fetch failed:', response.status)
      return []
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return []
    }

    return data
      .filter((item: any) => !item.redeemable && parseFloat(item.currentValue || 0) > 0)
      .map((item: any) => ({
        asset: item.asset || item.id,
        market: item.market || item.conditionId,
        title: item.title || item.question || 'Unknown Market',
        outcome: item.outcome || (item.side === 'YES' ? 'Yes' : 'No'),
        size: parseFloat(item.size || 0),
        avgPrice: parseFloat(item.avgPrice || 0),
        currentPrice: parseFloat(item.curPrice || item.currentPrice || 0),
        currentValue: parseFloat(item.currentValue || 0),
        cashPnl: parseFloat(item.cashPnl || 0),
        percentPnl: parseFloat(item.percentPnl || 0),
      }))
  } catch (error) {
    console.error('Error fetching positions:', error)
    return []
  }
}

interface LeaderboardEntryData {
  rank: number
  totalLPs: number
  totalRewards: number
  payoutCount: number
}

async function getLeaderboardEntry(address: string): Promise<LeaderboardEntryData | null> {
  try {
    const leaderboard = getLeaderboardData()
    const totalLPs = leaderboard.length

    const entry = leaderboard.find(
      (e) => e.walletAddress.toLowerCase() === address.toLowerCase()
    )

    if (entry) {
      return {
        rank: entry.rank,
        totalLPs,
        totalRewards: entry.totalRewards,
        payoutCount: entry.payoutCount,
      }
    }

    return null
  } catch (error) {
    console.error('Error getting leaderboard entry:', error)
    return null
  }
}
