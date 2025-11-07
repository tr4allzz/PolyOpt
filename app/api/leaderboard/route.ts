import { NextRequest, NextResponse } from 'next/server'
import { getLeaderboardData, getCacheMetadata } from '@/lib/leaderboard-cache'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || ''
    const minRewards = searchParams.get('minRewards') ? parseFloat(searchParams.get('minRewards')!) : undefined
    const minPayouts = searchParams.get('minPayouts') ? parseInt(searchParams.get('minPayouts')!) : undefined

    // Get leaderboard data from file cache (updated daily by cron)
    const allData = getLeaderboardData()
    const cacheInfo = getCacheMetadata()

    // Apply search filter
    let filteredData = allData
    if (search) {
      filteredData = filteredData.filter(entry =>
        entry.walletAddress.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Apply min rewards filter
    if (minRewards) {
      filteredData = filteredData.filter(entry => entry.totalRewards >= minRewards)
    }

    // Apply min payouts filter
    if (minPayouts) {
      filteredData = filteredData.filter(entry => entry.payoutCount >= minPayouts)
    }

    // Calculate total after filtering
    const total = filteredData.length

    // Apply pagination
    const paginatedData = filteredData.slice(offset, offset + limit)

    // Re-rank for display (based on filtered results)
    const leaderboard = paginatedData.map((entry, index) => ({
      ...entry,
      rank: offset + index + 1,
    }))

    return NextResponse.json({
      leaderboard,
      total,
      limit,
      offset,
      lastUpdated: cacheInfo.lastUpdated,
    })
  } catch (error) {
    console.error('Leaderboard API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data' },
      { status: 500 }
    )
  }
}
