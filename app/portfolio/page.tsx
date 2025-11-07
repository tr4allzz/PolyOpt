'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatUSD } from '@/lib/polymarket/utils'
import Link from 'next/link'
import { ExternalLink, Loader2, Scan, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiCredentialsForm } from '@/components/settings/api-credentials-form'
import { WalletCredentialsGenerator } from '@/components/settings/wallet-credentials-generator'

export default function PortfolioPage() {
  const { address, isConnected } = useAccount()
  const [positions, setPositions] = useState<any>(null)
  const [rewards, setRewards] = useState<any>(null)
  const [pendingRewards, setPendingRewards] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingRewards, setLoadingRewards] = useState(false)
  const [loadingPending, setLoadingPending] = useState(false)
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanResults, setScanResults] = useState<any>(null)
  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null)
  const [showCredentialsForm, setShowCredentialsForm] = useState(false)

  useEffect(() => {
    if (!isConnected || !address) {
      setPositions(null)
      setRewards(null)
      setPendingRewards(null)
      setRecommendations(null)
      setHasCredentials(null)
      return
    }

    fetchPositions()
    fetchRewards()
    fetchPendingRewards()
    fetchRecommendations()
    checkCredentials()
  }, [address, isConnected])

  async function checkCredentials() {
    if (!address) return

    try {
      const response = await fetch(`/api/user/credentials?walletAddress=${address}`)
      if (response.ok) {
        const data = await response.json()
        setHasCredentials(data.hasCredentials)
      }
    } catch (error) {
      console.error('Error checking credentials:', error)
    }
  }

  async function fetchPositions() {
    if (!address) return

    setLoading(true)
    try {
      const response = await fetch(`/api/user/positions?walletAddress=${address}`)
      if (response.ok) {
        const data = await response.json()
        setPositions(data)
      }
    } catch (error) {
      console.error('Error fetching positions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchRewards() {
    if (!address) return

    setLoadingRewards(true)
    try {
      const response = await fetch(`/api/user/rewards?walletAddress=${address}`)
      if (response.ok) {
        const data = await response.json()
        setRewards(data)
      }
    } catch (error) {
      console.error('Error fetching rewards:', error)
    } finally {
      setLoadingRewards(false)
    }
  }

  async function fetchPendingRewards() {
    if (!address) return

    setLoadingPending(true)
    try {
      const response = await fetch(`/api/user/pending-rewards?walletAddress=${address}`)
      if (response.ok) {
        const data = await response.json()
        setPendingRewards(data)
      }
    } catch (error) {
      console.error('Error fetching pending rewards:', error)
    } finally {
      setLoadingPending(false)
    }
  }

  async function fetchRecommendations() {
    if (!address) return

    setLoadingRecommendations(true)
    try {
      const response = await fetch(`/api/user/recommendations?walletAddress=${address}`)
      if (response.ok) {
        const data = await response.json()
        setRecommendations(data)
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    } finally {
      setLoadingRecommendations(false)
    }
  }

  async function scanPositions() {
    if (!address) return

    setScanning(true)
    setScanResults(null)
    try {
      const response = await fetch('/api/user/scan-positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`Scan complete:`, data)
        setScanResults(data)
        // Refresh positions and rewards after scan
        setLoading(true)
        await fetchPositions()
        await fetchRewards()
        await fetchPendingRewards()
        await fetchRecommendations()
      } else {
        const errorData = await response.json()
        console.error('Scan failed:', errorData)
        alert(`Scan failed: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error scanning positions:', error)
      alert('Error scanning positions. Please check the console for details.')
    } finally {
      setScanning(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
            <p className="text-muted-foreground">
              Connect your wallet to view your portfolio
            </p>
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
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Portfolio</h1>
              <p className="text-muted-foreground">
                Your active positions and expected rewards
              </p>
            </div>
            <div className="flex gap-2">
              {hasCredentials === false && (
                <Button onClick={() => setShowCredentialsForm(!showCredentialsForm)} variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  {showCredentialsForm ? 'Hide' : 'Setup API'}
                </Button>
              )}
              <Button onClick={scanPositions} disabled={scanning || loading || hasCredentials === false}>
                {scanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Scan className="mr-2 h-4 w-4" />
                    Scan for Positions
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* API Credentials Setup */}
        {showCredentialsForm && address && (
          <div className="mb-8 space-y-6">
            {/* Automatic Generation (Recommended) */}
            <WalletCredentialsGenerator
              onCredentialsGenerated={() => {
                setShowCredentialsForm(false);
                checkCredentials();
              }}
            />

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or enter manually
                </span>
              </div>
            </div>

            {/* Manual Entry */}
            <ApiCredentialsForm
              walletAddress={address}
              onCredentialsSaved={() => {
                setShowCredentialsForm(false);
                checkCredentials();
              }}
            />
          </div>
        )}

        {/* Need Credentials Message */}
        {hasCredentials === false && !showCredentialsForm && (
          <Card className="mb-8 border-yellow-500 bg-yellow-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <Settings className="h-5 w-5" />
                API Credentials Required
              </CardTitle>
              <CardDescription>
                To automatically scan for your positions, you need to configure your Polymarket API credentials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowCredentialsForm(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Setup API Credentials
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Scan Results */}
        {scanResults && scanResults.marketsWithPositions && scanResults.marketsWithPositions.length > 0 && (
          <Card className="mb-8 border-blue-500 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5 text-blue-600" />
                Markets Detected with Your Holdings
              </CardTitle>
              <CardDescription>
                {scanResults.message}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {scanResults.marketsWithPositions.map((market: any) => (
                <div key={market.id} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div className="flex-1">
                    <p className="font-medium">{market.question}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Q-Score</p>
                        <p className="text-sm font-semibold">{market.qMin?.toFixed(2) || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Max Daily</p>
                        <p className="text-sm font-semibold text-orange-600">{formatUSD(market.estimatedDaily || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Capital</p>
                        <p className="text-sm font-semibold">{formatUSD(market.capitalDeployed || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Orders</p>
                        <p className="text-sm font-semibold">{market.orderCount || 0}</p>
                      </div>
                    </div>
                  </div>
                  <Link href={`/markets/${market.id}`}>
                    <Button size="sm">
                      View Details
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              ))}
              <p className="text-sm text-muted-foreground pt-2">
                {scanResults.positionsCalculated} positions calculated and saved to your portfolio.
                {scanResults.totalMarkets > scanResults.positionsCalculated &&
                  ` (${scanResults.totalMarkets - scanResults.positionsCalculated} markets skipped - no rewards)`
                }
              </p>
            </CardContent>
          </Card>
        )}

        {/* Actual Rewards Earned */}
        {rewards && rewards.summary && (
          <Card className="mb-8 border-green-500 bg-green-50/50">
            <CardHeader>
              <CardTitle className="text-green-800">💰 Total Rewards Earned</CardTitle>
              <CardDescription>
                Actual rewards paid by Polymarket for providing liquidity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600 mb-4">
                {formatUSD(rewards.summary.totalEarned)}
              </div>
              <div className="text-sm text-muted-foreground">
                {rewards.summary.totalRewards} reward payments received
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Rewards (Accrued but not yet paid) */}
        {pendingRewards && pendingRewards.pendingRewards > 0 && (
          <Card className="mb-8 border-blue-500 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-blue-800">⏳ Pending Rewards</CardTitle>
              <CardDescription>
                Estimated rewards accrued but not yet paid out
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600 mb-4">
                ~{formatUSD(pendingRewards.pendingRewards)}
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Accrued over {pendingRewards.daysElapsed?.toFixed(1)} days
                  {pendingRewards.lastPayoutDate && (
                    <> since last payout on {new Date(pendingRewards.lastPayoutDate).toLocaleDateString()}</>
                  )}
                </div>
                {pendingRewards.marketSharePercent && (
                  <div className="text-sm font-medium text-blue-700 bg-blue-100 rounded px-3 py-2">
                    📊 Your historical market share: {pendingRewards.marketSharePercent.toFixed(1)}%
                    <div className="text-xs text-muted-foreground mt-1">
                      {pendingRewards.marketShareSource}
                    </div>
                  </div>
                )}
                <div className="text-xs text-muted-foreground border-t pt-2">
                  ℹ️ {pendingRewards.estimateNote}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Optimization Recommendations */}
        {recommendations && recommendations.recommendations && recommendations.recommendations.length > 0 && (
          <Card className="mb-8 border-purple-500 bg-purple-50/50">
            <CardHeader>
              <CardTitle className="text-purple-800">🎯 Optimization Recommendations</CardTitle>
              <CardDescription>
                Personalized insights to maximize your rewards
                {recommendations.summary?.totalPotentialGain > 0 && (
                  <> • Potential: +{formatUSD(recommendations.summary.totalPotentialGain)}/day (+{formatUSD(recommendations.summary.potentialMonthlyGain)}/month)</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.recommendations.slice(0, 5).map((rec: any, index: number) => (
                <div key={index} className={`p-4 rounded border ${
                  rec.priority === 'high' ? 'border-red-300 bg-red-50' :
                  rec.priority === 'medium' ? 'border-yellow-300 bg-yellow-50' :
                  'border-gray-300 bg-gray-50'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                          {rec.priority.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {rec.type === 'rebalance' && '↔️ Rebalance'}
                          {rec.type === 'increase' && '⬆️ Increase'}
                          {rec.type === 'exit' && '🚪 Exit'}
                          {rec.type === 'opportunity' && '✨ Opportunity'}
                          {rec.type === 'diversify' && '📊 Diversify'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm">{rec.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                      <p className="text-sm font-medium mt-2 text-purple-700">
                        💡 {rec.action}
                      </p>
                      <p className="text-xs text-green-600 font-medium mt-1">
                        {rec.impact}
                      </p>
                    </div>
                    {rec.marketId && (
                      <Link href={`/markets/${rec.marketId}`}>
                        <Button size="sm" variant="outline">
                          View Market
                          <ExternalLink className="ml-2 h-3 w-3" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              {recommendations.recommendations.length > 5 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  +{recommendations.recommendations.length - 5} more recommendations available
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Debug info if scan found positions but they don't show up */}
        {!loading && scanResults && scanResults.positionsCalculated > 0 && (!positions || positions.summary.totalMarkets === 0) && (
          <Card className="mb-8 border-yellow-500 bg-yellow-50/50">
            <CardHeader>
              <CardTitle className="text-yellow-800">Positions Not Loading</CardTitle>
              <CardDescription>
                The scan found {scanResults.positionsCalculated} positions but they're not appearing in the list below.
                This may indicate a database sync issue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => { fetchPositions(); fetchRewards(); fetchPendingRewards(); fetchRecommendations(); }}>
                Retry Fetching Positions
              </Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading portfolio...</p>
          </div>
        ) : positions && positions.summary ? (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-muted-foreground">Portfolio Overview</h2>
              <p className="text-sm text-muted-foreground">Your active positions and earning potential</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Markets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{positions.summary.totalMarkets}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Max Daily (100%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {formatUSD(positions.summary.totalDailyReward)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">if no competition</p>
                </CardContent>
              </Card>

              {pendingRewards?.marketSharePercent && (
                <Card className="border-blue-500">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Your Market Share
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-blue-600">
                      {pendingRewards.marketSharePercent.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ~{formatUSD(positions.summary.totalDailyReward * (pendingRewards.marketSharePercent / 100))}/day realistic
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Active Positions</h2>
              {positions.positions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No active positions found</p>
                  </CardContent>
                </Card>
              ) : (
                positions.positions.map((position: any) => (
                  <Card key={position.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {position.market.question}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {position.orderCount} active orders
                          </CardDescription>
                        </div>
                        {position.market.active ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Q-Score</p>
                          <p className="text-lg font-bold">{position.qMin.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Max Daily</p>
                          <p className="text-lg font-bold text-orange-600">
                            {formatUSD(position.estimatedDaily)}
                          </p>
                          <p className="text-xs text-muted-foreground">100% share</p>
                        </div>
                        {pendingRewards?.marketSharePercent && (
                          <div>
                            <p className="text-xs text-muted-foreground">Realistic Daily</p>
                            <p className="text-lg font-bold text-blue-600">
                              {formatUSD(position.estimatedDaily * (pendingRewards.marketSharePercent / 100))}
                            </p>
                            <p className="text-xs text-muted-foreground">{pendingRewards.marketSharePercent.toFixed(0)}% share</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">Capital</p>
                          <p className="text-lg font-bold">
                            {formatUSD(position.capitalDeployed)}
                          </p>
                        </div>
                        <div>
                          <Link
                            href={`/markets/${position.marketId}`}
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            View Market
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <p className="text-lg font-semibold">No Positions Calculated Yet</p>
              <p className="text-muted-foreground max-w-md mx-auto">
                To see your positions here, visit market pages from the Markets tab and calculate your Q-scores.
                Your positions will automatically appear in your portfolio.
              </p>
              <Link href="/markets">
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                  Browse Markets
                </button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  )
}
