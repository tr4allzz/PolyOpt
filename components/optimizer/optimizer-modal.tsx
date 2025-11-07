'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OptimizationResult } from './optimization-result'
import { Sparkles } from 'lucide-react'

interface OptimizerModalProps {
  marketId: string
  marketQuestion: string
}

export function OptimizerModal({ marketId, marketQuestion }: OptimizerModalProps) {
  const [open, setOpen] = useState(false)
  const [capital, setCapital] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleOptimize = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capital: parseFloat(capital),
          marketId,
          strategy: 'balanced',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setResult(data)
      }
    } catch (error) {
      console.error('Error optimizing:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Sparkles className="h-4 w-4 mr-2" />
          Optimize Placement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Optimize Order Placement</DialogTitle>
          <DialogDescription>
            Calculate the optimal order placement to maximize your rewards
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Market</Label>
              <p className="text-sm text-muted-foreground">{marketQuestion}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capital">Capital to Deploy ($)</Label>
              <Input
                id="capital"
                type="number"
                placeholder="1000"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <Button
              onClick={handleOptimize}
              disabled={!capital || parseFloat(capital) <= 0 || loading}
              className="w-full"
            >
              {loading ? 'Optimizing...' : 'Calculate Optimal Placement'}
            </Button>
          </div>
        ) : (
          <OptimizationResult result={result} />
        )}
      </DialogContent>
    </Dialog>
  )
}
