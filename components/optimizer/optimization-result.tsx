'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatUSD } from '@/lib/polymarket/utils'
import { ArrowRight, TrendingUp, AlertTriangle, Activity, Target, ChevronLeft } from 'lucide-react'

interface OptimizationResultProps {
  result: {
    capital: number
    strategy?: string
    optimalPlacement: {
      buyOrder: { price: number; size: number }
      sellOrder: { price: number; size: number }
      expectedQScore: { qOne: number; qTwo: number; qMin: number }
      expectedDailyReward: number
      capitalEfficiency: number
      fillProbability?: number
      expectedValue?: number
      riskAdjustedReturn?: number
      volatilityScore?: number
      optimalSpreadRatio?: number
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
    riskMetrics?: {
      fillProbability: number
      fillRiskLevel: 'Low' | 'Medium' | 'High' | 'Very High'
      volatilityScore: number
      volatilityLevel: string
      expectedValue: number
      riskAdjustedReturn: number
      optimalSpreadRatio: number
    }
    warnings?: string[]
  }
  onBack?: () => void
}

function getRiskBadgeVariant(riskLevel: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (riskLevel) {
    case 'Low': return 'default'
    case 'Medium': return 'secondary'
    case 'High': return 'destructive'
    case 'Very High': return 'destructive'
    default: return 'outline'
  }
}

export function OptimizationResult({ result, onBack }: OptimizationResultProps) {
  const hasRiskMetrics = !!result.riskMetrics

  return (
    <div className="space-y-4">
      {/* Back button */}
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      )}

      {/* Risk Warnings */}
      {result.warnings && result.warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Risk Warning</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {result.warnings.map((warning, i) => (
                <li key={i} className="text-sm">{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Risk Metrics Card - NEW */}
      {hasRiskMetrics && result.riskMetrics && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Risk Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Fill Risk</p>
              <div className="flex items-center gap-2">
                <Badge variant={getRiskBadgeVariant(result.riskMetrics.fillRiskLevel)}>
                  {result.riskMetrics.fillRiskLevel}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  ({(result.riskMetrics.fillProbability * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Market Volatility</p>
              <Badge variant="outline">
                {result.riskMetrics.volatilityLevel}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Expected Value (30d)</p>
              <p className="text-lg font-bold text-blue-600">
                {formatUSD(result.riskMetrics.expectedValue)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Risk-Adjusted Return</p>
              <p className="text-lg font-bold">
                {(result.riskMetrics.riskAdjustedReturn * 100).toFixed(2)}%
              </p>
            </div>
            <div className="col-span-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Optimal Spread</p>
              <p className="text-sm font-medium">
                {(result.riskMetrics.optimalSpreadRatio * 100).toFixed(0)}% of max spread
                <span className="text-xs text-muted-foreground ml-2">
                  (dynamically optimized)
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
