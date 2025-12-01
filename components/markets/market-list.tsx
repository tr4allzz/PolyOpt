'use client'

import { MarketCard } from './market-card'

interface Market {
  id: string
  question: string
  midpoint: number
  maxSpread?: number
  minSize?: number
  rewardPool: number
  volume: number
  liquidity: number
  endDate: Date | string
  active: boolean
}

interface MarketListProps {
  markets: Market[]
  viewMode?: 'grid' | 'list'
}

export function MarketList({ markets, viewMode = 'grid' }: MarketListProps) {
  if (markets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No markets found</p>
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-2">
        {markets.map((market) => (
          <MarketCard key={market.id} market={market} compact />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
      {markets.map((market) => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  )
}
