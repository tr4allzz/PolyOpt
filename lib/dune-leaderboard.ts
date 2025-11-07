/**
 * Dune Analytics Leaderboard Utility
 *
 * Fetches leaderboard data directly from Dune Analytics API
 */

export interface DuneLeaderboardEntry {
  rank: number
  recipient: string
  total_usdc_sent: number
  percent_of_total: number
}

export interface LeaderboardEntry {
  rank: number
  walletAddress: string
  totalRewards: number
  payoutCount: number
  memberSince: string | null
}

// Query ID for Polymarket aggregated rewards leaderboard
const LEADERBOARD_QUERY_ID = 4851338

/**
 * Fetch leaderboard data from Dune Analytics
 */
export async function fetchDuneLeaderboard(): Promise<DuneLeaderboardEntry[]> {
  const apiKey = process.env.DUNE_API_KEY

  if (!apiKey) {
    throw new Error('DUNE_API_KEY not configured')
  }

  const url = `https://api.dune.com/api/v1/query/${LEADERBOARD_QUERY_ID}/results/csv`

  const response = await fetch(url, {
    headers: {
      'X-Dune-API-Key': apiKey,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid Dune API key')
    } else if (response.status === 404) {
      throw new Error(`Dune query ${LEADERBOARD_QUERY_ID} not found`)
    } else {
      throw new Error(`Dune API error: ${response.status} ${response.statusText}`)
    }
  }

  const csvText = await response.text()

  // Parse CSV
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length === 0) {
    return []
  }

  // Skip header
  const dataLines = lines.slice(1)
  const records: DuneLeaderboardEntry[] = []

  for (const line of dataLines) {
    const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''))

    // Parse: rank, wallet, total_amount, percentage
    if (parts.length >= 3 && parts[1] && parts[2]) {
      try {
        records.push({
          rank: parseInt(parts[0]),
          recipient: parts[1].toLowerCase(),
          total_usdc_sent: parseFloat(parts[2]),
          percent_of_total: parseFloat(parts[3] || '0'),
        })
      } catch (err) {
        // Skip malformed lines
        continue
      }
    }
  }

  return records
}

/**
 * Convert Dune data to leaderboard format
 */
export function convertToLeaderboardFormat(duneData: DuneLeaderboardEntry[]): LeaderboardEntry[] {
  return duneData.map(entry => ({
    rank: entry.rank,
    walletAddress: entry.recipient,
    totalRewards: entry.total_usdc_sent,
    // We don't have payout count in aggregated data, estimate as 1 per $1000
    payoutCount: Math.max(1, Math.floor(entry.total_usdc_sent / 1000)),
    // We don't have first payout date in aggregated data
    memberSince: null,
  }))
}
