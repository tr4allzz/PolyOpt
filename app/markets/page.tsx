'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { MarketList } from '@/components/markets/market-list'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export default function MarketsPage() {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchMarkets() {
      try {
        const response = await fetch('/api/markets')
        if (response.ok) {
          const data = await response.json()
          setMarkets(data.markets)
        }
      } catch (error) {
        console.error('Error fetching markets:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMarkets()
  }, [])

  const filteredMarkets = markets.filter((market: any) =>
    market.question.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Reward Markets</h1>
          <p className="text-muted-foreground">
            Browse all active markets with liquidity provider rewards
          </p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search markets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading markets...</p>
          </div>
        ) : (
          <MarketList markets={filteredMarkets} />
        )}
      </main>

      <Footer />
    </div>
  )
}
