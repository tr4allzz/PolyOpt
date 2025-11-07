'use client'

import { MarketCard } from './market-card'

interface Market {
  id: string
  question: string
  midpoint: number
  rewardPool: number
  volume: number
  liquidity: number
  endDate: Date
  active: boolean
}

interface MarketListProps {
  markets: Market[]
}

export function MarketList({ markets }: MarketListProps) {
  if (markets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No markets found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {markets.map((market) => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  )
}
