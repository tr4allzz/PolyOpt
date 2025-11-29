import { memo, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatUSD } from '@/lib/polymarket/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

interface RewardsChartProps {
  rewards: any
}

export const RewardsChart = memo(function RewardsChart({ rewards }: RewardsChartProps) {
  if (!rewards || !rewards.rewards || rewards.rewards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rewards Over Time</CardTitle>
          <CardDescription>Track your earnings history</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No reward data available yet</p>
        </CardContent>
      </Card>
    )
  }

  // Group rewards by date and calculate cumulative
  const rewardsByDate = rewards.rewards.reduce((acc: any, reward: any) => {
    const date = new Date(reward.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (!acc[date]) {
      acc[date] = { date, amount: 0, count: 0 }
    }
    acc[date].amount += parseFloat(reward.amount)
    acc[date].count += 1
    return acc
  }, {})

  let cumulative = 0
  const chartData = Object.values(rewardsByDate)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((item: any) => {
      cumulative += item.amount
      return {
        ...item,
        cumulative,
      }
    })

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-medium">{payload[0].payload.date}</p>
          <p className="text-sm text-green-600">
            Earned: {formatUSD(payload[0].payload.amount)}
          </p>
          <p className="text-sm text-blue-600">
            Total: {formatUSD(payload[0].payload.cumulative)}
          </p>
          <p className="text-xs text-muted-foreground">
            {payload[0].payload.count} payment{payload[0].payload.count !== 1 ? 's' : ''}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rewards Over Time</CardTitle>
        <CardDescription>
          Cumulative earnings: {formatUSD(cumulative)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              className="text-xs"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#colorCumulative)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
})
