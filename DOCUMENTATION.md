# PolyOpt - Complete User & Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [User Flow](#user-flow)
4. [Technical Architecture](#technical-architecture)
5. [Q-Score Calculation](#q-score-calculation)
6. [API Reference](#api-reference)
7. [Usage Examples](#usage-examples)

---

## Overview

PolyOpt is a web application that helps Polymarket liquidity providers (LPs) maximize their reward earnings by:
- **Calculating exact Q-scores** using Polymarket's official reward formula
- **Analyzing competition** to understand your market share
- **Optimizing order placement** to maximize rewards per dollar
- **Tracking payouts** to monitor your earnings over time

### Key Benefits
- 📊 **Accuracy**: Implements Polymarket's exact formulas (±1% accuracy)
- 🎯 **Optimization**: Find the best order placement automatically
- 📈 **Competition Analysis**: See how you stack up against other LPs
- 💰 **Payout Tracking**: Monitor your daily rewards

---

## How It Works

### The Reward System Explained

Polymarket rewards liquidity providers who keep markets balanced and liquid. Here's how:

#### 1. **What is a Q-Score?**
Your Q-score determines your share of the daily reward pool. It's calculated based on:
- **Order proximity to midpoint**: Closer orders score higher
- **Order size**: Larger orders score higher
- **Two-sided liquidity**: Providing both buy and sell orders increases your score

#### 2. **The Formula**

```
Step 1: Calculate order score
S(v,s) = ((v-s)/v)² × size
where:
  v = max allowed spread (e.g., 0.03 = 3¢)
  s = your order's spread from midpoint
  size = number of shares

Step 2: Calculate Q_one (buy-side liquidity)
Q₁ = Sum of (YES bids + NO asks)

Step 3: Calculate Q_two (sell-side liquidity)
Q₂ = Sum of (YES asks + NO bids)

Step 4: Calculate Q_min (final score)
If midpoint is between 10-90%:
  Q_min = max(min(Q₁, Q₂), max(Q₁/3, Q₂/3))
Else:
  Q_min = min(Q₁, Q₂)

Step 5: Calculate your reward
Your share = Q_min / Σ(all LPs' Q_min)
Your reward = Your share × Daily pool
```

#### 3. **Why Two-Sided Matters**
- **Single-sided**: You can provide only one side, but it's penalized (divided by 3)
- **Two-sided**: Providing both sides gives you the full score
- **Example**: Q₁=300, Q₂=0 → Q_min=100 (single-sided penalty)
- **Example**: Q₁=150, Q₂=150 → Q_min=150 (better!)

---

## User Flow

### Flow 1: Browse Markets (No Wallet Required)

```
1. Visit Homepage (/)
   ↓
2. Click "Browse Markets"
   ↓
3. Markets Page (/markets)
   - See all active reward markets
   - Sort by reward pool, volume, etc.
   - Search markets
   ↓
4. Click on a Market
   ↓
5. Market Detail Page (/markets/[id])
   - View market stats
   - See current midpoint
   - Check daily reward pool
   - View end date
```

### Flow 2: Calculate Your Q-Score (Wallet Required)

```
1. Connect Wallet
   - Click "Connect Wallet" in header
   - Choose wallet (MetaMask, Coinbase, WalletConnect)
   - Approve connection on Polygon network
   ↓
2. Go to Market Detail
   ↓
3. Enter Your Wallet Address
   - Use the "Calculate Your Q-Score" card
   - Enter wallet address (or use connected wallet)
   - Optionally enter capital deployed
   ↓
4. Click "Calculate Q-Score"
   ↓
5. API Fetches Your Orders
   - Fetches your open orders from Polymarket CLOB
   - Filters orders for this specific market
   - Identifies qualifying orders (within spread, above min size)
   ↓
6. Calculation Engine Processes
   - Calculates Q₁ (buy-side score)
   - Calculates Q₂ (sell-side score)
   - Calculates Q_min (final score)
   - Fetches competition data (other LPs' scores)
   - Calculates your market share
   ↓
7. Results Displayed
   - Q-Score Breakdown (Q₁, Q₂, Q_min)
   - Expected daily reward
   - Expected monthly reward
   - Estimated APY (if capital provided)
   - Your market share percentage
   - Competition analysis
```

### Flow 3: Optimize Order Placement

```
1. Go to Market Detail OR Optimize Page
   ↓
2. Click "Optimize Placement"
   ↓
3. Enter Capital to Deploy
   - Enter amount in USD
   ↓
4. Choose Strategy
   - Balanced (recommended)
   - Advanced (tests multiple strategies)
   ↓
5. Click "Calculate Optimal Placement"
   ↓
6. Optimizer Runs
   - Tests different order placements
   - Calculates expected Q-scores for each
   - Factors in current competition
   - Finds best ROI
   ↓
7. Results Shown
   - Recommended buy order (price + size)
   - Recommended sell order (price + size)
   - Expected Q-scores
   - Expected daily/monthly/yearly rewards
   - Expected APY
   - Capital efficiency (reward per $1)
   ↓
8. Execute on Polymarket
   - Copy recommended orders
   - Go to Polymarket
   - Place orders manually
```

### Flow 4: Track Portfolio

```
1. Connect Wallet
   ↓
2. Go to Portfolio (/portfolio)
   ↓
3. API Fetches Your Data
   - All markets where you have positions
   - Current Q-scores for each market
   - Expected rewards
   ↓
4. Dashboard Shows
   - Total markets you're active in
   - Total daily rewards across all markets
   - Total monthly estimate
   - Average APY
   - List of all positions with:
     * Market name
     * Your Q-score
     * Daily reward
     * Market share
```

### Flow 5: View Payout History

```
1. Connect Wallet
   ↓
2. Go to History (/history)
   ↓
3. API Fetches Payout Data
   - Scans blockchain for your payouts
   - Reads reward distribution transactions
   ↓
4. Dashboard Shows
   - Total paid to date
   - Number of payouts
   - Average daily payout (30-day)
   - Last payout date
   - List of all payouts with:
     * Date
     * Amount
     * Transaction hash
     * Block number
```

---

## Technical Architecture

### System Architecture

```
┌─────────────┐
│   Browser   │
│  (Next.js)  │
└──────┬──────┘
       │
       │ HTTP Requests
       │
┌──────▼──────────────────────────────────────┐
│           Next.js API Routes               │
├─────────────────────────────────────────────┤
│  /api/markets         - List markets       │
│  /api/markets/[id]    - Market details     │
│  /api/calculate       - Calculate Q-score  │
│  /api/optimize        - Optimize orders    │
│  /api/user/positions  - User portfolio     │
│  /api/user/payouts    - Payout history     │
└──────┬──────────────────────┬───────────────┘
       │                      │
       │                      │
┌──────▼────────┐      ┌──────▼──────────┐
│   Prisma ORM  │      │  Calculation    │
│               │      │    Engine       │
└──────┬────────┘      └──────┬──────────┘
       │                      │
       │                      │
┌──────▼────────┐      ┌──────▼──────────┐
│  SQLite/      │      │   Polymarket    │
│  PostgreSQL   │      │   CLOB API      │
└───────────────┘      └─────────────────┘
```

### Data Flow

#### 1. Market Data Sync
```
Polymarket API → Next.js API → Prisma → Database
                    ↓
              Market Snapshots saved
                    ↓
              Frontend displays markets
```

#### 2. Q-Score Calculation
```
User submits wallet address
    ↓
API fetches user orders from Polymarket CLOB
    ↓
Calculation Engine:
  - Filters qualifying orders
  - Calculates Q₁, Q₂, Q_min
  - Fetches competition data
  - Calculates reward estimates
    ↓
Save Position to database
    ↓
Return results to frontend
```

#### 3. Optimization
```
User submits capital amount
    ↓
Optimizer tests multiple strategies:
  - 25% spread (aggressive)
  - 35% spread (balanced)
  - 50% spread (conservative)
    ↓
For each strategy:
  - Calculate expected Q-scores
  - Calculate expected rewards
  - Factor in competition
    ↓
Return best strategy to user
```

---

## Q-Score Calculation

### Detailed Example

Let's walk through a real calculation:

**Market Setup:**
- Question: "Will Trump win 2024?"
- Midpoint: 0.50 (50%)
- Max spread: 0.03 (3¢)
- Min size: 100 shares
- Daily pool: $240.50

**Your Orders:**
1. YES Bid @ 0.48 for 500 shares (1¢ from midpoint)
2. YES Ask @ 0.52 for 500 shares (2¢ from midpoint)

**Step 1: Calculate Order Scores**

Order 1 (YES Bid):
```
spread = |0.48 - 0.50| = 0.02 (2¢)
S = ((0.03 - 0.02) / 0.03)² × 500
S = (0.01 / 0.03)² × 500
S = (0.333)² × 500
S = 0.111 × 500
S = 55.5
```

Order 2 (YES Ask):
```
spread = |0.52 - 0.50| = 0.02 (2¢)
S = ((0.03 - 0.02) / 0.03)² × 500
S = 55.5
```

**Step 2: Calculate Q₁ and Q₂**
```
Q₁ = YES bids + NO asks = 55.5 + 0 = 55.5
Q₂ = YES asks + NO bids = 55.5 + 0 = 55.5
```

**Step 3: Calculate Q_min**
```
Midpoint = 0.50 (in range [0.10, 0.90])
Q_min = max(min(55.5, 55.5), max(55.5/3, 55.5/3))
Q_min = max(55.5, 18.5)
Q_min = 55.5
```

**Step 4: Calculate Reward**

Assume total competition Q_min = 5000

```
Your share = 55.5 / (55.5 + 5000) = 0.011 (1.1%)
Daily reward = 0.011 × $240.50 = $2.65
Monthly reward = $2.65 × 30 = $79.50
Yearly reward = $2.65 × 365 = $967.25

With $500 capital deployed:
APY = $967.25 / $500 = 193.5%
```

### Edge Cases Handled

#### 1. Single-Sided Liquidity
```
Q₁ = 300, Q₂ = 0
Midpoint = 0.50

Q_min = max(min(300, 0), max(300/3, 0/3))
Q_min = max(0, 100)
Q_min = 100

Note: You lose 2/3 of your potential score!
```

#### 2. Extreme Midpoint
```
Q₁ = 300, Q₂ = 100
Midpoint = 0.95 (>0.90)

Q_min = min(300, 100) = 100

Note: No single-sided allowed at extreme midpoints!
```

#### 3. Orders Outside Max Spread
```
Order @ 0.45 with midpoint 0.50
spread = 0.05 > max_spread (0.03)

Score = 0 (order doesn't qualify)
```

#### 4. Orders Below Min Size
```
Order with 50 shares, min_size = 100

Score = 0 (order doesn't qualify)
```

---

## API Reference

### GET /api/markets

List all active reward markets.

**Query Parameters:**
- `limit` (number): Number of markets to return (default: 50)
- `offset` (number): Pagination offset (default: 0)
- `active` (boolean): Filter by active status (default: true)

**Response:**
```json
{
  "markets": [
    {
      "id": "trump-2024",
      "question": "Will Donald Trump win the 2024 US Presidential Election?",
      "maxSpread": 0.03,
      "minSize": 100,
      "rewardPool": 240.50,
      "midpoint": 0.552,
      "volume": 45000000,
      "liquidity": 2000000,
      "endDate": "2024-11-05T00:00:00.000Z",
      "active": true,
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 5,
  "limit": 50,
  "offset": 0
}
```

### GET /api/markets/[id]

Get detailed information about a specific market.

**Parameters:**
- `id` (string): Market ID

**Query Parameters:**
- `fresh` (boolean): Fetch fresh data from Polymarket (default: false)

**Response:**
```json
{
  "market": {
    "id": "trump-2024",
    "question": "Will Donald Trump win the 2024 US Presidential Election?",
    "description": "...",
    "maxSpread": 0.03,
    "minSize": 100,
    "rewardPool": 240.50,
    "midpoint": 0.552,
    "volume": 45000000,
    "liquidity": 2000000,
    "endDate": "2024-11-05T00:00:00.000Z",
    "active": true,
    "resolved": false,
    "snapshots": [
      {
        "timestamp": "2024-01-01T12:00:00.000Z",
        "midpoint": 0.550,
        "totalQMin": 15500,
        "lpCount": 47,
        "rewardPool": 240.50
      }
    ]
  }
}
```

### POST /api/calculate

Calculate Q-score and expected rewards for a wallet.

**Request Body:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "marketId": "trump-2024",
  "capital": 1000
}
```

**Response:**
```json
{
  "qScore": {
    "qOne": 55.5,
    "qTwo": 55.5,
    "qMin": 55.5
  },
  "expectedReward": {
    "userShare": 0.011,
    "dailyReward": 2.65,
    "monthlyReward": 79.50,
    "annualizedAPY": 0.9675
  },
  "orderCount": 2,
  "competition": {
    "totalQMin": 5055.5,
    "userQMin": 55.5,
    "competitionQMin": 5000
  }
}
```

### POST /api/optimize

Find optimal order placement for given capital.

**Request Body:**
```json
{
  "capital": 1000,
  "marketId": "trump-2024",
  "strategy": "balanced"
}
```

**Response:**
```json
{
  "market": {
    "id": "trump-2024",
    "question": "Will Donald Trump win the 2024 US Presidential Election?",
    "midpoint": 0.552,
    "rewardPool": 240.50
  },
  "capital": 1000,
  "optimalPlacement": {
    "buyOrder": {
      "price": 0.5415,
      "size": 922
    },
    "sellOrder": {
      "price": 0.5625,
      "size": 888
    },
    "expectedQScore": {
      "qOne": 150.5,
      "qTwo": 150.5,
      "qMin": 150.5
    },
    "expectedDailyReward": 7.2,
    "capitalEfficiency": 0.0072
  },
  "metrics": {
    "expectedDailyReward": 7.2,
    "expectedMonthlyReward": 216,
    "expectedAPY": 2.628,
    "capitalEfficiency": 0.0072
  },
  "recommendation": {
    "buyOrder": {
      "price": "0.542",
      "size": 922,
      "cost": "499.52"
    },
    "sellOrder": {
      "price": "0.563",
      "size": 888,
      "cost": "500.14"
    }
  }
}
```

### GET /api/user/positions

Get user's positions across all markets.

**Query Parameters:**
- `walletAddress` (string): User's wallet address

**Response:**
```json
{
  "positions": [
    {
      "id": "pos-1",
      "marketId": "trump-2024",
      "market": {
        "id": "trump-2024",
        "question": "Will Donald Trump win the 2024 US Presidential Election?",
        "midpoint": 0.552,
        "rewardPool": 240.50,
        "endDate": "2024-11-05T00:00:00.000Z",
        "active": true
      },
      "qOne": 55.5,
      "qTwo": 55.5,
      "qMin": 55.5,
      "estimatedDaily": 2.65,
      "userShare": 0.011,
      "competitionQMin": 5000,
      "capitalDeployed": 1000,
      "orderCount": 2,
      "calculatedAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "summary": {
    "totalMarkets": 1,
    "totalDailyReward": 2.65,
    "totalMonthlyReward": 79.50,
    "totalCapitalDeployed": 1000,
    "avgAPY": 0.9675
  }
}
```

### GET /api/user/payouts

Get user's payout history.

**Query Parameters:**
- `walletAddress` (string): User's wallet address
- `limit` (number): Number of payouts (default: 100)
- `offset` (number): Pagination offset (default: 0)

**Response:**
```json
{
  "payouts": [
    {
      "id": "pay-1",
      "amount": 2.65,
      "date": "2024-01-01T00:00:00.000Z",
      "txHash": "0x...",
      "blockNumber": 12345678,
      "verified": true,
      "createdAt": "2024-01-01T00:05:00.000Z"
    }
  ],
  "summary": {
    "totalPaid": 79.50,
    "payoutCount": 30,
    "lastPayoutDate": "2024-01-30T00:00:00.000Z",
    "avgDailyPayout": 2.65
  },
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 30
  }
}
```

---

## Usage Examples

### Example 1: Analyzing a Market Before Entry

**Goal:** Determine if a market is worth entering

**Steps:**
1. Browse markets, sort by reward pool
2. Click on highest reward market
3. Check current stats:
   - Reward pool: $320.75/day
   - Current liquidity: $1.5M
   - Volume: $28M
   - Competition: Likely high
4. Use optimizer with your capital: $1000
5. See expected daily: $3.50 (127% APY)
6. **Decision:** Enter if APY > your threshold

### Example 2: Optimizing Existing Position

**Goal:** Improve your Q-score

**Steps:**
1. Go to Portfolio page
2. See your current position:
   - Q-score: 50
   - Daily reward: $2.00
   - Share: 0.8%
3. Notice Q₁=150, Q₂=50 (imbalanced!)
4. Go to market detail → Use optimizer
5. See recommendation shows balanced orders
6. Adjust your orders on Polymarket
7. Recalculate → New Q-score: 100 (doubled!)

### Example 3: Monitoring Competition

**Goal:** Track how competition affects your rewards

**Steps:**
1. Calculate Q-score: 100
2. Note competition Q_min: 5000
3. Your share: 100/5100 = 1.96%
4. Check again tomorrow
5. Competition Q_min now: 6000
6. Your share: 100/6100 = 1.64% (decreased!)
7. **Decision:** Add more liquidity or exit

### Example 4: Capital Allocation

**Goal:** Split $5000 across best markets

**Steps:**
1. Go to Optimize page
2. Enter capital: $5000
3. Click "Optimize All Markets"
4. See results sorted by APY:
   - Market A: $10/day (73% APY)
   - Market B: $8/day (58% APY)
   - Market C: $6/day (44% APY)
5. Allocate based on ROI:
   - Market A: $2000
   - Market B: $2000
   - Market C: $1000
6. Execute orders on Polymarket

---

## Best Practices

### 1. Order Placement
- **Stay within max spread**: Orders outside don't qualify
- **Balance your sides**: Two-sided = 3x better than single-sided
- **Optimal spread**: 30-40% of max spread balances score vs. execution risk
- **Min size matters**: Always meet minimum size requirements

### 2. Competition Monitoring
- **Check daily**: Competition changes daily
- **Track your share**: If declining, consider adding liquidity
- **Watch for whales**: Large LPs can drastically reduce your share
- **Market timing**: Enter early before competition increases

### 3. Capital Efficiency
- **Calculate APY**: $reward × 365 / $capital
- **Compare markets**: Focus on highest APY
- **Rebalance**: Move capital to better opportunities
- **Track payouts**: Verify calculations match reality

### 4. Risk Management
- **Spread risk**: Don't put all capital in one market
- **Monitor end dates**: Markets close at different times
- **Check resolution**: Some markets may resolve early
- **Adverse selection**: Orders too close to midpoint may execute

---

## Troubleshooting

### Q-Score is Lower Than Expected
- Check if orders are within max spread
- Verify orders meet minimum size
- Confirm orders are on correct side (Q₁ vs Q₂)
- Check for single-sided penalty

### Expected Reward Not Matching Actual
- Competition changed since calculation
- Market midpoint moved
- Some orders executed/filled
- Check if market is still active

### Optimizer Shows Low Returns
- High competition in market
- Small reward pool
- Your capital too low for meaningful position
- Try different markets

### Can't Connect Wallet
- Ensure you're on Polygon network
- Check WalletConnect project ID in .env
- Try different wallet provider
- Refresh page and retry

---

## Advanced Topics

### Custom Strategies

The optimizer can be extended with custom strategies:

```typescript
// In lib/rewards/optimizer.ts

export function optimizeCustom(
  capital: number,
  market: Market,
  competitionQMin: number,
  riskTolerance: 'low' | 'medium' | 'high'
): OptimalPlacement {
  const spreadRatios = {
    low: 0.50,    // Far from midpoint (safe)
    medium: 0.35, // Balanced
    high: 0.25,   // Close to midpoint (risky)
  };

  const spreadRatio = spreadRatios[riskTolerance];
  // ... rest of optimization logic
}
```

### Backtesting

Track actual payouts vs. predictions:

```typescript
// Compare calculated vs actual
const accuracy = calculateAccuracy(
  calculatedReward,
  actualPayout,
  tolerance: 0.01 // 1%
);

if (accuracy.isValid) {
  console.log('Calculation accurate within 1%');
}
```

---

## Support

For questions or issues:
- GitHub Issues: https://github.com/tr4allzz/PolyOpt/issues
- Polymarket Docs: https://docs.polymarket.com
- Discord: [Your Discord Link]

---

*Last Updated: November 2, 2024*
*Version: 1.0.0*
