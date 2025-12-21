'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OptimizationResult } from './optimization-result'
import { Sparkles, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface OptimizerModalProps {
  marketId: string
  marketQuestion: string
}

export function OptimizerModal({ marketId, marketQuestion }: OptimizerModalProps) {
  const [open, setOpen] = useState(false)
  const [capital, setCapital] = useState('')
  const [riskTolerance, setRiskTolerance] = useState<'low' | 'medium' | 'high'>('medium')
  const [timeHorizon, setTimeHorizon] = useState('30')
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
          strategy: 'dynamic', // NEW: Use dynamic optimization
          riskTolerance,
          timeHorizon: parseInt(timeHorizon),
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

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="riskTolerance">Risk Tolerance</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">
                        <strong>Low:</strong> Wide spreads, less fill risk, lower rewards<br />
                        <strong>Medium:</strong> Balanced approach (recommended)<br />
                        <strong>High:</strong> Tight spreads, higher rewards, more risk
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select value={riskTolerance} onValueChange={(v: any) => setRiskTolerance(v)}>
                <SelectTrigger id="riskTolerance">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex flex-col items-start">
                      <span>Conservative</span>
                      <span className="text-xs text-muted-foreground">Wide spreads, low fill risk</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex flex-col items-start">
                      <span>Balanced (Recommended)</span>
                      <span className="text-xs text-muted-foreground">Optimizes risk vs reward</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex flex-col items-start">
                      <span>Aggressive</span>
                      <span className="text-xs text-muted-foreground">Tight spreads, max rewards</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeHorizon">Time Horizon</Label>
              <Select value={timeHorizon} onValueChange={setTimeHorizon}>
                <SelectTrigger id="timeHorizon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days (default)</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
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
          <OptimizationResult result={result} onBack={() => setResult(null)} />
        )}
      </DialogContent>
    </Dialog>
  )
}
