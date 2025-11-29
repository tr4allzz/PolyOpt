import { NextResponse } from 'next/server'
import { getLeaderboardData, getCacheMetadata } from '@/lib/leaderboard-cache'
import { LeaderboardEntry } from '@/lib/dune-leaderboard'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Filter parameters
    const search = searchParams.get('search')?.toLowerCase() || ''
    const minRewards = parseFloat(searchParams.get('minRewards') || '0')
    const maxRewards = parseFloat(searchParams.get('maxRewards') || '0')
    const minPayouts = parseInt(searchParams.get('minPayouts') || '0')
    const rankRange = parseInt(searchParams.get('rankRange') || '0')
    const sortBy = searchParams.get('sortBy') || ''
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    let allData = getLeaderboardData()
    const metadata = getCacheMetadata()

    // Apply filters
    let filteredData = allData.filter((entry) => {
      // Search filter (wallet address)
      if (search && !entry.walletAddress.toLowerCase().includes(search)) {
        return false
      }

      // Rank range filter
      if (rankRange > 0 && entry.rank > rankRange) {
        return false
      }

      // Min rewards filter
      if (minRewards > 0 && entry.totalRewards < minRewards) {
        return false
      }

      // Max rewards filter
      if (maxRewards > 0 && entry.totalRewards > maxRewards) {
        return false
      }

      // Min payouts filter
      if (minPayouts > 0 && entry.payoutCount < minPayouts) {
        return false
      }

      return true
    })

    // Apply sorting
    // "High to Low" (default/desc) means: best performers first
    // - For rank: 1, 2, 3... (lower rank number = better)
    // - For rewards: highest first
    // - For payouts: highest first
    filteredData = [...filteredData].sort((a, b) => {
      const isAscending = sortOrder === 'asc'

      switch (sortBy) {
        case 'rewards':
          // High to Low = highest rewards first (descending)
          return isAscending
            ? a.totalRewards - b.totalRewards
            : b.totalRewards - a.totalRewards
        case 'payouts':
          // High to Low = most payouts first (descending)
          return isAscending
            ? a.payoutCount - b.payoutCount
            : b.payoutCount - a.payoutCount
        default:
          // Sort by rank: High to Low = best rank first (1, 2, 3 = ascending by number)
          return isAscending
            ? b.rank - a.rank  // Low to High = worst ranks first
            : a.rank - b.rank  // High to Low = best ranks first (1, 2, 3...)
      }
    })

    // Calculate summary stats from filtered data
    const totalEarnings = filteredData.reduce((sum, entry) => sum + entry.totalRewards, 0)
    const averageReward = filteredData.length > 0 ? totalEarnings / filteredData.length : 0

    // Apply pagination after filtering
    const paginatedData = filteredData.slice(offset, offset + limit)

    return NextResponse.json({
      entries: paginatedData,
      summary: {
        totalLPs: filteredData.length,
        totalEarnings,
        averageReward,
        lastUpdated: metadata.lastUpdated,
      },
      pagination: {
        limit,
        offset,
        total: filteredData.length,
        hasMore: offset + limit < filteredData.length,
      },
    })
  } catch (error: any) {
    console.error('Leaderboard API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
