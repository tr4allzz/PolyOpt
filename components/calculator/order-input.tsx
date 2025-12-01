'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Calculator, DollarSign } from 'lucide-react'

interface OrderInputProps {
  onCalculate: (capital: number) => void
  loading?: boolean
  minSize?: number
}

export function OrderInput({ onCalculate, loading, minSize = 0 }: OrderInputProps) {
  const [capital, setCapital] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const capitalAmount = parseFloat(capital)
    if (capitalAmount > 0) {
      onCalculate(capitalAmount)
    }
  }

  const capitalAmount = parseFloat(capital) || 0
  const isValidCapital = capitalAmount > 0
  const meetsMinSize = minSize === 0 || capitalAmount >= minSize

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Calculate Rewards
        </CardTitle>
        <CardDescription>
          Enter your capital to see the optimal LP strategy and estimated rewards
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="capital">Capital to Deploy</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="capital"
                type="number"
                placeholder="1000"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                min="0"
                step="0.01"
                className="pl-9"
                required
              />
            </div>
            {minSize > 0 && (
              <p className={`text-xs ${meetsMinSize ? 'text-muted-foreground' : 'text-destructive'}`}>
                Minimum order size: ${minSize.toLocaleString()}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!isValidCapital || !meetsMinSize || loading}
          >
            <Calculator className="h-4 w-4 mr-2" />
            {loading ? 'Calculating...' : 'Calculate Best Strategy'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
