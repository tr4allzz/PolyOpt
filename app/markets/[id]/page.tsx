'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OrderInput } from '@/components/calculator/order-input'
import { QScoreDisplay } from '@/components/calculator/qscore-display'
import { formatUSD, formatPrice, formatNumber } from '@/lib/polymarket/utils'
import { format } from 'date-fns'
import { AlertTriangle, TrendingUp, Shield, Zap, ExternalLink, Clock, DollarSign, BarChart3, Info } from 'lucide-react'
import Link from 'next/link'

export default function MarketDetailPage({ params }: { params: { id: string } }) {
  const [market, setMarket] = useState<any>(null)
  const [qScore, setQScore] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)

  useEffect(() => {
    async function fetchMarket() {
      try {
        const response = await fetch(`/api/markets/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setMarket(data.market)
        }
      } catch (error) {
        console.error('Error fetching market:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMarket()
  }, [params.id])

  const handleCalculate = async (capital: number) => {
    setCalculating(true)
    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: params.id,
          capital,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setQScore(data)
      }
    } catch (error) {
      console.error('Error calculating rewards:', error)
    } finally {
      setCalculating(false)
    }
  }

  const handleStrategyChange = async (strategyName: string) => {
    if (qScore?.strategy?.totalCapital) {
      setCalculating(true)
      try {
        const response = await fetch('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            marketId: params.id,
            capital: qScore.strategy.totalCapital,
            strategy: strategyName,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setQScore(data)
        }
      } catch (error) {
        console.error('Error calculating rewards:', error)
      } finally {
        setCalculating(false)
      }
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'Medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'High': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStrategyIcon = (name: string) => {
    if (name.includes('Conservative')) return <Shield className="h-4 w-4" />
    if (name.includes('Aggressive')) return <Zap className="h-4 w-4" />
    return <TrendingUp className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="grid grid-cols-4 gap-4 mt-8">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-24 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!market) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-2">Market Not Found</h1>
            <p className="text-muted-foreground mb-4">This market doesn't exist or has been removed.</p>
            <Link href="/markets">
              <Button>Back to Markets</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{market.question}</h1>
              {market.description && (
                <p className="text-muted-foreground">{market.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {market.active ? (
                <Badge className="bg-green-500">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://polymarket.com/event/${market.conditionId || market.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Polymarket
                </a>
              </Button>
            </div>
          </div>

          {/* Market Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <p className="text-sm text-muted-foreground">Daily Rewards</p>
                </div>
                <p className="text-2xl font-bold">{formatUSD(market.rewardPool)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  <p className="text-sm text-muted-foreground">Midpoint</p>
                </div>
                <p className="text-2xl font-bold">{formatPrice(market.midpoint)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <p className="text-sm text-muted-foreground">Volume</p>
                </div>
                <p className="text-2xl font-bold">${formatNumber(market.volume)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <p className="text-sm text-muted-foreground">End Date</p>
                </div>
                <p className="text-2xl font-bold">
                  {format(new Date(market.endDate), 'MMM d')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Reward Config */}
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Max Spread:</span>
                  <span className="ml-2 font-medium">{(market.maxSpread * 100).toFixed(1)}¢</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Min Size:</span>
                  <span className="ml-2 font-medium">{market.minSize} shares</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Liquidity:</span>
                  <span className="ml-2 font-medium">${formatNumber(market.liquidity)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calculator Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Input & Q-Score */}
          <div className="space-y-6">
            <OrderInput onCalculate={handleCalculate} minSize={market.minSize} loading={calculating} />
            {qScore && <QScoreDisplay qScore={qScore.qScore} />}
          </div>

          {/* Right: Results */}
          <div className="space-y-6">
            {qScore && (
              <>
                {/* Strategy Selector */}
                {qScore.allStrategies && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Choose Strategy</CardTitle>
                      <CardDescription>
                        Select a strategy based on your risk tolerance
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-2">
                        {qScore.allStrategies.map((s: any) => {
                          // Map display names to API strategy names
                          const getStrategyKey = (name: string) => {
                            if (name.includes('Balanced')) return 'balanced'
                            if (name.includes('Conservative')) return 'conservative'
                            if (name.includes('Aggressive')) return 'aggressive'
                            if (name.includes('YES Only')) return 'yes_only'
                            if (name.includes('NO Only')) return 'no_only'
                            return 'balanced'
                          }
                          return (
                          <Button
                            key={s.name}
                            variant={qScore.strategy?.name === s.name ? 'default' : 'outline'}
                            className="justify-between h-auto py-3"
                            onClick={() => handleStrategyChange(getStrategyKey(s.name))}
                            disabled={calculating}
                          >
                            <div className="flex items-center gap-2">
                              {getStrategyIcon(s.name)}
                              <div className="text-left">
                                <p className="font-medium">{s.name}</p>
                                <p className="text-xs opacity-70">{s.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className={getRiskColor(s.risk)}>{s.risk}</Badge>
                              <p className="text-xs mt-1">{formatUSD(s.dailyReward)}/day</p>
                            </div>
                          </Button>
                        )})}

                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Expected Rewards */}
                <Card>
                  <CardHeader>
                    <CardTitle>Expected Rewards</CardTitle>
                    <CardDescription>
                      {qScore.strategy?.name} strategy with ${qScore.strategy?.totalCapital?.toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge className={getRiskColor(qScore.strategy?.risk)}>{qScore.strategy?.risk} Risk</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Daily</p>
                        <p className="text-3xl font-bold text-green-600">
                          {formatUSD(qScore.expectedReward.dailyReward)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Monthly</p>
                        <p className="text-2xl font-bold">
                          {formatUSD(qScore.expectedReward.monthlyReward)}
                        </p>
                      </div>
                    </div>
                    {qScore.expectedReward.annualizedAPY > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated APY</p>
                        <p className="text-2xl font-bold text-green-500">
                          {(qScore.expectedReward.annualizedAPY * 100).toFixed(1)}%
                        </p>
                      </div>
                    )}
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Your estimated share: {(qScore.expectedReward.userShare * 100).toFixed(2)}%
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Projection Info */}
                <Card className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/10">
                  <CardContent className="pt-6">
                    <div className="flex gap-3">
                      <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-blue-800 dark:text-blue-400">Projected Rewards</p>
                        <p className="text-sm text-blue-700 dark:text-blue-500 mt-1">
                          These are projected rewards assuming your orders remain open and unfilled.
                          Monitor your positions regularly - if orders get filled, your Q-score and
                          rewards will change. Rewards are distributed daily based on your active
                          liquidity at snapshot time.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Order Details */}
                {qScore.strategy?.orders && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Orders to Place</CardTitle>
                      <CardDescription>
                        {qScore.strategy.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {qScore.strategy.orders.map((order: any, i: number) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                            <div>
                              <p className="font-medium">
                                {order.side} {order.outcome}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {order.size} shares @ {order.price}
                              </p>
                            </div>
                            <p className="font-semibold">${order.cost}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Risk Disclaimer */}
                {qScore.disclaimer && (
                  <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-900/10">
                    <CardContent className="pt-6">
                      <div className="flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-yellow-800 dark:text-yellow-500">{qScore.disclaimer.title}</p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-600 mt-1">
                            {qScore.disclaimer.message}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Empty state when no calculation yet */}
            {!qScore && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Calculate Your Rewards</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter your capital amount to see expected Q-score and daily rewards
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
