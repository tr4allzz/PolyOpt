'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatUSD, formatPrice, formatNumber } from '@/lib/polymarket/utils'
import { TrendingUp, Users, DollarSign, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface MarketCardProps {
  market: {
    id: string
    question: string
    midpoint: number
    rewardPool: number
    volume: number
    liquidity: number
    endDate: Date
    active: boolean
  }
}

export function MarketCard({ market }: MarketCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">
              {market.question}
            </CardTitle>
            <CardDescription className="mt-2">
              Current midpoint: {formatPrice(market.midpoint)}
            </CardDescription>
          </div>
          {market.active ? (
            <Badge variant="default" className="bg-green-500">
              Active
            </Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Daily Rewards</p>
              <p className="text-sm font-semibold">{formatUSD(market.rewardPool)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Volume</p>
              <p className="text-sm font-semibold">${formatNumber(market.volume)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Liquidity</p>
              <p className="text-sm font-semibold">${formatNumber(market.liquidity)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Ends</p>
              <p className="text-sm font-semibold">
                {format(new Date(market.endDate), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>
        <Link href={`/markets/${market.id}`}>
          <Button className="w-full">View Details</Button>
        </Link>
      </CardContent>
    </Card>
  )
}
