/**
 * Manual Leaderboard Sync Script
 *
 * Run this to manually sync leaderboard data from Dune
 * Usage: npm run sync-leaderboard
 */

import { config } from 'dotenv'
import { fetchDuneLeaderboard, convertToLeaderboardFormat } from '../lib/dune-leaderboard'
import fs from 'fs'
import path from 'path'

// Load environment variables
config()

const CACHE_FILE_PATH = path.join(process.cwd(), 'data', 'leaderboard-cache.json')

async function main() {
  console.log('🔄 Syncing leaderboard data from Dune Analytics...\n')

  try {
    // Fetch data from Dune
    console.log('📡 Fetching data from Dune...')
    const duneData = await fetchDuneLeaderboard()
    const leaderboardData = convertToLeaderboardFormat(duneData)

    console.log(`✓ Fetched ${leaderboardData.length} leaderboard entries\n`)

    // Ensure data directory exists
    const dataDir = path.dirname(CACHE_FILE_PATH)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
      console.log(`✓ Created data directory: ${dataDir}`)
    }

    // Save to cache file with timestamp
    const cacheData = {
      data: leaderboardData,
      lastUpdated: new Date().toISOString(),
      total: leaderboardData.length,
    }

    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cacheData, null, 2))
    console.log(`✓ Saved to: ${CACHE_FILE_PATH}`)

    console.log('\n' + '='.repeat(60))
    console.log('✅ Leaderboard sync completed!')
    console.log('='.repeat(60))
    console.log(`   Total entries:      ${leaderboardData.length}`)
    console.log(`   Last updated:       ${cacheData.lastUpdated}`)
    console.log(`   Top trader:         ${leaderboardData[0]?.walletAddress.slice(0, 10)}...`)
    console.log(`   Top trader rewards: $${leaderboardData[0]?.totalRewards.toLocaleString()}`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ Error syncing leaderboard:', error)
    process.exit(1)
  }
}

main()
