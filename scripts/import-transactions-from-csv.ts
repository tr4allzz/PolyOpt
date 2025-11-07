/**
 * Import Individual Liquidity Reward Transactions from CSV
 *
 * This script imports individual transaction records with actual dates from blockchain.
 *
 * Usage:
 * 1. Run the SQL query on Dune Analytics (see docs/BLOCKCHAIN_QUERIES.md)
 * 2. Export results as CSV
 * 3. Place CSV file in the project root as 'transactions-data.csv'
 * 4. Run: npm run import-transactions
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface TransactionRecord {
  block_time: string
  recipient: string
  amount: number
  tx_hash: string
  block_number: number
}

/**
 * Parse CSV file
 */
function parseCSV(filePath: string): TransactionRecord[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())

  // Skip header
  const dataLines = lines.slice(1)

  return dataLines.map(line => {
    // Handle CSV with potential commas in quoted fields
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || []
    const cleanParts = parts.map(p => p.replace(/^"|"$/g, '').trim())

    return {
      block_time: cleanParts[0],
      recipient: cleanParts[1].toLowerCase(),
      amount: parseFloat(cleanParts[2]),
      tx_hash: cleanParts[3].toLowerCase(),
      block_number: parseInt(cleanParts[4]),
    }
  }).filter(record => record.recipient && record.amount > 0)
}

/**
 * Import individual transactions to database
 */
async function importTransactions(records: TransactionRecord[]) {
  console.log(`\n📊 Importing ${records.length} transaction records...\n`)

  let newUsers = 0
  let newPayouts = 0
  let skipped = 0
  let totalAmount = 0

  // Get all existing transaction hashes to avoid duplicates
  const existingTxHashes = new Set(
    (await prisma.payout.findMany({ select: { txHash: true } }))
      .map(p => p.txHash.toLowerCase())
  )

  for (const record of records) {
    try {
      // Skip if transaction already exists
      if (existingTxHashes.has(record.tx_hash)) {
        skipped++
        continue
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { walletAddress: record.recipient },
      })

      if (!user) {
        console.log(`✨ Creating user: ${record.recipient}`)
        user = await prisma.user.create({
          data: {
            walletAddress: record.recipient,
            tier: 'FREE',
          },
        })
        newUsers++
      }

      // Create payout record with actual blockchain data
      const payoutDate = new Date(record.block_time)

      console.log(
        `💰 ${record.recipient.slice(0, 8)}...${record.recipient.slice(-6)}: ` +
        `$${record.amount.toFixed(2)} on ${payoutDate.toLocaleDateString()} ` +
        `(block ${record.block_number})`
      )

      await prisma.payout.create({
        data: {
          userId: user.id,
          amount: record.amount,
          date: payoutDate,
          txHash: record.tx_hash,
          blockNumber: record.block_number,
          verified: true,
        },
      })

      newPayouts++
      totalAmount += record.amount
    } catch (error) {
      console.error(`❌ Error processing tx ${record.tx_hash}:`, error)
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
  const csvPath = path.join(process.cwd(), 'transactions-data.csv')

  if (!fs.existsSync(csvPath)) {
    console.error('❌ Error: transactions-data.csv not found in project root')
    console.error('\nPlease:')
    console.error('1. Run the individual transactions SQL query on Dune Analytics')
    console.error('   (see docs/BLOCKCHAIN_QUERIES.md)')
    console.error('2. Export results as CSV')
    console.error('3. Save as transactions-data.csv in the project root')
    console.error('4. Run: npm run import-transactions')
    process.exit(1)
  }

  console.log('📂 Reading transactions-data.csv...')
  const records = parseCSV(csvPath)
  console.log(`✓ Parsed ${records.length} transaction records\n`)

  if (records.length === 0) {
    console.error('❌ No valid records found in CSV')
    process.exit(1)
  }

  // Show sample
  console.log('Sample transaction:')
  console.log(JSON.stringify(records[0], null, 2))
  console.log()

  await importTransactions(records)

  await prisma.$disconnect()
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
