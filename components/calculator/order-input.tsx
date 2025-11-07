'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Calculator } from 'lucide-react'

interface OrderInputProps {
  onCalculate: (walletAddress: string, capital?: number) => void
  loading?: boolean
}

export function OrderInput({ onCalculate, loading }: OrderInputProps) {
  const [walletAddress, setWalletAddress] = useState('')
  const [capital, setCapital] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const capitalAmount = capital ? parseFloat(capital) : undefined
    onCalculate(walletAddress, capitalAmount)
  }

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(walletAddress)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calculate Your Q-Score</CardTitle>
        <CardDescription>
          Enter your wallet address to analyze your positions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wallet">Wallet Address</Label>
            <Input
              id="wallet"
              placeholder="0x..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              required
            />
            {walletAddress && !isValidAddress && (
              <p className="text-xs text-destructive">
                Invalid wallet address format
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="capital">Capital Deployed (Optional)</Label>
            <Input
              id="capital"
              type="number"
              placeholder="1000"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              min="0"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              Used to calculate APY estimates
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!isValidAddress || loading}
          >
            <Calculator className="h-4 w-4 mr-2" />
            {loading ? 'Calculating...' : 'Calculate Q-Score'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
