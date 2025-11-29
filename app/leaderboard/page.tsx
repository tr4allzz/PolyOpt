'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, TrendingUp, Users, DollarSign } from 'lucide-react'
import { LeaderboardTable } from '@/components/leaderboard/leaderboard-table'
import { LeaderboardFilters, FilterValues } from '@/components/leaderboard/leaderboard-filters'
import { Pagination } from '@/components/ui/pagination'

interface LeaderboardEntry {
  rank: number
  walletAddress: string
  totalRewards: number
  payoutCount: number
  memberSince: string | null
}

interface LeaderboardData {
  entries: LeaderboardEntry[]
  summary: {
    totalLPs: number
    totalEarnings: number
    averageReward: number
    lastUpdated: string | null
  }
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

const ITEMS_PER_PAGE = 20

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<FilterValues>({
    search: '',
    minRewards: '',
    maxRewards: '',
    minPayouts: '',
    rankRange: '',
    sortBy: '',
    sortOrder: '',
  })

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true)
      try {
        const offset = (currentPage - 1) * ITEMS_PER_PAGE
        const params = new URLSearchParams({
          limit: ITEMS_PER_PAGE.toString(),
          offset: offset.toString(),
        })

        // Add filter parameters if they exist
        if (filters.search) params.append('search', filters.search)
        if (filters.minRewards) params.append('minRewards', filters.minRewards)
        if (filters.maxRewards) params.append('maxRewards', filters.maxRewards)
        if (filters.minPayouts) params.append('minPayouts', filters.minPayouts)
        if (filters.rankRange) params.append('rankRange', filters.rankRange)
        if (filters.sortBy) params.append('sortBy', filters.sortBy)
        if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)

        const response = await fetch(`/api/leaderboard?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data')
        }
        const leaderboardData = await response.json()
        setData(leaderboardData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [currentPage, filters])

  const handleFilterChange = useCallback((newFilters: FilterValues) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page when filters change
  }, [])

  const handleResetFilters = useCallback(() => {
    setFilters({
      search: '',
      minRewards: '',
      maxRewards: '',
      minPayouts: '',
      rankRange: '',
      sortBy: '',
      sortOrder: '',
    })
    setCurrentPage(1)
  }, [])

  // Memoize stats calculation - calculate only once when data changes
  const stats = useMemo(() => {
    if (!data || !data.entries) return null

    return {
      totalTraders: data.summary.totalLPs,
      totalRewards: data.summary.totalEarnings,
      avgReward: data.summary.averageReward,
      topTraderRewards: data.entries[0]?.totalRewards || 0,
    }
  }, [data])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Top Traders Leaderboard</h1>
          <p className="text-muted-foreground">
            Track the highest earning liquidity providers on Polymarket
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Traders</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTraders}</div>
                <p className="text-xs text-muted-foreground">
                  Active LP participants
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${stats.totalRewards.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Distributed to LPs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Reward</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${stats.avgReward.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per trader
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Trader</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${stats.topTraderRewards.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Highest earnings
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Leaderboard Table */}
        <Card>
          <CardHeader>
            <CardTitle>Leaderboard Rankings</CardTitle>
            <CardDescription>
              Top liquidity providers ranked by total verified rewards. Click wallet addresses to view their Polymarket profiles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className="mb-6">
              <LeaderboardFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={handleResetFilters}
              />
            </div>

            {/* Results */}
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading leaderboard...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-destructive">{error}</p>
              </div>
            ) : data && data.entries && data.entries.length > 0 ? (
              <>
                <LeaderboardTable entries={data.entries} />
                <div className="mt-6 pt-4 border-t">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(data.pagination.total / ITEMS_PER_PAGE)}
                    onPageChange={setCurrentPage}
                  />
                  <p className="text-center text-sm text-muted-foreground mt-3">
                    Showing {data.pagination.offset + 1}-{Math.min(data.pagination.offset + data.pagination.limit, data.pagination.total)} of {data.pagination.total} traders
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No data available yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Rewards will appear here once payouts are verified
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
