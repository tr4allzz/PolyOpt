import { memo, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface PortfolioHealthProps {
  positions: any
  recommendations: any
  marketSharePercent?: number
}

export const PortfolioHealth = memo(function PortfolioHealth({
  positions,
  recommendations,
  marketSharePercent,
}: PortfolioHealthProps) {
  if (!positions || !positions.summary) return null

  // Calculate health score (0-100)
  let score = 50 // Base score

  // Add points for diversification
  const marketCount = positions.summary.totalMarkets
  if (marketCount >= 5) score += 15
  else if (marketCount >= 3) score += 10
  else if (marketCount >= 1) score += 5

  // Add points for market share
  if (marketSharePercent) {
    if (marketSharePercent >= 5) score += 20
    else if (marketSharePercent >= 2) score += 15
    else if (marketSharePercent >= 1) score += 10
    else score += 5
  }

  // Subtract points for high-priority recommendations
  const highPriorityRecs = recommendations?.recommendations?.filter(
    (r: any) => r.priority === 'high'
  ).length || 0
  score -= highPriorityRecs * 5

  // Clamp between 0-100
  score = Math.max(0, Math.min(100, score))

  let status: 'excellent' | 'good' | 'fair' | 'needs-attention'
  let statusIcon: React.ReactNode
  let statusColor: string

  if (score >= 80) {
    status = 'excellent'
    statusIcon = <CheckCircle2 className="h-5 w-5 text-green-600" />
    statusColor = 'text-green-600'
  } else if (score >= 60) {
    status = 'good'
    statusIcon = <TrendingUp className="h-5 w-5 text-blue-600" />
    statusColor = 'text-blue-600'
  } else if (score >= 40) {
    status = 'fair'
    statusIcon = <AlertTriangle className="h-5 w-5 text-yellow-600" />
    statusColor = 'text-yellow-600'
  } else {
    status = 'needs-attention'
    statusIcon = <AlertTriangle className="h-5 w-5 text-red-600" />
    statusColor = 'text-red-600'
  }

  const statusLabels = {
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    'needs-attention': 'Needs Attention',
  }

  const insights = []

  if (marketCount < 3) {
    insights.push('Consider diversifying across more markets to reduce risk')
  }
  if (highPriorityRecs > 0) {
    insights.push(`${highPriorityRecs} high-priority optimization${highPriorityRecs > 1 ? 's' : ''} available`)
  }
  if (marketSharePercent && marketSharePercent < 1) {
    insights.push('Your market share is low - consider increasing position sizes')
  }
  if (score >= 80) {
    insights.push('Your portfolio is well-optimized!')
  }

  return (
    <Card className="border-purple-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {statusIcon}
              Portfolio Health
            </CardTitle>
            <CardDescription>
              Overall optimization status
            </CardDescription>
          </div>
          <Badge
            variant={status === 'excellent' || status === 'good' ? 'default' : 'secondary'}
            className={statusColor}
          >
            {statusLabels[status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Health Score</span>
            <span className={`text-2xl font-bold ${statusColor}`}>
              {score}/100
            </span>
          </div>
          <Progress value={score} className="h-3" />
        </div>

        {insights.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Quick Insights:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
