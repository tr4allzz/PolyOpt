# Leaderboard Setup Guide

The leaderboard now uses a **daily cron job** to fetch data from Dune Analytics instead of real-time database queries.

## How It Works

1. **Daily Sync**: A cron job runs once per day to fetch fresh data from Dune Analytics
2. **File Cache**: Data is stored in `data/leaderboard-cache.json` (automatically created)
3. **Fast API**: The leaderboard API reads from this cached file for instant responses
4. **Search & Filters**: All filtering happens in-memory on the cached data (very fast)

## Setup Instructions

### 1. Initial Setup

Make sure you have your Dune API key in `.env`:

```env
DUNE_API_KEY=your_api_key_here
```

Get a free API key at: https://dune.com/settings/api

### 2. Initial Data Sync

Run this command to create the initial cache:

```bash
npm run sync-leaderboard
```

This will:
- Fetch all leaderboard data from Dune (query ID: 4851338)
- Create `data/leaderboard-cache.json`
- Display sync statistics

### 3. Automatic Daily Updates

#### Option A: Vercel Cron (Recommended for Vercel deployments)

The `vercel.json` file is already configured to run the sync daily at midnight UTC:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-leaderboard",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Security**: Set `CRON_SECRET` in your Vercel environment variables to protect the cron endpoint.

#### Option B: External Cron Service

If not using Vercel, use an external cron service like:
- cron-job.org
- EasyCron
- GitHub Actions

Schedule a daily GET request to:
```
https://your-domain.com/api/cron/sync-leaderboard
```

Add header for security:
```
Authorization: Bearer YOUR_CRON_SECRET
```

#### Option C: Manual Sync

You can also manually trigger the sync anytime:

```bash
# Via script
npm run sync-leaderboard

# Via API (local)
curl http://localhost:3000/api/cron/sync-leaderboard

# Via API (production, with auth)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.com/api/cron/sync-leaderboard
```

## API Endpoints

### GET /api/leaderboard

Fetch leaderboard data with optional filters.

**Query Parameters:**
- `limit` - Number of entries per page (default: 100)
- `offset` - Pagination offset (default: 0)
- `search` - Search by wallet address (partial match)
- `minRewards` - Minimum total rewards filter
- `minPayouts` - Minimum payout count filter

**Example Requests:**

```bash
# Get top 20 traders
curl "http://localhost:3000/api/leaderboard?limit=20"

# Search for a wallet
curl "http://localhost:3000/api/leaderboard?search=0x9d84"

# Filter by minimum $10,000 rewards
curl "http://localhost:3000/api/leaderboard?minRewards=10000"

# Combine filters
curl "http://localhost:3000/api/leaderboard?minRewards=5000&minPayouts=10&limit=50"
```

**Response:**

```json
{
  "leaderboard": [
    {
      "rank": 1,
      "walletAddress": "0x9d84ce0306f8551e02efef1680475fc0f1dc1344",
      "totalRewards": 1153412.0769,
      "payoutCount": 1153,
      "memberSince": null
    }
  ],
  "total": 53297,
  "limit": 20,
  "offset": 0,
  "lastUpdated": "2025-11-06T19:15:23.023Z"
}
```

## File Structure

```
PolyOpt/
├── app/api/
│   ├── leaderboard/route.ts          # Main leaderboard API
│   └── cron/sync-leaderboard/route.ts # Cron job endpoint
├── lib/
│   ├── dune-leaderboard.ts           # Dune API integration
│   └── leaderboard-cache.ts          # Cache management
├── scripts/
│   └── sync-leaderboard.ts           # Manual sync script
├── data/
│   └── leaderboard-cache.json        # Cached data (auto-generated)
├── components/leaderboard/
│   ├── leaderboard-filters.tsx       # Search & filter UI
│   └── leaderboard-table.tsx         # Table display
└── vercel.json                       # Vercel cron config
```

## Benefits

✅ **Fast Performance**: No database queries, instant response from file cache
✅ **Cost Effective**: Only 1 Dune API call per day (free tier: 30/month)
✅ **Reliable**: No real-time API dependency for user-facing pages
✅ **Simple**: No complex database setup or Prisma queries
✅ **Scalable**: Can handle 50,000+ leaderboard entries efficiently

## Monitoring

Check cache status:
```bash
# View cache file
cat data/leaderboard-cache.json | head -20

# Check last update time
cat data/leaderboard-cache.json | grep lastUpdated
```

Check cron job logs (Vercel):
- Go to your Vercel dashboard
- Navigate to your project
- Click "Logs" tab
- Filter by "Cron" to see sync job results

## Troubleshooting

**No data showing on leaderboard:**
1. Run `npm run sync-leaderboard` to create initial cache
2. Check that `data/leaderboard-cache.json` exists
3. Verify `DUNE_API_KEY` is set in `.env`

**Stale data:**
1. Check cron job is running (Vercel dashboard)
2. Manually trigger sync: `npm run sync-leaderboard`
3. Verify `CRON_SECRET` matches in Vercel env vars

**API errors:**
1. Check Dune API key is valid
2. Verify query ID 4851338 is accessible
3. Check Dune API rate limits (free tier: 30 requests/month)

## Customization

### Change Sync Frequency

Edit `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-leaderboard",
      "schedule": "0 */6 * * *"  // Every 6 hours
    }
  ]
}
```

Cron format: `minute hour day month dayOfWeek`

### Use Different Dune Query

Edit `lib/dune-leaderboard.ts`:
```typescript
const LEADERBOARD_QUERY_ID = YOUR_QUERY_ID
```

Make sure your query returns: `rank, recipient, total_usdc_sent, percent_of_total`

## Next Steps

1. ✅ Run initial sync: `npm run sync-leaderboard`
2. ✅ Test leaderboard page: http://localhost:3000/leaderboard
3. ✅ Deploy to Vercel (cron will auto-start)
4. ✅ Monitor first cron run in Vercel dashboard
5. ✅ Verify daily updates are working
