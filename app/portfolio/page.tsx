'use client'

import { useState } from 'react'
import { useAccount, useSignMessage, useSignTypedData, useSwitchChain, useChainId } from 'wagmi'
import { polygon } from 'wagmi/chains'
import { useQueryClient } from '@tanstack/react-query'
import { usePortfolioData } from '@/hooks/usePortfolioData'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatUSD } from '@/lib/polymarket/utils'
import { Loader2, TrendingUp, DollarSign, Wallet, ExternalLink, RefreshCw, AlertCircle, LayoutDashboard, ListOrdered, PieChart, ArrowRight, Calendar } from 'lucide-react'
import { RewardsCalendar } from '@/components/portfolio/rewards-calendar'
import { StreakTracker } from '@/components/portfolio/streak-tracker'
import { ConnectButton } from '@/components/wallet/connect-button'
import { format } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'

export default function PortfolioPage() {
  const { address, isConnected } = useAccount()
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = usePortfolioData()
  const [isAutoSetting, setIsAutoSetting] = useState(false)
  const [autoSetupError, setAutoSetupError] = useState<string | null>(null)

  // Wagmi hooks for signing and chain switching
  const { signMessageAsync } = useSignMessage()
  const { signTypedDataAsync } = useSignTypedData()
  const { switchChainAsync } = useSwitchChain()
  const chainId = useChainId()

  const rewards = data?.rewards || null
  const activePositions = data?.activePositions || null
  const positions = data?.positions || null
  const openOrders = data?.openOrders || null
  const hasCredentials = data?.hasCredentials || false

  // Auto-setup API credentials
  const handleAutoSetup = async () => {
    if (!address) return

    setIsAutoSetting(true)
    setAutoSetupError(null)

    try {

      // Step 1: Authenticate with our API
      const authTimestamp = Date.now()
      const authMessage = `PolyOpt Authentication\n\nWallet: ${address}\nTimestamp: ${authTimestamp}\n\nThis signature proves you own this wallet and authorizes access to your data.`

      const authSignature = await signMessageAsync({
        message: authMessage,
      })


      // Step 2: Ensure we're on Polygon network before signing EIP-712 message
      if (chainId !== polygon.id) {
        toast.info('Switching to Polygon network...', { description: 'Please approve the network switch in your wallet' })
        await switchChainAsync({ chainId: polygon.id })
      }

      // Step 3: Sign EIP-712 message for Polymarket
      // According to Polymarket docs, nonce defaults to 0 for API key creation
      const timestamp = Math.floor(Date.now() / 1000)
      const nonce = 0 // Default nonce for creating new API credentials

      const domain = {
        name: 'ClobAuthDomain',
        version: '1',
        chainId: polygon.id, // Polygon (137)
      } as const

      const types = {
        ClobAuth: [
          { name: 'address', type: 'address' },
          { name: 'timestamp', type: 'string' },
          { name: 'nonce', type: 'uint256' },
          { name: 'message', type: 'string' },
        ],
      } as const

      const message = {
        address: address,
        timestamp: timestamp.toString(),
        nonce: BigInt(nonce),
        message: 'This message attests that I control the given wallet',
      }

      const polySignature = await signTypedDataAsync({
        domain,
        types,
        primaryType: 'ClobAuth',
        message,
      })


      // Step 4: Call generate-credentials endpoint with Polymarket signature
      const response = await fetch('/api/user/generate-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: address,
          signature: polySignature,
          timestamp: timestamp.toString(),
          nonce,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success('API credentials configured!', { description: 'Your open orders are now being tracked' })
        // Invalidate cache and force refetch
        await queryClient.invalidateQueries({ queryKey: ['portfolio-data'] })
        setAutoSetupError(null)
      } else {
        // Auto-setup failed, show manual setup option
        setAutoSetupError(result.error || 'Auto-setup failed. Please use manual setup.')
      }
    } catch (error: any) {
      console.error('Auto-setup error:', error)
      setAutoSetupError(error.message || 'Failed to auto-setup. Please use manual setup.')
    } finally {
      setIsAutoSetting(false)
    }
  }

  // Loading state
  if (isConnected && isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-16">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Loading Your Portfolio</h2>
              <p className="text-muted-foreground">
                Please sign the message in your wallet to verify ownership
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This is free and doesn't cost any gas • Signature cached for 4 minutes
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-16">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <AlertCircle className="h-16 w-16 mx-auto text-red-500" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Error Loading Portfolio</h2>
              <p className="text-muted-foreground">{error.message}</p>
            </div>
            <Button onClick={() => refetch?.()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Not connected state
  if (!isConnected) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-16">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold">Connect Your Wallet</h1>
              <p className="text-lg text-muted-foreground">
                See your Polymarket earnings and positions instantly
              </p>
            </div>
            <ConnectButton />
            <div className="pt-4 space-y-4">
              <p className="text-sm text-muted-foreground">What you'll see:</p>
              <div className="grid gap-3 text-left max-w-sm mx-auto">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Total rewards earned</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <ListOrdered className="h-5 w-5 text-blue-500" />
                  <span className="text-sm">Open orders earning rewards</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <PieChart className="h-5 w-5 text-purple-500" />
                  <span className="text-sm">Active positions & PnL</span>
                </div>
              </div>
            </div>
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
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Portfolio</h1>
              <p className="text-muted-foreground">Track your earnings and active positions</p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                Wallet: {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch?.()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="rewards" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Rewards</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <ListOrdered className="h-4 w-4" />
                <span className="hidden sm:inline">Orders</span>
                {!hasCredentials && (
                  <span className="relative ml-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="positions" className="flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                <span className="hidden sm:inline">Positions</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Earned
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatUSD(rewards?.summary?.totalEarned || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {rewards?.summary?.totalRewards || 0} total reward{rewards?.summary?.totalRewards !== 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Open Orders
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {openOrders?.summary?.totalOrders || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {openOrders?.summary?.totalOrders ? 'Earning rewards' : hasCredentials ? 'No open orders' : 'API setup required'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Last Reward
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {rewards?.rewards?.[0] ? (
                      <>
                        <div className="text-2xl font-bold text-green-600">
                          +{formatUSD(parseFloat(rewards.rewards[0].usdcSize || rewards.rewards[0].cash_amount || 0))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(rewards.rewards[0].timestamp * 1000), 'MMM d, yyyy')}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-muted-foreground">$0.00</div>
                        <p className="text-xs text-muted-foreground mt-1">No rewards yet</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Rewards */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Recent Rewards</CardTitle>
                      <CardDescription>Your latest earnings</CardDescription>
                    </div>
                    {rewards?.rewards?.length > 5 && (
                      <Link href="/history">
                        <Button variant="ghost" size="sm">
                          View All
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {rewards?.rewards?.length > 0 ? (
                    <div className="space-y-3">
                      {rewards.rewards.slice(0, 5).map((reward: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-3 border-b last:border-0"
                        >
                          <div className="space-y-1">
                            <p className="font-medium text-sm">
                              {reward.description || 'Market Maker Reward'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(reward.timestamp * 1000), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">
                              +{formatUSD(parseFloat(reward.usdcSize || reward.cash_amount || 0))}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-4">
                      <DollarSign className="h-12 w-12 mx-auto text-muted-foreground" />
                      <div>
                        <p className="font-medium mb-1">No rewards found</p>
                        <p className="text-sm text-muted-foreground mb-2">
                          Place limit orders on markets to start earning maker rewards
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 text-left max-w-md mx-auto">
                          <p className="text-sm font-medium text-blue-900 mb-2">
                            Connected with the wrong wallet?
                          </p>
                          <p className="text-xs text-blue-700 mb-2">
                            Make sure you're connected with the wallet you use for trading on Polymarket.
                          </p>
                          <p className="text-xs text-blue-600 font-mono">
                            Current: {address?.slice(0, 10)}...{address?.slice(-8)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <Button asChild>
                          <Link href="/discover">
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Start Earning
                          </Link>
                        </Button>
                        <Button asChild variant="outline">
                          <a
                            href="https://polymarket.com"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Go to Polymarket
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-primary/50 bg-gradient-to-r from-primary/5 to-transparent">
                <CardHeader>
                  <CardTitle>Ready to Trade?</CardTitle>
                  <CardDescription>
                    Find the best opportunities and place optimized orders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/discover" className="block">
                    <Button size="lg" className="w-full">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Discover & Trade
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Find markets, optimize strategy, and place orders - all in one place
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Rewards Tab */}
            <TabsContent value="rewards" className="space-y-6">
              {/* Calendar & Streak Section */}
              <div className="grid gap-4 lg:grid-cols-2">
                <RewardsCalendar rewards={rewards?.rewards || []} days={30} />
                <StreakTracker rewards={rewards?.rewards || []} />
              </div>

              {/* Rewards History */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Rewards History</CardTitle>
                      <CardDescription>All your earnings from market making</CardDescription>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {rewards?.summary?.totalRewards || 0} total rewards
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {rewards?.rewards?.length > 0 ? (
                    <div className="space-y-3">
                      {rewards.rewards.map((reward: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-3 border-b last:border-0"
                        >
                          <div className="space-y-1">
                            <p className="font-medium text-sm">
                              {reward.description || 'Market Maker Reward'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {reward.timestamp
                                ? format(new Date(reward.timestamp * 1000), 'MMM d, yyyy h:mm a')
                                : reward.date
                                  ? format(new Date(reward.date), 'MMM d, yyyy h:mm a')
                                  : 'Unknown date'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">
                              +{formatUSD(parseFloat(reward.usdcSize || reward.cash_amount || 0))}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-4">
                      <DollarSign className="h-12 w-12 mx-auto text-muted-foreground" />
                      <div>
                        <p className="font-medium mb-1">No rewards yet</p>
                        <p className="text-sm text-muted-foreground mb-2">
                          Place optimized orders to start earning maker rewards
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <Button asChild>
                          <Link href="/discover">
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Discover Markets
                          </Link>
                        </Button>
                        <Button asChild variant="outline">
                          <a
                            href="https://polymarket.com"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Go to Polymarket
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-6">
              {!hasCredentials ? (
                <Card className="border-blue-500 border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-blue-500" />
                      Open Orders (Earning Rewards)
                    </CardTitle>
                    <CardDescription>Your limit orders on the book that earn maker rewards</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto text-blue-500 mb-4" />
                    <p className="font-medium mb-2">Setup Required to View Open Orders</p>
                    <p className="text-sm text-muted-foreground mb-6">
                      To see your limit orders (the ones earning maker rewards), we need to connect to Polymarket's API.
                    </p>

                    <div className="space-y-4 max-w-md mx-auto">
                      {!autoSetupError ? (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                          <p className="text-xs text-blue-800 mb-3">
                            We'll automatically connect to Polymarket's API using your wallet signature. This takes a few seconds.
                          </p>
                          <Button
                            onClick={handleAutoSetup}
                            disabled={isAutoSetting}
                            className="w-full"
                          >
                            {isAutoSetting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Setting up...
                              </>
                            ) : (
                              'Connect to Polymarket API'
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-left">
                          <p className="text-sm font-semibold text-amber-900 mb-2">Setup Failed</p>
                          <p className="text-xs text-amber-800 mb-3">
                            {autoSetupError}
                          </p>
                          <Button
                            onClick={() => setAutoSetupError(null)}
                            variant="outline"
                            size="sm"
                          >
                            Try Again
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : openOrders && openOrders.orders && openOrders.orders.length > 0 ? (
                <Card className="border-green-500 border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-green-500" />
                          Open Orders (Earning Rewards)
                        </CardTitle>
                        <CardDescription>Your active limit orders earning maker rewards</CardDescription>
                      </div>
                      <div className="text-sm font-medium text-green-600">
                        {openOrders.summary.totalOrders} order{openOrders.summary.totalOrders !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs text-green-900">
                        <strong>These orders earn rewards!</strong> Your limit orders are on the order book providing liquidity.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {openOrders.orders.slice(0, 20).map((order: any, i: number) => (
                        <div
                          key={order.id || i}
                          className="flex items-center justify-between py-3 border-b last:border-0"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium px-2 py-1 rounded ${
                                order.side === 'BUY'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {order.side}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                order.outcome === 'Yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                              }`}>
                                {order.outcome || (order.side === 'BUY' ? 'Yes' : 'No')}
                              </span>
                            </div>
                            <p className="text-sm font-medium mt-1">
                              {order.marketTitle || order.marketName || order.market || 'Loading market...'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Price: ${parseFloat(order.price || 0).toFixed(4)} •
                              Size: {parseFloat(order.size || order.original_size || 0).toFixed(0)} shares
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium text-green-600">
                              Earning Rewards
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {openOrders.orders.length > 20 && (
                      <p className="text-sm text-muted-foreground text-center mt-4">
                        + {openOrders.orders.length - 20} more orders
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Open Orders (Earning Rewards)
                    </CardTitle>
                    <CardDescription>Your active limit orders earning maker rewards</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="font-medium mb-2">No Open Orders</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Place optimized limit orders to start earning maker rewards.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button asChild>
                        <Link href="/discover">
                          <TrendingUp className="mr-2 h-4 w-4" />
                          Place Optimized Orders
                        </Link>
                      </Button>
                      <Button asChild variant="outline">
                        <a
                          href="https://polymarket.com"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Go to Polymarket
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Positions Tab */}
            <TabsContent value="positions" className="space-y-6">
              {/* Active Positions */}
              {activePositions && activePositions.positions && activePositions.positions.length > 0 ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Active Positions</CardTitle>
                        <CardDescription>Your positions in open markets (not yet resolved)</CardDescription>
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">
                        {activePositions.summary.totalPositions} open market{activePositions.summary.totalPositions !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3 mb-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Total Value</p>
                        <p className="text-lg font-bold">{formatUSD(activePositions.summary.totalValue)}</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Total PnL</p>
                        <p className={`text-lg font-bold ${activePositions.summary.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {activePositions.summary.totalPnl >= 0 ? '+' : ''}{formatUSD(activePositions.summary.totalPnl)}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Markets</p>
                        <p className="text-lg font-bold">{activePositions.summary.totalPositions}</p>
                      </div>
                    </div>

                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-900">
                        <strong>Note:</strong> These are your current positions (shares held) in open markets.
                        To earn maker rewards, you need active limit orders on the order book, not just positions.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {activePositions.positions.slice(0, 10).map((position: any, i: number) => (
                        <div
                          key={position.asset || i}
                          className="flex items-center justify-between py-3 border-b last:border-0"
                        >
                          <div className="space-y-1 flex-1">
                            <p className="font-medium text-sm">{position.title}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className={`font-medium ${
                                position.outcome === 'Yes' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {position.outcome}
                              </span>
                              <span>•</span>
                              <span>{position.size.toFixed(0)} shares @ {formatUSD(position.avgPrice)}</span>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-sm font-medium">{formatUSD(position.currentValue)}</p>
                            <p className={`text-xs font-medium ${position.cashPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {position.cashPnl >= 0 ? '+' : ''}{formatUSD(position.cashPnl)} ({position.percentPnl >= 0 ? '+' : ''}{position.percentPnl.toFixed(1)}%)
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {activePositions.positions.length > 10 && (
                      <p className="text-sm text-muted-foreground text-center mt-4">
                        + {activePositions.positions.length - 10} more positions
                      </p>
                    )}
                    <Button asChild variant="outline" className="w-full mt-4">
                      <a
                        href="https://polymarket.com/portfolio"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View on Polymarket
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle>Active Positions</CardTitle>
                    <CardDescription>Your current market positions</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center py-8">
                    <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="font-medium mb-2">No Active Positions</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Find the best markets and place optimized orders to start earning
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button asChild>
                        <Link href="/discover">
                          <TrendingUp className="mr-2 h-4 w-4" />
                          Discover Markets
                        </Link>
                      </Button>
                      <Button asChild variant="outline">
                        <a
                          href="https://polymarket.com"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Go to Polymarket
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Your Markets */}
              {positions && positions.positions && positions.positions.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Your Markets</CardTitle>
                        <CardDescription>
                          Markets where you have active positions (scanned from your portfolio)
                        </CardDescription>
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">
                        {positions.summary.totalMarkets} market{positions.summary.totalMarkets !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {positions.positions.map((position: any, i: number) => (
                        <div
                          key={position.marketId}
                          className="flex items-center justify-between py-3 border-b last:border-0"
                        >
                          <div className="space-y-1 flex-1">
                            <p className="font-medium text-sm">
                              {position.market.question}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{position.orderCount} order{position.orderCount !== 1 ? 's' : ''}</span>
                              <span>•</span>
                              <span>Capital: {formatUSD(position.capitalDeployed)}</span>
                              {position.estimatedDaily > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-green-600">
                                    Est. {formatUSD(position.estimatedDaily)}/day
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            {position.market.active ? (
                              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                                Active
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                                Ended
                              </span>
                            )}
                            <Link href="/discover">
                              <Button variant="ghost" size="sm">
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Total Capital</p>
                          <p className="text-lg font-bold">{formatUSD(positions.summary.totalCapitalDeployed)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Est. Daily Rewards</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatUSD(positions.summary.totalDailyReward)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  )
}
