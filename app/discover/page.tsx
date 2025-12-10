'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Loader2, DollarSign, Users, Target, Filter, RefreshCw, Zap } from 'lucide-react'
import Link from 'next/link'
import { formatUSD } from '@/lib/polymarket/utils'

interface MarketOpportunity {
  marketId: string
  question: string
  rewardPool: number
  estimatedCompetition: number
  estimatedDailyReward: number
  capitalEfficiency: number
  competitionLevel: 'Low' | 'Medium' | 'High'
  recommendedCapital: number
}

interface OptimizedResult {
  market: {
    id: string
    question: string
    rewardPool: number
  }
  metrics: {
    expectedAPY: number
    expectedDailyReward: number
    expectedMonthlyReward: number
  }
  recommendation: {
    buyOrder: { price: string }
    sellOrder: { price: string }
  }
}

export default function DiscoverPage() {
  const [capital, setCapital] = useState(100)
  const [opportunities, setOpportunities] = useState<MarketOpportunity[]>([])
  const [optimizedResults, setOptimizedResults] = useState<OptimizedResult[]>([])
  const [loading, setLoading] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'opportunities' | 'optimized'>('opportunities')

  // Filters
  const [maxCapital, setMaxCapital] = useState<number>(1000)
  const [competitionLevel, setCompetitionLevel] = useState<string>('all')
  const [minRewardPool, setMinRewardPool] = useState<number>(0)
  const [resultsLimit, setResultsLimit] = useState<number>(50)

  const fetchOpportunities = async () => {
    setLoading(true)
    try {
      const filters: any = {}
      if (maxCapital > 0) filters.maxCapital = maxCapital
      if (competitionLevel !== 'all') filters.competitionLevel = competitionLevel
      if (minRewardPool > 0) filters.minRewardPool = minRewardPool

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capital,
          limit: resultsLimit,
          useRealCompetition: true, // Always use real competition data
          filters: Object.keys(filters).length > 0 ? filters : undefined,
        }),
      })

      const data = await response.json()
      setOpportunities(data.opportunities || [])
    } catch (error) {
      console.error('Error fetching opportunities:', error)
    }
    setLoading(false)
  }

  const optimizeAllMarkets = async () => {
    if (!capital || capital <= 0 || opportunities.length === 0) return

    setOptimizing(true)
    setViewMode('optimized')
    const results: OptimizedResult[] = []

    try {
      // Take top 10 opportunities for optimization
      const marketsToOptimize = opportunities.slice(0, 10)

      for (const opp of marketsToOptimize) {
        try {
          const response = await fetch('/api/optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              capital: capital,
              marketId: opp.marketId,
              strategy: 'balanced',
            }),
          })

          if (response.ok) {
            const data = await response.json()
            results.push(data)
          }
        } catch (error) {
          console.error(`Error optimizing market ${opp.marketId}:`, error)
        }
      }

      // Sort by expected APY
      results.sort((a, b) => b.metrics.expectedAPY - a.metrics.expectedAPY)
      setOptimizedResults(results)
    } catch (error) {
      console.error('Error optimizing markets:', error)
    }
    setOptimizing(false)
  }

  useEffect(() => {
    fetchOpportunities()
  }, [])

  const getCompetitionColor = (level: string) => {
    switch (level) {
      case 'Low': return 'bg-green-500'
      case 'Medium': return 'bg-yellow-500'
      case 'High': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Discover Markets</h1>
          <p className="text-muted-foreground">
            Find the best opportunities for your capital. We analyze competition, ROI, and rewards to help you maximize earnings.
          </p>
        </div>

        {/* Capital Input & Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Capital & Filters</CardTitle>
            <CardDescription>
              Enter your available capital and set filters to find the best markets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Capital Input */}
            <div>
              <Label htmlFor="capital">Available Capital ($)</Label>
              <div className="flex gap-4 mt-2">
                <Input
                  id="capital"
                  type="number"
                  value={capital}
                  onChange={(e) => setCapital(Number(e.target.value))}
                  min={10}
                  max={1000000}
                  className="flex-1"
                />
                <Button onClick={fetchOpportunities} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Find Opportunities
                    </>
                  )}
                </Button>
                <Button
                  onClick={optimizeAllMarkets}
                  disabled={optimizing || loading || opportunities.length === 0}
                  variant="secondary"
                >
                  {optimizing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Optimize Top 10
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                We'll find markets where ${capital} can earn meaningful rewards
              </p>
            </div>

            {/* Filter Toggle */}
            <div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="w-full"
              >
                <Filter className="mr-2 h-4 w-4" />
                {showFilters ? 'Hide' : 'Show'} Advanced Filters
              </Button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div>
                  <Label htmlFor="maxCapital">Max Recommended Capital (${maxCapital})</Label>
                  <Slider
                    id="maxCapital"
                    min={10}
                    max={5000}
                    step={10}
                    value={[maxCapital]}
                    onValueChange={([value]) => setMaxCapital(value)}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Only show markets where you need ≤ ${maxCapital} to be competitive
                  </p>
                </div>

                <div>
                  <Label htmlFor="competitionLevel">Competition Level</Label>
                  <Select value={competitionLevel} onValueChange={setCompetitionLevel}>
                    <SelectTrigger id="competitionLevel" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="Low">Low Competition</SelectItem>
                      <SelectItem value="Medium">Medium Competition</SelectItem>
                      <SelectItem value="High">High Competition</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="minRewardPool">Min Reward Pool ($/day) ({minRewardPool})</Label>
                  <Slider
                    id="minRewardPool"
                    min={0}
                    max={100}
                    step={5}
                    value={[minRewardPool]}
                    onValueChange={([value]) => setMinRewardPool(value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="resultsLimit">Results to Show</Label>
                  <Select value={resultsLimit.toString()} onValueChange={(v) => setResultsLimit(Number(v))}>
                    <SelectTrigger id="resultsLimit" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20 markets</SelectItem>
                      <SelectItem value="50">50 markets</SelectItem>
                      <SelectItem value="100">100 markets</SelectItem>
                      <SelectItem value="200">200 markets</SelectItem>
                      <SelectItem value="500">500 markets (slower)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>
            )}
          </CardContent>
        </Card>

        {/* View Mode Toggle */}
        {optimizedResults.length > 0 && (
          <div className="flex gap-2 mb-6">
            <Button
              variant={viewMode === 'opportunities' ? 'default' : 'outline'}
              onClick={() => setViewMode('opportunities')}
            >
              Opportunities ({opportunities.length})
            </Button>
            <Button
              variant={viewMode === 'optimized' ? 'default' : 'outline'}
              onClick={() => setViewMode('optimized')}
            >
              Optimized Results ({optimizedResults.length})
            </Button>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : viewMode === 'opportunities' ? (
          opportunities.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No opportunities found. Try adjusting your filters.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">
                  {opportunities.length} Opportunities Found
                </h2>
                <p className="text-sm text-muted-foreground">
                  Best Daily: ${opportunities[0]?.estimatedDailyReward.toFixed(2)}/day
                </p>
              </div>

              {opportunities.map((opp, index) => (
                <Card key={opp.marketId} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-mono">
                            #{index + 1}
                          </Badge>
                          <Badge className={getCompetitionColor(opp.competitionLevel)}>
                            {opp.competitionLevel} Competition
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{opp.question}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="flex items-center text-sm text-muted-foreground mb-1">
                          <DollarSign className="h-4 w-4 mr-1" />
                          Your Daily
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          ${opp.estimatedDailyReward.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${(opp.estimatedDailyReward * 30).toFixed(0)}/mo
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center text-sm text-muted-foreground mb-1">
                          <Users className="h-4 w-4 mr-1" />
                          Competition
                        </div>
                        <div className="text-2xl font-bold">
                          {opp.estimatedCompetition.toFixed(0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Q_min total</div>
                      </div>

                      <div>
                        <div className="flex items-center text-sm text-muted-foreground mb-1">
                          <Target className="h-4 w-4 mr-1" />
                          Pool
                        </div>
                        <div className="text-2xl font-bold text-purple-600">
                          ${opp.rewardPool}
                        </div>
                        <div className="text-xs text-muted-foreground">/day</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        {capital >= opp.recommendedCapital ? (
                          <span className="text-green-600">
                            Your ${capital} is sufficient
                          </span>
                        ) : (
                          <span className="text-yellow-600">
                            Recommended: ${opp.recommendedCapital.toFixed(0)}
                          </span>
                        )}
                      </div>
                      <Link href={`/markets/${opp.marketId}`}>
                        <Button>View Market</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Optimization Results</h2>
              <p className="text-sm text-muted-foreground">
                Sorted by expected APY (highest to lowest). These are optimized order placements for ${capital}.
              </p>
            </div>

            {optimizedResults.map((result, index) => (
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
                      <p className="text-xs text-muted-foreground">Buy YES at</p>
                      <p className="text-lg font-bold text-green-600">
                        {result.recommendation.buyOrder.price}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Buy NO at</p>
                      <p className="text-lg font-bold text-red-600">
                        {result.recommendation.sellOrder.price}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <Link href={`/markets/${result.market.id}`}>
                      <Button variant="outline" size="sm">
                        View Market Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
