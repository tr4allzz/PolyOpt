# Leaderboard - Quick Guide

## ✅ What You Have

Your leaderboard now features:
- **Pagination** - 20 traders per page with navigation controls
- **Real dates** - Shows actual first payout date (not database creation date)
- **Real blockchain data** - Import actual reward transactions from Polygon

## 🚀 Import Real Blockchain Data

### ⭐ Method 1: Automatic Import via Dune API (Recommended)

**No manual CSV downloads needed!**

1. **Create the query on Dune:**
   - Go to https://dune.com
   - Create a new query with the SQL below
   - Save it and note the Query ID from the URL (e.g., `dune.com/queries/1234567`)

2. **Get your API key:**
   - Go to https://dune.com/settings/api
   - Create a free API key

3. **Configure:**
   - Add to `.env`:
     ```env
     DUNE_API_KEY="your_key_here"
     ```
   - Update `scripts/import-from-dune.ts` line 18 with your Query ID:
     ```typescript
     const QUERY_ID = 1234567 // Your query ID
     ```

4. **Run the import:**
   ```bash
   npm run import-rewards
   ```

That's it! The script automatically fetches and imports the latest data.

---

### Method 2: Manual CSV Import

If you prefer manual control:

#### Step 1: Get Data from Dune Analytics

1. Go to https://dune.com (create free account if needed)
2. Create a new query
3. Paste this SQL:

```sql
SELECT
  blocks.time AS block_time,
  CONCAT('0x', SUBSTRING(LOWER(TRY_CAST(logs.topic2 AS VARCHAR)), 27, 40)) AS recipient,
  CAST(varbinary_to_uint256(logs.data) AS decimal(38,0)) / POWER(10, 6) AS amount,
  logs.transaction_hash AS tx_hash,
  logs.block_number
FROM polygon.logs logs
INNER JOIN polygon.blocks blocks ON logs.block_number = blocks.number
WHERE
  logs.contract_address = FROM_HEX('2791Bca1f2de4661ED88A30C99A7a9449Aa84174')
  AND logs.topic0 = FROM_HEX('ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef')
  AND logs.topic1 = FROM_HEX('000000000000000000000000c288480574783bd7615170660d71753378159c47')
ORDER BY blocks.time DESC;
```

4. Click **"Execute"**
5. Click **"Export"** → **"Download CSV"**

#### Step 2: Import to Database

1. Save the CSV file as `transactions-data.csv` in your project root
2. Run:
```bash
npm run import-rewards-csv
```

#### Step 3: View Results

Visit http://localhost:3001/leaderboard

**Done!** You now have real blockchain data with:
- ✅ Actual wallet addresses from Polygon
- ✅ Real USDC reward amounts
- ✅ Actual transaction dates
- ✅ Transaction hashes for verification

---

## 📊 What the Data Shows

- **Polymarket Rewards Address**: `0xc288480574783BD7615170660d71753378159c47`
- **USDC Contract (Polygon)**: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
- **Network**: Polygon PoS

You can verify any transaction on [Polygonscan](https://polygonscan.com/address/0xc288480574783BD7615170660d71753378159c47)

---

## 🔄 Updating Data

To add new transactions:
1. Run the same Dune query again
2. Export new CSV
3. Run `npm run import-rewards` again

The script automatically:
- Skips duplicate transactions (checks tx hash)
- Only adds new payouts
- Creates new users if needed

---

## 🎯 Features

### Leaderboard Page
- **Top traders** ranked by total rewards
- **Pagination** with 20 items per page
- **Stats cards** showing totals and averages
- **Profile links** to view traders on Polymarket
- **Real dates** showing when each trader received their first payout

### Changes Made
1. Added pagination component
2. Fixed "Member Since" to show actual first payout date
3. Created CSV import script for blockchain data
4. Updated table to show "First Payout" instead of "Member Since"

---

## 📁 Files

### Key Files:
- `app/leaderboard/page.tsx` - Leaderboard page with pagination
- `app/api/leaderboard/route.ts` - API endpoint (fetches from database)
- `components/leaderboard/leaderboard-table.tsx` - Table component
- `components/ui/pagination.tsx` - Pagination controls
- `scripts/import-transactions-from-csv.ts` - Import script

### Commands:
- `npm run dev` - Start development server
- `npm run import-rewards` - Import blockchain data from Dune API (automatic)
- `npm run import-rewards-csv` - Import from CSV file (manual)
- `npm run prisma:studio` - View database

---

## ❓ Troubleshooting

### CSV format error?
Make sure your CSV has these columns:
- `block_time` - Transaction timestamp
- `recipient` - Wallet address (0x...)
- `amount` - USDC amount
- `tx_hash` - Transaction hash
- `block_number` - Block number

### No data showing?
1. Check that `transactions-data.csv` is in project root
2. Verify CSV format matches expected format
3. Check console for error messages

### Duplicates?
The script checks `txHash` and skips existing transactions automatically.

---

## 🎉 That's It!

You now have a fully functional leaderboard with real Polygon blockchain data!

Questions? Check the import script at `scripts/import-transactions-from-csv.ts`
