'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Users, RefreshCw, ChevronRight } from 'lucide-react'
import { formatUSD } from '@/lib/polymarket/utils'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { WalletAvatar } from '@/components/ui/wallet-avatar'

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

export function EnhancedLeaderboardTable() {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaderboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/leaderboard?limit=50')
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard')
      }
      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message || 'Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Loading leaderboard...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchLeaderboard} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium mb-2">No leaderboard data available</p>
            <p className="text-sm text-muted-foreground">
              Leaderboard data is synced periodically. Check back later.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>LP Leaderboard</CardTitle>
            <CardDescription>
              Top liquidity providers by total rewards earned
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {data.summary.lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Updated {formatDistanceToNow(new Date(data.summary.lastUpdated), { addSuffix: true })}
              </span>
            )}
            <Button onClick={fetchLeaderboard} variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Total LPs</p>
            <p className="text-lg font-bold">{data.summary.totalLPs.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Paid Out</p>
            <p className="text-lg font-bold text-green-600">
              {formatUSD(data.summary.totalEarnings)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Avg Reward</p>
            <p className="text-lg font-bold">{formatUSD(data.summary.averageReward)}</p>
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="space-y-2">
          {data.entries.map((entry) => (
            <Link
              key={entry.walletAddress}
              href={`/community/${entry.walletAddress}`}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                entry.rank <= 3
                  ? 'bg-gradient-to-r from-yellow-50/50 to-amber-50/50 border border-yellow-200/50 hover:from-yellow-100/50 hover:to-amber-100/50'
                  : 'bg-muted/30 hover:bg-muted/50'
              }`}
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-8 text-center">
                {entry.rank <= 3 ? (
                  <span className="text-lg font-bold">
                    {entry.rank === 1 && '🥇'}
                    {entry.rank === 2 && '🥈'}
                    {entry.rank === 3 && '🥉'}
                  </span>
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">#{entry.rank}</span>
                )}
              </div>

              {/* Avatar */}
              <WalletAvatar address={entry.walletAddress} size="sm" />

              {/* Wallet & Stats */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">
                    {entry.walletAddress.slice(0, 6)}...{entry.walletAddress.slice(-4)}
                  </span>
                  {entry.rank <= 10 && (
                    <Badge variant="secondary" className="text-xs">
                      Top 10
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{entry.payoutCount} payouts</span>
                </div>
              </div>

              {/* Total Rewards */}
              <div className="text-right flex items-center gap-2">
                <p className="text-lg font-bold text-green-600">
                  {formatUSD(entry.totalRewards)}
                </p>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>

        {data.pagination.hasMore && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Showing {data.entries.length} of {data.pagination.total} LPs
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
