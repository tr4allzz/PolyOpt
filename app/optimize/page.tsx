'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { formatUSD } from '@/lib/polymarket/utils'

export default function OptimizePage() {
  const [markets, setMarkets] = useState<any[]>([])
  const [capital, setCapital] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchMarkets() {
      try {
        const response = await fetch('/api/markets?limit=10')
        if (response.ok) {
          const data = await response.json()
          setMarkets(data.markets)
        }
      } catch (error) {
        console.error('Error fetching markets:', error)
      }
    }

    fetchMarkets()
  }, [])

  const handleOptimize = async (marketId: string) => {
    if (!capital || parseFloat(capital) <= 0) return

    setLoading(true)
    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capital: parseFloat(capital),
          marketId,
          strategy: 'balanced',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setResults((prev) => [
          ...prev.filter((r) => r.market.id !== marketId),
          data,
        ])
      }
    } catch (error) {
      console.error('Error optimizing:', error)
    } finally {
      setLoading(false)
    }
  }

  const sortedResults = [...results].sort(
    (a, b) => b.metrics.expectedAPY - a.metrics.expectedAPY
  )

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Market Optimizer</h1>
          <p className="text-muted-foreground">
            Find the best markets and optimal order placement for your capital
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Set Your Capital</CardTitle>
            <CardDescription>
              Enter the amount you want to deploy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="capital">Capital ($)</Label>
                <Input
                  id="capital"
                  type="number"
                  placeholder="1000"
                  value={capital}
                  onChange={(e) => setCapital(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <Button
                onClick={() => markets.forEach((m) => handleOptimize(m.id))}
                disabled={!capital || parseFloat(capital) <= 0 || loading}
              >
                {loading ? 'Optimizing...' : 'Optimize All Markets'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {sortedResults.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Optimization Results</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Sorted by expected APY (highest to lowest)
            </p>
            <div className="space-y-4">
              {sortedResults.map((result, index) => (
                <Card key={result.market.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-muted-foreground">
                            #{index + 1}
                          </span>
                          <CardTitle className="text-lg">
                            {result.market.question}
                          </CardTitle>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Expected APY</p>
                        <p className="text-2xl font-bold text-green-500">
                          {(result.metrics.expectedAPY * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Daily Reward</p>
                        <p className="text-lg font-bold">
                          {formatUSD(result.metrics.expectedDailyReward)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Monthly</p>
                        <p className="text-lg font-bold">
                          {formatUSD(result.metrics.expectedMonthlyReward)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Buy Price</p>
                        <p className="text-lg font-bold text-green-600">
                          {result.recommendation.buyOrder.price}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Sell Price</p>
                        <p className="text-lg font-bold text-red-600">
                          {result.recommendation.sellOrder.price}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold mb-4">Top Markets</h2>
          <div className="grid grid-cols-1 gap-4">
            {markets.map((market) => (
              <Card key={market.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{market.question}</CardTitle>
                  <CardDescription>
                    Daily pool: {formatUSD(market.rewardPool)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleOptimize(market.id)}
                    disabled={!capital || parseFloat(capital) <= 0 || loading}
                    variant="outline"
                  >
                    Optimize
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
