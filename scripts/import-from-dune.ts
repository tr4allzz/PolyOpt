/**
 * Import Liquidity Rewards Directly from Dune Analytics API
 *
 * This script fetches reward data directly from Dune API as CSV.
 *
 * Setup:
 * 1. Create query on Dune (see README_LEADERBOARD.md for SQL)
 * 2. Get free API key from https://dune.com/settings/api
 * 3. Add to .env: DUNE_API_KEY="your_key_here"
 * 4. Update QUERY_ID below with your query ID
 * 5. Run: npm run import-rewards
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Dune query ID for Polymarket rewards
// This works with aggregated totals (rank, wallet, total, percentage)
// Get the Query ID from your Dune query URL: dune.com/queries/{QUERY_ID}
const QUERY_ID = 4851338 // Your query ID

interface AggregatedRecord {
  rank: number
  recipient: string
  total_usdc_sent: number
  percent_of_total: number
}

/**
 * Fetch CSV data from Dune Analytics API
 */
async function fetchFromDune(): Promise<AggregatedRecord[]> {
  const apiKey = process.env.DUNE_API_KEY

  if (!apiKey) {
    console.error('❌ DUNE_API_KEY not found in .env file')
    console.error('\nTo get your API key:')
    console.error('1. Go to https://dune.com/settings/api')
    console.error('2. Create a new API key (free tier available)')
    console.error('3. Add to .env: DUNE_API_KEY="your_key_here"')
    process.exit(1)
  }

  console.log('📡 Fetching data from Dune Analytics...\n')

  try {
    // Fetch CSV results directly from Dune API
    const url = `https://api.dune.com/api/v1/query/${QUERY_ID}/results/csv`

    console.log(`🔍 Downloading results from query ${QUERY_ID}...`)

    const response = await fetch(url, {
      headers: {
        'X-Dune-API-Key': apiKey,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key. Get a new one at: https://dune.com/settings/api')
      } else if (response.status === 404) {
        throw new Error(`Query ${QUERY_ID} not found. Make sure the query exists and is public.`)
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    }

    const csvText = await response.text()
    console.log('✓ Downloaded CSV data\n')

    // Parse CSV
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length === 0) {
      throw new Error('No data in CSV')
    }

    // Skip header
    const dataLines = lines.slice(1)

    console.log(`✓ Parsing ${dataLines.length} records...\n`)

    const records: AggregatedRecord[] = []

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i]

      // Simple CSV split (assumes no commas in data)
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''))

      // Debug first few lines
      if (i < 3) {
        console.log(`Sample line ${i + 1}:`, parts.length, 'columns')
        console.log('  Rank:', parts[0], 'Wallet:', parts[1], 'Amount:', parts[2])
      }

      // Parse aggregated data: rank, wallet, total_amount, percentage
      if (parts.length >= 4 && parts[1] && parts[2]) {
        try {
          records.push({
            rank: parseInt(parts[0]),
            recipient: parts[1].toLowerCase(),
            total_usdc_sent: parseFloat(parts[2]),
            percent_of_total: parseFloat(parts[3] || '0'),
          })
        } catch (err) {
          if (i < 5) {
            console.log(`  Error parsing line ${i + 1}:`, err)
          }
        }
      } else if (i < 3) {
        console.log(`  Skipping line ${i + 1} - not enough columns`)
      }
    }

    console.log(`\n✓ Successfully parsed ${records.length} valid records\n`)
    return records

  } catch (error: any) {
    console.error('❌ Dune API Error:', error.message)
    throw error
  }
}

/**
 * Import aggregated totals to database
 */
async function importAggregatedData(records: AggregatedRecord[]) {
  console.log(`📊 Importing ${records.length} aggregated records...\n`)

  let newUsers = 0
  let updatedPayouts = 0
  let skipped = 0
  let totalAmount = 0

  for (const record of records) {
    const walletAddress = record.recipient.toLowerCase()

    try {
      // Find or create user
      let user = await prisma.user.findUnique({
        where: { walletAddress },
      })

      if (!user) {
        user = await prisma.user.create({
          data: {
            walletAddress,
            tier: 'FREE',
          },
        })
        newUsers++
        console.log(`✨ New user: ${walletAddress}`)
      }

      // Check existing total for this user
      const existingTotal = await prisma.payout.aggregate({
        where: { userId: user.id, verified: true },
        _sum: { amount: true },
      })

      const currentTotal = existingTotal._sum.amount || 0
      const newTotal = record.total_usdc_sent
      const difference = newTotal - currentTotal

      // Only add if there's a difference
      if (Math.abs(difference) > 0.01) {
        if (difference > 0) {
          // Add the difference as a new payout
          console.log(
            `💰 ${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}: ` +
            `$${currentTotal.toFixed(2)} → $${newTotal.toFixed(2)} (+$${difference.toFixed(2)})`
          )

          await prisma.payout.create({
            data: {
              userId: user.id,
              amount: difference,
              date: new Date(), // Use current date since we don't have transaction dates
              txHash: `aggregate-${Date.now()}-${user.id.slice(0, 8)}`, // Placeholder hash
              blockNumber: 0,
              verified: true,
            },
          })

          updatedPayouts++
          totalAmount += difference
        } else {
          console.log(
            `⚠️  ${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}: ` +
            `DB has more than blockchain ($${currentTotal.toFixed(2)} vs $${newTotal.toFixed(2)})`
          )
        }
      } else {
        skipped++
      }
    } catch (error) {
      console.error(`❌ Error importing ${walletAddress}:`, error)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Import completed!')
  console.log('='.repeat(60))
  console.log(`   New users created:      ${newUsers}`)
  console.log(`   New payouts imported:   ${newPayouts}`)
  console.log(`   Skipped (duplicates):   ${skipped}`)
  console.log(`   Total amount imported:  $${totalAmount.toFixed(2)}`)
  console.log('='.repeat(60))
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Importing Polymarket rewards from Dune Analytics...\n')

  try {
    // Fetch data from Dune
    const data = await fetchFromDune()

    if (data.length === 0) {
      console.log('ℹ️  No data found in query results')
      return
    }

    console.log(`✓ Fetched ${data.length} aggregated records\n`)

    // Import to database
    await importAggregatedData(data)

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
