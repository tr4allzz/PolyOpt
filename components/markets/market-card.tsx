'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatUSD, formatPrice, formatNumber } from '@/lib/polymarket/utils'
import { TrendingUp, Droplets, Clock, Zap, ChevronRight } from 'lucide-react'
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import Link from 'next/link'

interface MarketCardProps {
  market: {
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
  compact?: boolean
}

// Get reward tier based on daily reward amount
function getRewardTier(rewardPool: number): { label: string; color: string; bgColor: string } {
  if (rewardPool >= 100) return { label: 'High Reward', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' }
  if (rewardPool >= 25) return { label: 'Medium Reward', color: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' }
  return { label: 'Low Reward', color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' }
}

// Calculate estimated APY based on reward pool and liquidity
function estimateAPY(rewardPool: number, liquidity: number): number | null {
  if (!liquidity || liquidity < 100) return null
  const yearlyReward = rewardPool * 365
  return (yearlyReward / liquidity) * 100
}

// Get time remaining info
function getTimeInfo(endDate: Date | string): { text: string; urgent: boolean; progress: number } {
  const now = new Date()
  const end = new Date(endDate)
  const daysLeft = differenceInDays(end, now)

  if (daysLeft < 0) return { text: 'Ended', urgent: false, progress: 100 }
  if (daysLeft === 0) return { text: 'Ends today', urgent: true, progress: 95 }
  if (daysLeft <= 3) return { text: `${daysLeft}d left`, urgent: true, progress: 85 }
  if (daysLeft <= 7) return { text: `${daysLeft}d left`, urgent: false, progress: 70 }
  if (daysLeft <= 30) return { text: formatDistanceToNow(end, { addSuffix: false }), urgent: false, progress: 40 }
  return { text: format(end, 'MMM d'), urgent: false, progress: 10 }
}

export function MarketCard({ market, compact = false }: MarketCardProps) {
  const rewardTier = getRewardTier(market.rewardPool)
  const estimatedAPY = estimateAPY(market.rewardPool, market.liquidity)
  const timeInfo = getTimeInfo(market.endDate)

  if (compact) {
    return (
      <Link href={`/markets/${market.id}`}>
        <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
          {/* Reward amount - prominent */}
          <div className="flex-shrink-0 w-20 text-center">
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatUSD(market.rewardPool)}
            </p>
            <p className="text-xs text-muted-foreground">/day</p>
          </div>

          {/* Question */}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{market.question}</p>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>{formatPrice(market.midpoint)}</span>
              <span>•</span>
              <span>${formatNumber(market.volume)} vol</span>
              {estimatedAPY && (
                <>
                  <span>•</span>
                  <span className="text-green-600">{estimatedAPY.toFixed(0)}% APY</span>
                </>
              )}
            </div>
          </div>

          {/* Time and status */}
          <div className="flex-shrink-0 text-right">
            <Badge variant={timeInfo.urgent ? "destructive" : "secondary"} className="mb-1">
              {timeInfo.text}
            </Badge>
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>
      </Link>
    )
  }

  return (
    <Card className="hover:shadow-lg transition-all hover:border-primary/50 group overflow-hidden flex flex-col h-full">
      {/* Reward tier banner */}
      <div className={`px-4 py-2 ${rewardTier.bgColor} flex items-center justify-between flex-shrink-0`}>
        <div className="flex items-center gap-2">
          <Zap className={`h-4 w-4 ${rewardTier.color}`} />
          <span className={`text-sm font-medium ${rewardTier.color}`}>{rewardTier.label}</span>
        </div>
        {estimatedAPY && (
          <Badge variant="outline" className="bg-white/50 dark:bg-black/20">
            ~{estimatedAPY.toFixed(0)}% APY
          </Badge>
        )}
      </div>

      <CardContent className="pt-4 flex flex-col flex-1">
        {/* Question - fixed height with line clamp */}
        <h3 className="font-semibold text-lg line-clamp-2 mb-3 group-hover:text-primary transition-colors min-h-[3.5rem]">
          {market.question}
        </h3>

        {/* Main reward display */}
        <div className="flex items-baseline justify-between mb-4 p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-2xl font-bold">
              {formatUSD(market.rewardPool)}
            </p>
            <p className="text-xs text-muted-foreground">daily rewards</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold">{formatPrice(market.midpoint)}</p>
            <p className="text-xs text-muted-foreground">midpoint</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
            <TrendingUp className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Volume</p>
              <p className="text-sm font-medium truncate">${formatNumber(market.volume)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
            <Droplets className="h-4 w-4 text-purple-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Liquidity</p>
              <p className="text-sm font-medium truncate">${formatNumber(market.liquidity)}</p>
            </div>
          </div>
        </div>

        {/* Market parameters - fixed height area */}
        <div className="flex gap-2 mb-4 text-xs min-h-[1.5rem] flex-wrap">
          {market.maxSpread && (
            <Badge variant="outline" className="font-normal">
              Max spread: {(market.maxSpread * 100).toFixed(1)}¢
            </Badge>
          )}
          {market.minSize && (
            <Badge variant="outline" className="font-normal">
              Min: {market.minSize} shares
            </Badge>
          )}
        </div>

        {/* Spacer to push bottom content down */}
        <div className="flex-1" />

        {/* Time remaining */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <Clock className={`h-3 w-3 ${timeInfo.urgent ? 'text-red-500' : 'text-muted-foreground'}`} />
              <span className={`text-xs ${timeInfo.urgent ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                {timeInfo.urgent ? timeInfo.text : `Ends ${format(new Date(market.endDate), 'MMM d, yyyy')}`}
              </span>
            </div>
            {!market.active && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
          <Progress value={timeInfo.progress} className="h-1" />
        </div>

        {/* Action button - always at bottom */}
        <Link href={`/markets/${market.id}`} className="block">
          <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            Calculate Rewards
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
