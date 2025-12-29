'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { InfoIcon, AlertCircle, BookOpen, Zap, Target, HelpCircle, ChevronRight, Wifi, BarChart3, PenTool } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const sections = [
  { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
  { id: 'calm-markets', label: 'Calm Markets', icon: BarChart3 },
  { id: 'real-time', label: 'Real-Time Data', icon: Wifi },
  { id: 'order-signing', label: 'Order Signing', icon: PenTool },
  { id: 'q-scores', label: 'Q-Scores', icon: Target },
  { id: 'strategy', label: 'Strategy Guide', icon: Zap },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
]

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('getting-started')

  const scrollToSection = (id: string) => {
    setActiveSection(id)
    const element = document.getElementById(id)
    if (element) {
      const offset = 100 // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-12 px-4 bg-gradient-to-b from-background to-secondary/20">
          <div className="container max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold mb-4">Documentation</h1>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about using opt.markets to maximize your Polymarket LP rewards
            </p>
          </div>
        </section>

        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="flex gap-8">
            {/* Sidebar Navigation */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <nav className="sticky top-24 space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors text-left",
                        activeSection === section.id
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {section.label}
                      {activeSection === section.id && (
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      )}
                    </button>
                  )
                })}
              </nav>
            </aside>

            {/* Mobile Navigation */}
            <div className="lg:hidden mb-6 w-full">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {sections.map((section) => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors",
                        activeSection === section.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {section.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-16">
              {/* Getting Started */}
              <section id="getting-started" className="scroll-mt-24">
                <h2 className="text-3xl font-bold mb-6">Getting Started</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">1. Connect Your Wallet</h3>
                    <p className="text-muted-foreground mb-3">
                      Click the "Connect Wallet" button in the top right corner. We support:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>MetaMask</li>
                      <li>WalletConnect-compatible wallets</li>
                      <li>Any injected Ethereum wallet</li>
                    </ul>
                    <Alert className="mt-4">
                      <InfoIcon className="h-4 w-4" />
                      <AlertDescription>
                        Make sure you're connected to the Polygon network. Polymarket rewards are distributed on Polygon.
                      </AlertDescription>
                    </Alert>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">2. Discover & Trade</h3>
                    <p className="text-muted-foreground mb-3">
                      Navigate to the <Link href="/discover" className="text-primary hover:underline">Discover</Link> page
                      to see all active markets with liquidity rewards. Enter your capital, find opportunities, and place optimized orders.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">3. Analyze Your Positions</h3>
                    <p className="text-muted-foreground mb-3">
                      Visit your <Link href="/portfolio" className="text-primary hover:underline">Portfolio</Link> to see:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>Your current Q-scores for each market</li>
                      <li>Expected daily and monthly rewards</li>
                      <li>Your share of the total reward pool</li>
                      <li>Competition analysis</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">4. Discover New Opportunities</h3>
                    <p className="text-muted-foreground">
                      Use the <Link href="/discover" className="text-primary hover:underline">Discover</Link> tool
                      to find the best opportunities based on reward pool size, competition level, and capital efficiency.
                    </p>
                  </div>
                </div>
              </section>

              {/* Calm Markets */}
              <section id="calm-markets" className="scroll-mt-24">
                <h2 className="text-3xl font-bold mb-6">Calm Markets</h2>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Finding Low-Competition Markets</CardTitle>
                      <CardDescription>Discover markets that are easier to trade in</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground">
                        The <Link href="/discover" className="text-primary hover:underline">Discover</Link> page includes
                        a "Calm" tab that shows markets with lower activity and less competition. These markets are
                        ideal for placing orders that are less likely to be filled quickly.
                      </p>
                      <p className="text-muted-foreground">
                        Each calm market displays a <strong>stability score</strong> (0-100) based on three factors:
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Stability Score Components</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-4">
                        <div>
                          <p className="font-semibold mb-1">1. Volume Score (35% weight)</p>
                          <p className="text-sm text-muted-foreground">
                            Lower 24-hour trading volume indicates less activity and competition. Markets with
                            under $5k daily volume score highest, while markets with $5M+ volume score lowest.
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">2. Spread Score (35% weight)</p>
                          <p className="text-sm text-muted-foreground">
                            Wider bid-ask spreads indicate less competition from other liquidity providers.
                            Markets with 5%+ spreads are considered "calm" while tight 1% spreads indicate
                            heavy competition.
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">3. Depth Score (30% weight)</p>
                          <p className="text-sm text-muted-foreground">
                            Moderate orderbook depth ($100-$1,000) is ideal. Very shallow books are risky,
                            while very deep books indicate many competing LPs.
                          </p>
                        </div>
                      </div>
                      <div className="bg-secondary/50 p-4 rounded-lg font-mono text-sm">
                        Stability = (Volume × 0.35) + (Spread × 0.35) + (Depth × 0.30)
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Using Calm Markets Effectively</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="font-semibold mb-2">Best Practices:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                          <li>Look for stability scores above 70 for optimal conditions</li>
                          <li>Balance stability with reward pool size - very calm markets may have lower rewards</li>
                          <li>Monitor the actual spread percentage shown to ensure it meets your needs</li>
                          <li>Check daily volume to understand how active the market really is</li>
                        </ul>
                      </div>
                      <Alert>
                        <InfoIcon className="h-4 w-4" />
                        <AlertDescription>
                          Calm markets refresh when you switch to the tab. Data is fetched directly from
                          the Polymarket orderbook API.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Real-Time Data */}
              <section id="real-time" className="scroll-mt-24">
                <h2 className="text-3xl font-bold mb-6">Real-Time Data</h2>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Live Orderbook Updates</CardTitle>
                      <CardDescription>WebSocket-powered real-time market data</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground">
                        When you open a market's detail drawer, the app connects to Polymarket's WebSocket
                        server to receive live orderbook updates. You'll see:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                        <li><strong>Live midpoint:</strong> Updated in real-time as orders change</li>
                        <li><strong>Current spread:</strong> Shows the actual bid-ask spread</li>
                        <li><strong>Trade notifications:</strong> See when trades occur on the market</li>
                        <li><strong>Connection status:</strong> A WiFi icon indicates live vs static data</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Connection Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-full text-sm">
                          <Wifi className="h-4 w-4" />
                          <span>Live</span>
                        </div>
                        <span className="text-muted-foreground">- Connected to real-time feed</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted text-muted-foreground rounded-full text-sm">
                          <Wifi className="h-4 w-4" />
                          <span>Static</span>
                        </div>
                        <span className="text-muted-foreground">- Using cached data</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-4">
                        The connection automatically reconnects if disconnected. Data falls back to
                        the most recent cached values while reconnecting.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>WebSocket Data Types</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div>
                          <p className="font-semibold mb-1">Book Snapshots</p>
                          <p className="text-sm text-muted-foreground">
                            Full orderbook state sent when you first connect. Contains all current
                            bids and asks with their prices and sizes.
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">Price Changes</p>
                          <p className="text-sm text-muted-foreground">
                            Incremental updates when orders are added, modified, or removed. These
                            keep the orderbook in sync without resending everything.
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">Last Trade Price</p>
                          <p className="text-sm text-muted-foreground">
                            Notifications when trades execute on the market. Useful for monitoring
                            activity and understanding current market interest.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Order Signing */}
              <section id="order-signing" className="scroll-mt-24">
                <h2 className="text-3xl font-bold mb-6">Order Signing</h2>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Direct Order Placement</CardTitle>
                      <CardDescription>Sign and submit orders with MetaMask</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground">
                        You can place orders directly from the app using your MetaMask wallet. The process
                        uses EIP-712 typed signatures - the same method Polymarket uses for their web app.
                      </p>
                      <Alert>
                        <InfoIcon className="h-4 w-4" />
                        <AlertDescription>
                          Orders are signed locally in your browser. Your private key never leaves MetaMask.
                          We only submit the signed order to Polymarket's API.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>How Order Signing Works</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div>
                          <p className="font-semibold mb-1">1. Order Construction</p>
                          <p className="text-sm text-muted-foreground">
                            When you click "Place Order", we construct an EIP-712 typed data structure
                            containing the order details: token ID, price, size, side, and expiration.
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">2. MetaMask Signature</p>
                          <p className="text-sm text-muted-foreground">
                            MetaMask shows you the order details for review. You sign with your
                            private key to authorize the order.
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">3. API Submission</p>
                          <p className="text-sm text-muted-foreground">
                            The signed order is sent to Polymarket's CLOB API. If accepted, it appears
                            in the orderbook immediately.
                          </p>
                        </div>
                      </div>
                      <div className="bg-secondary/50 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                        <pre>{`{
  "domain": {
    "name": "Polymarket CTF Exchange",
    "chainId": 137,
    "verifyingContract": "0x..."
  },
  "Order": {
    "salt", "maker", "signer", "taker",
    "tokenId", "makerAmount", "takerAmount",
    "side", "expiration", "nonce", "feeRateBps"
  }
}`}</pre>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>NegRisk vs Standard Markets</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground">
                        Polymarket has two types of markets that use different exchange contracts:
                      </p>
                      <div className="space-y-3">
                        <div>
                          <p className="font-semibold mb-1">Standard Markets</p>
                          <p className="text-sm text-muted-foreground">
                            Simple yes/no binary markets. These use the CTF Exchange contract.
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">NegRisk Markets</p>
                          <p className="text-sm text-muted-foreground">
                            Multi-outcome markets (e.g., "Who will win the election?"). These use
                            the NegRisk CTF Exchange contract with different signing parameters.
                          </p>
                        </div>
                      </div>
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          The app automatically detects the market type and uses the correct
                          exchange contract for signing. No action needed on your part.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Troubleshooting Orders</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="font-semibold mb-2">Common Issues:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                          <li><strong>Signature rejected:</strong> Make sure you're on Polygon network in MetaMask</li>
                          <li><strong>Order rejected:</strong> Check that price is within valid range (0.01 - 0.99)</li>
                          <li><strong>Minimum size error:</strong> Orders must meet the market's minimum size (usually 100 shares)</li>
                          <li><strong>Nonce error:</strong> Wait a moment and try again - nonces are fetched from the API</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Understanding Q-Scores */}
              <section id="q-scores" className="scroll-mt-24">
                <h2 className="text-3xl font-bold mb-6">Understanding Q-Scores</h2>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>What is a Q-Score?</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground">
                        Your Q-score measures the quality and quantity of liquidity you provide. Polymarket uses
                        this to determine your share of the daily reward pool.
                      </p>
                      <div className="bg-secondary/50 p-4 rounded-lg font-mono text-sm space-y-2">
                        <p>Q_one = Score of your YES bids + NO asks</p>
                        <p>Q_two = Score of your YES asks + NO bids</p>
                        <p className="font-bold">Q_min = min(Q_one, Q_two)</p>
                      </div>
                      <p className="text-muted-foreground">
                        Your daily reward is: <code className="bg-secondary px-2 py-1 rounded">(Your Q_min / Total Q_min) × Daily Pool</code>
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>How Order Scores are Calculated</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground">
                        Each order receives a score based on:
                      </p>
                      <div className="space-y-3">
                        <div>
                          <p className="font-semibold mb-1">1. Proximity to Midpoint</p>
                          <p className="text-sm text-muted-foreground">
                            Orders closer to the market midpoint receive higher scores. The score decreases
                            quadratically as you move away from the midpoint.
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">2. Order Size</p>
                          <p className="text-sm text-muted-foreground">
                            Larger orders receive proportionally higher scores. Your score multiplies linearly
                            with the number of shares.
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">3. Maximum Spread Limit</p>
                          <p className="text-sm text-muted-foreground">
                            Orders beyond the maximum spread (typically 3¢ from midpoint) receive zero score.
                          </p>
                        </div>
                      </div>
                      <div className="bg-secondary/50 p-4 rounded-lg font-mono text-sm">
                        Score = ((max_spread - order_spread) / max_spread)² × order_size
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Two-Sided Liquidity Requirement</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          To maximize your Q_min, you need balanced liquidity on both sides (Q_one ≈ Q_two).
                          Single-sided liquidity is penalized by a factor of 3.
                        </AlertDescription>
                      </Alert>
                      <p className="text-muted-foreground text-sm">
                        For markets with midpoint between 10% and 90%, single-sided liquidity is allowed but
                        receives Q_min = max(Q_one/3, Q_two/3). For extreme markets (&lt;10% or &gt;90%),
                        two-sided liquidity is required.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Strategy Guide */}
              <section id="strategy" className="scroll-mt-24">
                <h2 className="text-3xl font-bold mb-6">Strategy Guide</h2>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Optimal Order Placement</CardTitle>
                      <CardDescription>Maximize your Q-score while minimizing risk</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="font-semibold mb-2">Recommended Strategy:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                          <li>Place orders at 30-40% of max spread from midpoint</li>
                          <li>Split capital evenly between buy and sell orders</li>
                          <li>Ensure each order meets minimum size requirements</li>
                          <li>Rebalance when midpoint moves significantly</li>
                        </ul>
                      </div>
                      <Alert>
                        <InfoIcon className="h-4 w-4" />
                        <AlertDescription>
                          Use our optimizer tool in each market detail page to calculate the exact optimal
                          placement for your capital amount.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Market Selection Criteria</CardTitle>
                      <CardDescription>Choose the right markets to maximize ROI</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="font-semibold mb-2">Look for:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                          <li><strong>High reward pool:</strong> More rewards available to distribute</li>
                          <li><strong>Low competition:</strong> Lower total Q_min means higher share for you</li>
                          <li><strong>Stable midpoint:</strong> Less need for frequent rebalancing</li>
                          <li><strong>Reasonable spread:</strong> Wider max spread allows safer order placement</li>
                          <li><strong>Sufficient time to close:</strong> Markets closing soon may not be worth the setup</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold mb-2">Capital Efficiency Metric:</p>
                        <p className="text-sm text-muted-foreground">
                          Calculate: <code className="bg-secondary px-2 py-1 rounded">Daily Reward / Capital Deployed</code>
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          This shows your daily return percentage. Compare across markets to find the best opportunities.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Risk Management</CardTitle>
                      <CardDescription>Protect your capital while earning rewards</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="font-semibold mb-2">Key Risks:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                          <li><strong>Adverse selection:</strong> Orders too close to midpoint may be filled at unfavorable prices</li>
                          <li><strong>Market resolution:</strong> Losing positions reduce overall profitability</li>
                          <li><strong>Competition changes:</strong> New LPs can reduce your reward share</li>
                          <li><strong>Midpoint shifts:</strong> Requires rebalancing to maintain Q-score</li>
                        </ul>
                      </div>
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Monitor your positions daily. Set up alerts in your portfolio to notify you of
                          significant competition changes or reward decreases.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* FAQ */}
              <section id="faq" className="scroll-mt-24">
                <h2 className="text-3xl font-bold mb-6">Frequently Asked Questions</h2>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">How accurate are the reward calculations?</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Our calculations use Polymarket's exact public formula and are typically accurate within
                        ±1% of actual payouts. We validate our calculations against on-chain payout data.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">When are rewards distributed?</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Polymarket distributes liquidity rewards daily at approximately 00:00 UTC. Rewards are
                        sent directly to your wallet on Polygon as USDC.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Do I need to keep my orders open to earn rewards?</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Yes, rewards are calculated based on your open orders at the snapshot time (daily at 00:00 UTC).
                        Orders must meet minimum size requirements and be within the max spread to qualify.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">What happens if my order gets filled?</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        If your order is filled, it no longer contributes to your Q-score. You'll need to place
                        new orders to maintain your reward share. This is why we recommend placing orders at a
                        safe distance from the midpoint.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Can I provide liquidity on multiple markets?</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Yes! You can earn rewards from as many markets as you want simultaneously. Use our
                        portfolio view to track all your positions and total expected rewards.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Is there a minimum capital requirement?</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Each market has a minimum order size (typically 100 shares). Your total capital
                        requirement depends on the market's midpoint and the number of orders you want to place.
                        Generally, $100-200 is a reasonable starting point per market.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Support CTA */}
              <section className="pt-8 border-t">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-4">Need More Help?</h2>
                  <p className="text-muted-foreground mb-6">
                    Join our community or check out additional resources
                  </p>
                  <div className="flex gap-4 justify-center flex-wrap">
                    <Link href="/community">
                      <Button>Join Community</Button>
                    </Link>
                    <Link href="/about">
                      <Button variant="outline">About opt.markets</Button>
                    </Link>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
