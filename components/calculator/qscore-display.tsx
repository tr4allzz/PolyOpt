'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QScore } from '@/types/rewards'
import { Progress } from '@/components/ui/progress'

interface QScoreDisplayProps {
  qScore: QScore
  className?: string
}

export function QScoreDisplay({ qScore, className }: QScoreDisplayProps) {
  const maxScore = Math.max(qScore.qOne, qScore.qTwo, 100)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Q-Score Breakdown</CardTitle>
        <CardDescription>
          Your liquidity provision score
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Q₁ (Buy Side)</span>
            <span className="text-sm font-bold">{qScore.qOne.toFixed(2)}</span>
          </div>
          <Progress value={(qScore.qOne / maxScore) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            YES bids + NO asks
          </p>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Q₂ (Sell Side)</span>
            <span className="text-sm font-bold">{qScore.qTwo.toFixed(2)}</span>
          </div>
          <Progress value={(qScore.qTwo / maxScore) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            YES asks + NO bids
          </p>
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Q_min (Final Score)</span>
            <span className="text-lg font-bold text-primary">{qScore.qMin.toFixed(2)}</span>
          </div>
          <Progress value={(qScore.qMin / maxScore) * 100} className="h-3 bg-primary/20" />
          <p className="text-xs text-muted-foreground mt-1">
            {qScore.qMin < Math.min(qScore.qOne, qScore.qTwo)
              ? 'Single-sided liquidity penalty applied'
              : 'Balanced two-sided liquidity'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
