'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function DebugRewardsPage() {
  const { address } = useAccount()
  const [walletAddress, setWalletAddress] = useState(address || '')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchDebugData() {
    if (!walletAddress) {
      setError('Please enter a wallet address')
      return
    }

    setLoading(true)
    setError(null)
    setData(null)

    try {
      // Fetch raw data from Polymarket API
      const response = await fetch(
        `https://data-api.polymarket.com/activity?user=${walletAddress}&type=REWARD&limit=100&sortBy=TIMESTAMP&sortDirection=DESC`
      )

      if (!response.ok) {
        throw new Error(`Polymarket API error: ${response.status}`)
      }

      const rawData = await response.json()
      console.log('Raw Polymarket API response:', rawData)

      // Calculate totals
      let totalAmount = 0
      const rewards = Array.isArray(rawData) ? rawData : []

      rewards.forEach((reward: any) => {
        totalAmount += parseFloat(reward.cash_amount || 0)
      })

      setData({
        raw: rawData,
        parsed: {
          totalRewards: rewards.length,
          totalAmount: totalAmount,
          rewards: rewards
        }
      })
    } catch (err) {
      console.error('Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <h1 className="text-4xl font-bold mb-8">Debug Rewards Data</h1>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Fetch Raw Data from Polymarket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Wallet Address</Label>
              <Input
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
              />
            </div>
            <Button onClick={fetchDebugData} disabled={loading}>
              {loading ? 'Loading...' : 'Fetch Rewards Data'}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-8 border-red-500">
            <CardContent className="py-6 text-red-600">
              Error: {error}
            </CardContent>
          </Card>
        )}

        {data && (
          <>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Rewards Found</p>
                    <p className="text-2xl font-bold">{data.parsed.totalRewards}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${data.parsed.totalAmount.toFixed(4)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Individual Transactions ({data.parsed.rewards.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {data.parsed.rewards.length === 0 ? (
                  <p className="text-muted-foreground">No reward transactions found</p>
                ) : (
                  <div className="space-y-2">
                    {data.parsed.rewards.map((reward: any, i: number) => (
                      <div key={i} className="border-b pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">
                              {new Date(reward.timestamp).toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {reward.description || 'Liquidity Provision Reward'}
                            </p>
                            {reward.market_id && (
                              <p className="text-xs text-muted-foreground">
                                Market: {reward.market_id}
                              </p>
                            )}
                            {reward.tx_hash && (
                              <a
                                href={`https://polygonscan.com/tx/${reward.tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                View on PolygonScan
                              </a>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">
                              ${parseFloat(reward.cash_amount || 0).toFixed(4)}
                            </p>
                            {reward.asset_type && (
                              <p className="text-xs text-muted-foreground">{reward.asset_type}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Raw API Response (for debugging)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs overflow-auto max-h-96 bg-gray-100 p-4 rounded">
                  {JSON.stringify(data.raw, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
