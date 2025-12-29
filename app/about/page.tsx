'use client'

import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, TrendingUp, Shield, Zap, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const sections = [
  { id: 'mission', label: 'Mission' },
  { id: 'what-we-do', label: 'What We Do' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'data-sources', label: 'Data Sources' },
  { id: 'technology', label: 'Technology' },
]

export default function AboutPage() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 100
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
        <section className="py-20 px-4 bg-gradient-to-b from-background to-secondary/20 relative">
          <div className="container max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-4">About opt.markets</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Your ultimate toolkit for maximizing Polymarket liquidity provision rewards
            </p>

            {/* Quick Navigation Pills */}
            <div className="flex flex-wrap gap-2 justify-center">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className="px-4 py-2 text-sm font-medium rounded-full bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  {section.label}
                </button>
              ))}
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
              <ChevronDown className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
        </section>

        {/* Mission */}
        <section id="mission" className="py-16 px-4 scroll-mt-24">
          <div className="container max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <div className="space-y-4">
              <p className="text-lg text-muted-foreground">
                opt.markets exists to level the playing field for Polymarket liquidity providers. We believe that
                transparent, data-driven tools should be accessible to everyone.
              </p>
              <p className="text-lg text-muted-foreground">
                By implementing Polymarket's public reward formula and analyzing on-chain data, we help LPs
                calculate exact Q-scores, track competition, and optimize their strategies to maximize earnings.
              </p>
            </div>
          </div>
        </section>

        {/* What We Do */}
        <section id="what-we-do" className="py-16 px-4 bg-secondary/20 scroll-mt-24">
          <div className="container max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">What We Do</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="group hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Target className="h-10 w-10 mb-2 text-primary group-hover:scale-110 transition-transform" />
                  <CardTitle>Exact Q-Score Calculations</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    We implement Polymarket's official reward formula (Equations 1-7) to calculate your
                    precise Q-score and expected daily rewards with accuracy within ±1% of actual payouts.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-shadow">
                <CardHeader>
                  <TrendingUp className="h-10 w-10 mb-2 text-primary group-hover:scale-110 transition-transform" />
                  <CardTitle>Real-Time Competition Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Track all liquidity providers in each market, analyze their Q-scores, and understand
                    your competitive position to make informed decisions.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Zap className="h-10 w-10 mb-2 text-primary group-hover:scale-110 transition-transform" />
                  <CardTitle>Smart Order Optimization</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Our optimizer suggests optimal order placement strategies to maximize your Q-score
                    while minimizing capital requirements and adverse selection risk.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Shield className="h-10 w-10 mb-2 text-primary group-hover:scale-110 transition-transform" />
                  <CardTitle>On-Chain Payout Verification</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Monitor actual reward distributions on Polygon, verify calculation accuracy,
                    and track your historical earnings with blockchain transparency.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-16 px-4 scroll-mt-24">
          <div className="container max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">How Q-Scores Work</h2>
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-semibold mb-3">The Formula</h3>
                <p className="text-muted-foreground mb-4">
                  Polymarket rewards liquidity providers based on a Q-score system that measures the
                  quality and quantity of liquidity you provide. Your Q-score is calculated as:
                </p>
                <div className="bg-secondary/50 p-6 rounded-lg font-mono text-sm space-y-2">
                  <p>Q_min = min(Q_one, Q_two)</p>
                  <p>Your Daily Reward = (Your Q_min / Total Q_min) × Daily Pool</p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">Key Factors</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
                    <span>Order proximity to midpoint (closer = higher score)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
                    <span>Order size (larger = higher score)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
                    <span>Two-sided liquidity (provides balanced Q_one and Q_two)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">4</span>
                    <span>Meeting minimum size requirements per order</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">5</span>
                    <span>Staying within the maximum spread threshold</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">Our Advantage</h3>
                <p className="text-muted-foreground">
                  Unlike Polymarket's interface which only shows estimated rewards, opt.markets calculates
                  your exact Q-score using the public formula, analyzes all competitor positions, and
                  provides precise daily reward estimates validated against actual on-chain payouts.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Data Sources */}
        <section id="data-sources" className="py-16 px-4 bg-secondary/20 scroll-mt-24">
          <div className="container max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Data Sources</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg bg-background border">
                <p className="font-semibold mb-1">Market Data</p>
                <p className="text-sm text-muted-foreground">
                  Real-time market information from Polymarket's CLOB API (clob.polymarket.com)
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background border">
                <p className="font-semibold mb-1">Order Books</p>
                <p className="text-sm text-muted-foreground">
                  Live order book data to analyze competition and calculate total Q_min across all LPs
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background border">
                <p className="font-semibold mb-1">Reward Payouts</p>
                <p className="text-sm text-muted-foreground">
                  On-chain USDC transfers on Polygon from Polymarket's rewards address
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background border">
                <p className="font-semibold mb-1">Historical Analytics</p>
                <p className="text-sm text-muted-foreground">
                  Aggregated data from Dune Analytics for leaderboard and trend analysis
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}
