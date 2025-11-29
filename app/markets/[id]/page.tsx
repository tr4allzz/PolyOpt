'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OrderInput } from '@/components/calculator/order-input'
import { QScoreDisplay } from '@/components/calculator/qscore-display'
import { OptimizerModal } from '@/components/optimizer/optimizer-modal'
import { OrderSuggestions } from '@/components/market/order-suggestions'
import { RealtimeOrderBook } from '@/components/market/realtime-order-book'
import { WhaleAlert } from '@/components/market/whale-alert'
import { LiveTradeFeed } from '@/components/market/live-trade-feed'
import { MarketCommentary } from '@/components/social/market-commentary'
import { WebSocketStatus } from '@/components/market/websocket-status'
import { formatUSD, formatPrice, formatNumber } from '@/lib/polymarket/utils'
import { format } from 'date-fns'

export default function MarketDetailPage({ params }: { params: { id: string } }) {
  const [market, setMarket] = useState<any>(null)
  const [qScore, setQScore] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

  const handleCalculate = async (walletAddress: string, capital?: number) => {
    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          marketId: params.id,
          capital,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setQScore(data)
      }
    } catch (error) {
      console.error('Error calculating Q-score:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <p className="text-center">Loading...</p>
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
          <p className="text-center">Market not found</p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container py-8">
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{market.question}</h1>
              {market.description && (
                <p className="text-muted-foreground">{market.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <WebSocketStatus />
              {market.active ? (
                <Badge className="bg-green-500">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Market Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Daily Rewards</p>
                  <p className="text-2xl font-bold">{formatUSD(market.rewardPool)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Midpoint</p>
                  <p className="text-2xl font-bold">{formatPrice(market.midpoint)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Volume</p>
                  <p className="text-2xl font-bold">${formatNumber(market.volume)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="text-2xl font-bold">
                    {format(new Date(market.endDate), 'MMM d')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <OrderInput onCalculate={handleCalculate} />
            {qScore && <QScoreDisplay qScore={qScore.qScore} />}
          </div>

          <div>
            {qScore && (
              <Card>
                <CardHeader>
                  <CardTitle>Expected Rewards</CardTitle>
                  <CardDescription>
                    Based on your current positions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Daily</p>
                    <p className="text-3xl font-bold">
                      {formatUSD(qScore.expectedReward.dailyReward)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly</p>
                    <p className="text-2xl font-bold">
                      {formatUSD(qScore.expectedReward.monthlyReward)}
                    </p>
                  </div>
                  {qScore.expectedReward.annualizedAPY && (
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated APY</p>
                      <p className="text-2xl font-bold text-green-500">
                        {(qScore.expectedReward.annualizedAPY * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      Your share: {(qScore.expectedReward.userShare * 100).toFixed(2)}%
                    </p>
                    <OptimizerModal
                      marketId={market.id}
                      marketQuestion={market.question}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Order Placement Suggestions */}
        <div className="mb-8">
          <OrderSuggestions marketId={market.id} />
        </div>

        {/* Real-Time Features */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">📊 Real-Time Market Data</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order Book */}
            <RealtimeOrderBook
              marketId={market.conditionId || market.id}
              assetId={market.yesTokenId || market.id}
              midpoint={market.midpoint}
            />

            {/* Whale Alerts */}
            <WhaleAlert marketId={market.conditionId || market.id} threshold={5000} />
          </div>
        </div>

        {/* Trade Feed & Commentary */}
        <div className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Trades */}
            <LiveTradeFeed marketId={market.conditionId || market.id} limit={15} />

            {/* Market Commentary */}
            <MarketCommentary marketId={market.conditionId || market.id} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
