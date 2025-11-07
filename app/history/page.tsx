'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatUSD } from '@/lib/polymarket/utils'
import { format } from 'date-fns'

export default function HistoryPage() {
  const { address, isConnected } = useAccount()
  const [payouts, setPayouts] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isConnected || !address) {
      setPayouts(null)
      return
    }

    async function fetchPayouts() {
      setLoading(true)
      try {
        const response = await fetch(`/api/user/payouts?walletAddress=${address}`)
        if (response.ok) {
          const data = await response.json()
          setPayouts(data)
        }
      } catch (error) {
        console.error('Error fetching payouts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPayouts()
  }, [address, isConnected])

  if (!isConnected) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
            <p className="text-muted-foreground">
              Connect your wallet to view your payout history
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
          <h1 className="text-4xl font-bold mb-2">Payout History</h1>
          <p className="text-muted-foreground">
            Your reward distribution history
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading history...</p>
          </div>
        ) : payouts && payouts.summary ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Paid
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {formatUSD(payouts.summary.totalPaid)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Payouts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{payouts.summary.payoutCount}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Daily (30d)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {formatUSD(payouts.summary.avgDailyPayout)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Last Payout
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold">
                    {payouts.summary.lastPayoutDate
                      ? format(new Date(payouts.summary.lastPayoutDate), 'MMM d, yyyy')
                      : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Payouts</CardTitle>
                <CardDescription>Last 100 transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {payouts.payouts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No payouts found
                  </p>
                ) : (
                  <div className="space-y-4">
                    {payouts.payouts.map((payout: any) => (
                      <div
                        key={payout.id}
                        className="flex items-center justify-between border-b pb-4"
                      >
                        <div>
                          <p className="font-medium">
                            {format(new Date(payout.date), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Block: {payout.blockNumber}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-500">
                            +{formatUSD(payout.amount)}
                          </p>
                          <a
                            href={`https://polygonscan.com/tx/${payout.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            View TX
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No payout history found</p>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  )
}
