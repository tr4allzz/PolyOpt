'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Trophy,
  DollarSign,
  TrendingUp,
  ExternalLink,
  ArrowLeft,
  Copy,
  Check,
  Wallet,
  BarChart3,
} from 'lucide-react'
import { formatUSD } from '@/lib/polymarket/utils'
import Link from 'next/link'
import { WalletAvatar } from '@/components/ui/wallet-avatar'

interface ProfileData {
  address: string
  summary: {
    totalRewards: number
    rewardCount: number
    rank: number | null
    totalLPs: number | null
    positionValue: number
    positionPnl: number
    activePositions: number
  }
  positions: Array<{
    asset: string
    market: string
    title: string
    outcome: string
    size: number
    avgPrice: number
    currentPrice: number
    currentValue: number
    cashPnl: number
    percentPnl: number
  }>
}

export default function LPProfilePage() {
  const params = useParams()
  const address = params.address as string

  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function fetchProfile() {
      if (!address) return

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/community/profile?address=${address}`)
        if (!response.ok) {
          throw new Error('Failed to fetch profile')
        }
        const result = await response.json()
        setData(result)
      } catch (err: any) {
        setError(err.message || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [address])

  const copyAddress = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-16">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading profile...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-16">
          <div className="max-w-2xl mx-auto text-center">
            <Wallet className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Profile Not Found</h1>
            <p className="text-muted-foreground mb-6">
              {error || 'Could not load data for this address'}
            </p>
            <Link href="/community">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Community
              </Button>
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
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link href="/community" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Community
          </Link>

          {/* Profile Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <WalletAvatar address={address} size="xl" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold font-mono">{shortAddress}</h1>
                      <Button variant="ghost" size="sm" onClick={copyAddress}>
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <a
                        href={`https://polygonscan.com/address/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                    </div>
                    {data.summary.rank && data.summary.rank > 0 && (
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="secondary">
                          <Trophy className="w-3 h-3 mr-1" />
                          Rank #{data.summary.rank}
                        </Badge>
                        {data.summary.totalLPs && (
                          <span className="text-sm text-muted-foreground">
                            of {data.summary.totalLPs.toLocaleString()} LPs
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Total Rewards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {formatUSD(data.summary.totalRewards)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.summary.rewardCount} payouts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  Leaderboard Rank
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {data.summary.rank && data.summary.rank > 0 ? `#${data.summary.rank}` : 'Unranked'}
                </p>
                {data.summary.rank && data.summary.rank > 0 && data.summary.totalLPs && (
                  <p className="text-xs text-muted-foreground">
                    Top {((data.summary.rank / data.summary.totalLPs) * 100).toFixed(1)}%
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  Position Value
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatUSD(data.summary.positionValue)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.summary.activePositions} active positions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Position P&L
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${data.summary.positionPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.summary.positionPnl >= 0 ? '+' : ''}{formatUSD(data.summary.positionPnl)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Positions */}
          {data.positions.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Active Positions</CardTitle>
                <CardDescription>Current market positions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.positions.map((position, i) => (
                    <div
                      key={position.asset || i}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{position.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Badge variant={position.outcome === 'Yes' ? 'default' : 'secondary'} className="text-xs">
                            {position.outcome}
                          </Badge>
                          <span>{position.size.toFixed(0)} shares</span>
                          <span>@ {formatUSD(position.avgPrice)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatUSD(position.currentValue)}</p>
                        <p className={`text-xs ${position.cashPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {position.cashPnl >= 0 ? '+' : ''}{formatUSD(position.cashPnl)}
                          {' '}({position.percentPnl >= 0 ? '+' : ''}{position.percentPnl.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </main>

      <Footer />
    </div>
  )
}
