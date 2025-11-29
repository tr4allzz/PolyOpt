import { memo, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatUSD } from '@/lib/polymarket/utils'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface PositionDistributionProps {
  positions: any
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1']

export const PositionDistribution = memo(function PositionDistribution({ positions }: PositionDistributionProps) {
  if (!positions || !positions.positions || positions.positions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Capital Distribution</CardTitle>
          <CardDescription>How your capital is allocated</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No positions to display</p>
        </CardContent>
      </Card>
    )
  }

  // Take top 6 positions by capital + group rest as "Other"
  const sortedPositions = [...positions.positions]
    .sort((a, b) => b.capitalDeployed - a.capitalDeployed)

  const top6 = sortedPositions.slice(0, 6)
  const rest = sortedPositions.slice(6)

  const chartData = top6.map((position: any) => ({
    name: position.market.question.length > 40
      ? position.market.question.substring(0, 40) + '...'
      : position.market.question,
    value: position.capitalDeployed,
    fullName: position.market.question,
  }))

  if (rest.length > 0) {
    const otherTotal = rest.reduce((sum, p) => sum + p.capitalDeployed, 0)
    chartData.push({
      name: `Other (${rest.length} markets)`,
      value: otherTotal,
      fullName: `Other ${rest.length} markets`,
    })
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg max-w-xs">
          <p className="text-sm font-medium mb-1">{payload[0].payload.fullName}</p>
          <p className="text-sm text-blue-600">
            {formatUSD(payload[0].value)}
          </p>
          <p className="text-xs text-muted-foreground">
            {((payload[0].value / positions.summary.totalCapital) * 100).toFixed(1)}% of portfolio
          </p>
        </div>
      )
    }
    return null
  }

  const totalCapital = positions.positions.reduce((sum: number, p: any) => sum + p.capitalDeployed, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capital Distribution</CardTitle>
        <CardDescription>
          Total capital: {formatUSD(totalCapital)} across {positions.positions.length} markets
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
})
