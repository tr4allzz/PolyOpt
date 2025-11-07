# PolyOpt - Polymarket Liquidity Rewards Optimizer

A web application that helps Polymarket liquidity providers optimize their rewards by calculating exact Q-scores, tracking competition, and optimizing order placement.

## Features

- **Q-Score Calculator**: Implements Polymarket's reward formula (Equations 1-7) to calculate exact Q-scores
- **Competition Tracker**: Analyze all LPs in a market in real-time
- **Order Optimizer**: Calculate optimal order placement to maximize rewards
- **Payout Tracker**: Monitor on-chain reward distributions
- **Portfolio Dashboard**: Real-time portfolio view with expected rewards

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Web3**: wagmi 2.0, viem 2.0
- **State Management**: TanStack Query (React Query)
- **Testing**: Vitest
- **Charts**: Recharts
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- WalletConnect Project ID (for wallet connection)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/tr4allzz/PolyOpt.git
cd PolyOpt
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your configuration:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/polyopt"
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your_project_id"
POLYMARKET_API_URL="https://gamma-api.polymarket.com"
CLOB_API_URL="https://clob.polymarket.com"
```

4. Set up the database:
```bash
npm run prisma:migrate
npm run prisma:generate
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
polyopt/
├── app/                      # Next.js app directory
│   ├── api/                 # API routes
│   │   ├── markets/        # Market endpoints
│   │   ├── calculate/      # Q-score calculation
│   │   ├── optimize/       # Optimization endpoint
│   │   └── user/           # User data endpoints
│   ├── markets/            # Markets pages
│   ├── portfolio/          # Portfolio page
│   ├── optimize/           # Optimizer page
│   └── history/            # Payout history page
├── components/              # React components
│   ├── ui/                 # shadcn/ui components
│   ├── markets/            # Market components
│   ├── calculator/         # Calculator components
│   ├── optimizer/          # Optimizer components
│   ├── wallet/             # Wallet connection
│   └── layout/             # Layout components
├── lib/                     # Utility libraries
│   ├── rewards/            # Core calculation engine
│   │   ├── calculator.ts  # Q-score calculations
│   │   └── optimizer.ts   # Optimization logic
│   ├── polymarket/         # Polymarket API client
│   ├── blockchain/         # Blockchain utilities
│   └── prisma.ts          # Prisma client
├── prisma/                  # Database schema
└── types/                   # TypeScript types
```

## Core Calculation Engine

The heart of PolyOpt is the Q-score calculator that implements Polymarket's reward formula:

### Equations Implemented

1. **Order Score**: `S(v,s) = ((v-s)/v)² × size`
2. **Q_one**: Sum of (YES bids + NO asks)
3. **Q_two**: Sum of (YES asks + NO bids)
4. **Q_min**:
   - If midpoint ∈ [0.10, 0.90]: `max(min(Q₁, Q₂), max(Q₁/3, Q₂/3))`
   - Otherwise: `min(Q₁, Q₂)`
5. **Q_normal**: `Q_min / Σ(Q_min)`
6. **Final Reward**: `Q_normal × Daily Pool`

### Test Coverage

The calculation engine has **38 passing unit tests** covering:
- Order scoring with different spreads
- Q-score calculations (Q_one, Q_two, Q_min)
- Single-sided vs two-sided liquidity
- Edge cases and competition scenarios
- APY calculations

Run tests:
```bash
npm test
```

## API Endpoints

### Markets
- `GET /api/markets` - List all reward markets
- `GET /api/markets/[id]` - Get market details with historical data

### Calculations
- `POST /api/calculate` - Calculate Q-score and expected rewards
  ```json
  {
    "walletAddress": "0x...",
    "marketId": "market-id",
    "capital": 1000
  }
  ```

- `POST /api/optimize` - Find optimal order placement
  ```json
  {
    "capital": 1000,
    "marketId": "market-id",
    "strategy": "balanced"
  }
  ```

### User Data
- `GET /api/user/positions?walletAddress=0x...` - User's portfolio
- `GET /api/user/payouts?walletAddress=0x...` - Payout history

## Database Schema

The application uses 8 main models:
- **User**: Wallet-based user accounts
- **Market**: Polymarket reward markets
- **Position**: User Q-scores and positions
- **Order**: User's open orders
- **Payout**: On-chain reward distributions
- **Alert**: User alerts and notifications
- **MarketSnapshot**: Historical market data
- **ApiCache**: API response caching

## Development

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm test             # Run unit tests
npm run lint         # Lint code
npm run prisma:studio # Open Prisma Studio
```

### Adding Features

1. **New API Endpoint**: Add route in `app/api/`
2. **New Page**: Add page in `app/`
3. **New Component**: Add component in `components/`
4. **New Calculation**: Update `lib/rewards/calculator.ts`

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Database

Deploy PostgreSQL using:
- Railway
- Supabase
- Neon
- PlanetScale

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Polymarket for the reward formula documentation
- shadcn/ui for the component library
- Wagmi team for Web3 utilities

## Support

For issues and questions:
- GitHub Issues: https://github.com/tr4allzz/PolyOpt/issues
- Polymarket Docs: https://docs.polymarket.com

---

Built with ❤️ for the Polymarket community
