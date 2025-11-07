'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatUSD } from '@/lib/polymarket/utils'
import { ArrowRight, TrendingUp } from 'lucide-react'

interface OptimizationResultProps {
  result: {
    capital: number
    optimalPlacement: {
      buyOrder: { price: number; size: number }
      sellOrder: { price: number; size: number }
      expectedQScore: { qOne: number; qTwo: number; qMin: number }
      expectedDailyReward: number
      capitalEfficiency: number
    }
    metrics: {
      expectedDailyReward: number
      expectedMonthlyReward: number
      expectedAPY: number
    }
    recommendation: {
      buyOrder: { price: string; size: number; cost: string }
      sellOrder: { price: string; size: number; cost: string }
    }
  }
}

export function OptimizationResult({ result }: OptimizationResultProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expected Returns</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Daily</p>
            <p className="text-lg font-bold">{formatUSD(result.metrics.expectedDailyReward)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Monthly</p>
            <p className="text-lg font-bold">{formatUSD(result.metrics.expectedMonthlyReward)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">APY</p>
            <p className="text-lg font-bold text-green-500">
              {(result.metrics.expectedAPY * 100).toFixed(1)}%
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recommended Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-green-700 dark:text-green-300">BUY Order</span>
              <span className="text-xs text-green-600 dark:text-green-400">
                {result.recommendation.buyOrder.size} shares
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                {result.recommendation.buyOrder.price}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Cost: {formatUSD(parseFloat(result.recommendation.buyOrder.cost))}
              </span>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-red-700 dark:text-red-300">SELL Order</span>
              <span className="text-xs text-red-600 dark:text-red-400">
                {result.recommendation.sellOrder.size} shares
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-red-700 dark:text-red-300">
                {result.recommendation.sellOrder.price}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Cost: {formatUSD(parseFloat(result.recommendation.sellOrder.cost))}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Expected Q-Scores:</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Q₁</p>
                <p className="font-bold">{result.optimalPlacement.expectedQScore.qOne.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Q₂</p>
                <p className="font-bold">{result.optimalPlacement.expectedQScore.qTwo.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Q_min</p>
                <p className="font-bold text-primary">
                  {result.optimalPlacement.expectedQScore.qMin.toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
