'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { MarketList } from '@/components/markets/market-list'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, LayoutGrid, List, SlidersHorizontal, X } from 'lucide-react'

type SortOption = 'rewards' | 'volume' | 'liquidity' | 'endDate' | 'apy'
type ViewMode = 'grid' | 'list'

interface Market {
  id: string
  question: string
  midpoint: number
  maxSpread: number
  minSize: number
  rewardPool: number
  volume: number
  liquidity: number
  endDate: string
  active: boolean
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('rewards')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [minReward, setMinReward] = useState<number | null>(null)
  const [rewardTier, setRewardTier] = useState<string>('all')

  useEffect(() => {
    async function fetchMarkets() {
      try {
        const response = await fetch('/api/markets')
        if (response.ok) {
          const data = await response.json()
          setMarkets(data.markets)
        }
      } catch (error) {
        console.error('Error fetching markets:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMarkets()
  }, [])

  const filteredAndSortedMarkets = useMemo(() => {
    let result = [...markets]

    // Search filter
    if (search) {
      result = result.filter((market) =>
        market.question.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Reward tier filter
    if (rewardTier !== 'all') {
      result = result.filter((market) => {
        if (rewardTier === 'high') return market.rewardPool >= 100
        if (rewardTier === 'medium') return market.rewardPool >= 25 && market.rewardPool < 100
        if (rewardTier === 'low') return market.rewardPool < 25
        return true
      })
    }

    // Min reward filter
    if (minReward) {
      result = result.filter((market) => market.rewardPool >= minReward)
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'rewards':
          return b.rewardPool - a.rewardPool
        case 'volume':
          return b.volume - a.volume
        case 'liquidity':
          return b.liquidity - a.liquidity
        case 'endDate':
          return new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
        case 'apy':
          const apyA = a.liquidity > 0 ? (a.rewardPool * 365) / a.liquidity : 0
          const apyB = b.liquidity > 0 ? (b.rewardPool * 365) / b.liquidity : 0
          return apyB - apyA
        default:
          return 0
      }
    })

    return result
  }, [markets, search, sortBy, rewardTier, minReward])

  const stats = useMemo(() => {
    const totalRewards = markets.reduce((sum, m) => sum + m.rewardPool, 0)
    const highRewardCount = markets.filter((m) => m.rewardPool >= 100).length
    return { total: markets.length, totalRewards, highRewardCount }
  }, [markets])

  const activeFiltersCount = [
    rewardTier !== 'all',
    minReward !== null,
  ].filter(Boolean).length

  const clearFilters = () => {
    setRewardTier('all')
    setMinReward(null)
    setSearch('')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Reward Markets</h1>
          <p className="text-muted-foreground mb-4">
            Browse all active markets with liquidity provider rewards
          </p>

          {/* Stats */}
          {!loading && (
            <div className="flex gap-4 flex-wrap">
              <Badge variant="outline" className="text-sm py-1 px-3">
                {stats.total} markets
              </Badge>
              <Badge variant="outline" className="text-sm py-1 px-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                ${stats.totalRewards.toLocaleString()} daily rewards
              </Badge>
              <Badge variant="outline" className="text-sm py-1 px-3">
                {stats.highRewardCount} high reward markets
              </Badge>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mb-6 space-y-4">
          {/* Search and View Toggle */}
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search markets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rewards">Highest Rewards</SelectItem>
                <SelectItem value="apy">Highest APY</SelectItem>
                <SelectItem value="volume">Highest Volume</SelectItem>
                <SelectItem value="liquidity">Highest Liquidity</SelectItem>
                <SelectItem value="endDate">Ending Soon</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="flex gap-4 flex-wrap p-4 bg-muted/50 rounded-lg items-end">
              <div>
                <label className="text-sm font-medium mb-1 block">Reward Tier</label>
                <Select value={rewardTier} onValueChange={setRewardTier}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="high">High ($100+)</SelectItem>
                    <SelectItem value="medium">Medium ($25-$100)</SelectItem>
                    <SelectItem value="low">Low (&lt;$25)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Min Daily Reward</label>
                <Input
                  type="number"
                  placeholder="$0"
                  value={minReward || ''}
                  onChange={(e) => setMinReward(e.target.value ? Number(e.target.value) : null)}
                  className="w-[120px]"
                />
              </div>

              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Results count */}
        {!loading && search && (
          <p className="text-sm text-muted-foreground mb-4">
            Found {filteredAndSortedMarkets.length} markets matching "{search}"
          </p>
        )}

        {/* Market list */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[350px] bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <MarketList markets={filteredAndSortedMarkets} viewMode={viewMode} />
        )}
      </main>

      <Footer />
    </div>
  )
}
