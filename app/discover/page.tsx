'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Filter, SlidersHorizontal, TrendingUp, Search } from 'lucide-react'
import { CapitalHeader } from '@/components/discover/capital-header'
import { MarketDrawer } from '@/components/discover/market-drawer'
import { MarketCard } from '@/components/markets/market-card'
import { formatUSD } from '@/lib/polymarket/utils'

interface Market {
  id: string
  question: string
  midpoint: number
  maxSpread?: number
  minSize?: number
  rewardPool: number
  volume: number
  liquidity: number
  endDate: Date | string
  active: boolean
  clobTokenIds: string[]
  conditionId?: string
  volume24h?: number
}

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

export default function DiscoverPage() {
  const { address } = useAccount()

  // Capital & search state
  const [capital, setCapital] = useState('')
  const [sortBy, setSortBy] = useState('reward')
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Markets data
  const [markets, setMarkets] = useState<Market[]>([])
  const [opportunities, setOpportunities] = useState<MarketOpportunity[]>([])

  // Drawer state
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Filters
  const [competitionLevel, setCompetitionLevel] = useState<string>('all')
  const [minRewardPool, setMinRewardPool] = useState<number>(0)

  // Fetch markets on load
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await fetch('/api/markets?limit=100&active=true')
        if (response.ok) {
          const data = await response.json()
          setMarkets(data.markets || [])
        }
      } catch (error) {
        console.error('Error fetching markets:', error)
      }
    }
    fetchMarkets()
  }, [])

  // Search for opportunities
  const handleSearch = useCallback(async () => {
    const capitalNum = parseFloat(capital)
    if (!capitalNum || capitalNum <= 0) return

    setLoading(true)
    try {
      const filters: any = {}
      if (competitionLevel !== 'all') filters.competitionLevel = competitionLevel
      if (minRewardPool > 0) filters.minRewardPool = minRewardPool

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capital: capitalNum,
          limit: 50,
          useRealCompetition: true,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
        }),
      })

      const data = await response.json()
      setOpportunities(data.opportunities || [])
    } catch (error) {
      console.error('Error fetching opportunities:', error)
    }
    setLoading(false)
  }, [capital, competitionLevel, minRewardPool])

  // Open drawer with selected market
  const handleMarketClick = (market: Market) => {
    setSelectedMarket(market)
    setDrawerOpen(true)
  }

  // Find full market data for an opportunity
  const getMarketForOpportunity = (opp: MarketOpportunity): Market | undefined => {
    return markets.find(m => m.id === opp.marketId)
  }

  // Sort markets/opportunities
  const getSortedOpportunities = () => {
    const sorted = [...opportunities]
    switch (sortBy) {
      case 'reward':
        sorted.sort((a, b) => b.estimatedDailyReward - a.estimatedDailyReward)
        break
      case 'pool':
        sorted.sort((a, b) => b.rewardPool - a.rewardPool)
        break
      case 'competition':
        sorted.sort((a, b) => a.estimatedCompetition - b.estimatedCompetition)
        break
      case 'apy':
        sorted.sort((a, b) => b.capitalEfficiency - a.capitalEfficiency)
        break
    }
    return sorted
  }

  // Get displayed markets (either opportunities or all markets)
  const displayedOpportunities = opportunities.length > 0 ? getSortedOpportunities() : []

  // Filter markets for display when no search done
  const getFilteredMarkets = () => {
    let filtered = [...markets]

    // Apply filters
    if (minRewardPool > 0) {
      filtered = filtered.filter(m => m.rewardPool >= minRewardPool)
    }

    // Sort
    switch (sortBy) {
      case 'reward':
      case 'pool':
        filtered.sort((a, b) => b.rewardPool - a.rewardPool)
        break
      case 'apy':
        filtered.sort((a, b) => {
          const apyA = a.liquidity > 0 ? (a.rewardPool * 365) / a.liquidity : 0
          const apyB = b.liquidity > 0 ? (b.rewardPool * 365) / b.liquidity : 0
          return apyB - apyA
        })
        break
    }

    return filtered.slice(0, 50)
  }

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
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Discover & Trade</h1>
          <p className="text-muted-foreground">
            Find the best opportunities, optimize your strategy, and place orders - all in one place.
          </p>
        </div>

        {/* Capital Header */}
        <div className="mb-6">
          <CapitalHeader
            capital={capital}
            onCapitalChange={setCapital}
            onSearch={handleSearch}
            loading={loading}
            resultsCount={opportunities.length}
            sortBy={sortBy}
            onSortChange={setSortBy}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
          />
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label className="text-sm font-medium">Competition Level</Label>
                  <Select value={competitionLevel} onValueChange={setCompetitionLevel}>
                    <SelectTrigger className="mt-2">
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
                  <Label className="text-sm font-medium">
                    Min Reward Pool: {formatUSD(minRewardPool)}/day
                  </Label>
                  <Slider
                    min={0}
                    max={200}
                    step={10}
                    value={[minRewardPool]}
                    onValueChange={([value]) => setMinRewardPool(value)}
                    className="mt-4"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCompetitionLevel('all')
                      setMinRewardPool(0)
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Analyzing markets...</p>
            </div>
          </div>
        ) : opportunities.length > 0 ? (
          /* Opportunity Cards */
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {opportunities.length} Opportunities for {formatUSD(parseFloat(capital))}
              </h2>
              <p className="text-sm text-muted-foreground">
                Click any card to view details and place orders
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedOpportunities.map((opp, index) => {
                const market = getMarketForOpportunity(opp)
                if (!market) return null

                return (
                  <Card
                    key={opp.marketId}
                    className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
                    onClick={() => handleMarketClick(market)}
                  >
                    <CardContent className="pt-4">
                      {/* Rank & Competition */}
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="font-mono">
                          #{index + 1}
                        </Badge>
                        <Badge className={getCompetitionColor(opp.competitionLevel)}>
                          {opp.competitionLevel}
                        </Badge>
                      </div>

                      {/* Question */}
                      <h3 className="font-semibold text-sm line-clamp-2 mb-3 min-h-[2.5rem]">
                        {opp.question}
                      </h3>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-green-50 rounded-lg p-2 text-center">
                          <p className="text-lg font-bold text-green-600">
                            {formatUSD(opp.estimatedDailyReward)}
                          </p>
                          <p className="text-xs text-green-700">daily</p>
                        </div>
                        <div className="bg-muted rounded-lg p-2 text-center">
                          <p className="text-lg font-bold">
                            {formatUSD(opp.rewardPool)}
                          </p>
                          <p className="text-xs text-muted-foreground">pool</p>
                        </div>
                      </div>

                      {/* Capital fit indicator */}
                      <div className="text-xs text-center">
                        {parseFloat(capital) >= opp.recommendedCapital ? (
                          <span className="text-green-600">
                            Your capital is sufficient
                          </span>
                        ) : (
                          <span className="text-yellow-600">
                            Recommended: {formatUSD(opp.recommendedCapital)}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ) : markets.length > 0 ? (
          /* Default Market Grid */
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Browse Markets
              </h2>
              <p className="text-sm text-muted-foreground">
                Enter capital above to see personalized opportunities
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFilteredMarkets().map((market) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  onClick={() => handleMarketClick(market)}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Empty state */
          <Card>
            <CardContent className="py-16 text-center">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Markets Found</h3>
              <p className="text-muted-foreground">
                Enter your capital amount and click "Find" to discover opportunities.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Market Drawer */}
      <MarketDrawer
        market={selectedMarket}
        capital={parseFloat(capital) || 0}
        walletAddress={address || ''}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onOrderPlaced={() => {
          // Could refresh data here if needed
        }}
      />

      <Footer />
    </div>
  )
}
