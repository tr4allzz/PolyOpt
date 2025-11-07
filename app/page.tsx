import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import Link from 'next/link'
import { Calculator, TrendingUp, Target, DollarSign } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 px-4 bg-gradient-to-b from-background to-secondary/20">
          <div className="container max-w-6xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-4">
              Maximize Your Polymarket Rewards
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Calculate exact Q-scores, analyze competition, and optimize your liquidity provision strategy with opt.markets
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/markets">
                <Button size="lg">
                  Browse Markets
                </Button>
              </Link>
              <Link href="/optimize">
                <Button size="lg" variant="outline">
                  Optimize Strategy
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-4">
          <div className="container max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Everything You Need to Win
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <Calculator className="h-10 w-10 mb-2 text-primary" />
                  <CardTitle>Q-Score Calculator</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Calculate exact Q-scores using Polymarket's public reward formula
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <TrendingUp className="h-10 w-10 mb-2 text-primary" />
                  <CardTitle>Competition Tracker</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Analyze all LPs in a market and track your competitive position
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Target className="h-10 w-10 mb-2 text-primary" />
                  <CardTitle>Order Optimizer</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Find the optimal order placement to maximize your rewards
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <DollarSign className="h-10 w-10 mb-2 text-primary" />
                  <CardTitle>Payout Tracker</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Monitor your daily reward distributions and historical payouts
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-4 bg-secondary/20">
          <div className="container max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              How It Works
            </h2>
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-bold mb-2">Connect Your Wallet</h3>
                  <p className="text-muted-foreground">
                    Connect your Polygon wallet to analyze your current positions
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-bold mb-2">Calculate Your Q-Score</h3>
                  <p className="text-muted-foreground">
                    See your exact Q-score and expected daily rewards for each market
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-bold mb-2">Optimize Your Strategy</h3>
                  <p className="text-muted-foreground">
                    Use our optimizer to find the best order placement for your capital
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-bold mb-2">Track Your Earnings</h3>
                  <p className="text-muted-foreground">
                    Monitor your daily payouts and overall portfolio performance
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4">
          <div className="container max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Optimize Your Rewards?
            </h2>
            <p className="text-muted-foreground mb-8">
              Start analyzing markets and maximizing your Polymarket LP rewards today
            </p>
            <Link href="/markets">
              <Button size="lg">
                Get Started
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
