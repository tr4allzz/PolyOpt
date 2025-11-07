import { NextRequest, NextResponse } from 'next/server'
import { fetchDuneLeaderboard, convertToLeaderboardFormat } from '@/lib/dune-leaderboard'
import fs from 'fs'
import path from 'path'

const CACHE_FILE_PATH = path.join(process.cwd(), 'data', 'leaderboard-cache.json')

/**
 * Cron job endpoint to sync leaderboard data from Dune
 * Call this endpoint once per day to refresh the leaderboard
 *
 * Can be triggered by:
 * - Vercel Cron Jobs
 * - External cron service (cron-job.org, EasyCron, etc.)
 * - Manual trigger via curl/browser
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔄 Starting leaderboard sync from Dune...')

    // Fetch data from Dune
    const duneData = await fetchDuneLeaderboard()
    const leaderboardData = convertToLeaderboardFormat(duneData)

    // Ensure data directory exists
    const dataDir = path.dirname(CACHE_FILE_PATH)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    // Save to cache file with timestamp
    const cacheData = {
      data: leaderboardData,
      lastUpdated: new Date().toISOString(),
      total: leaderboardData.length,
    }

    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cacheData, null, 2))

    console.log(`✓ Synced ${leaderboardData.length} leaderboard entries`)

    return NextResponse.json({
      success: true,
      message: 'Leaderboard synced successfully',
      total: leaderboardData.length,
      lastUpdated: cacheData.lastUpdated,
    })
  } catch (error) {
    console.error('❌ Leaderboard sync error:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync leaderboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
