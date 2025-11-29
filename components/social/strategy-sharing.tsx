'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Share2, Plus, X, FileText } from 'lucide-react'

export function StrategySharing() {
  const [showShareForm, setShowShareForm] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Strategy Sharing</CardTitle>
              <CardDescription>
                Learn from successful liquidity providers and share your own approach
              </CardDescription>
            </div>
            <Button onClick={() => setShowShareForm(!showShareForm)}>
              {showShareForm ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Share Strategy
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Share Form */}
      {showShareForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Share Your Strategy</CardTitle>
            <CardDescription>
              Help other LPs by sharing what works for you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Strategy Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., The Balanced Portfolio Approach"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Describe your approach, capital allocation, and key principles..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Risk Level</Label>
                  <Select defaultValue="balanced">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="markets">Markets Active</Label>
                  <Input id="markets" type="number" placeholder="5" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apy">Avg APY %</Label>
                  <Input id="apy" type="number" placeholder="150" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowShareForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">Publish Strategy</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium mb-2">No strategies shared yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Be the first to share your LP strategy with the community
            </p>
            <Button onClick={() => setShowShareForm(true)} variant="outline">
              <Share2 className="w-4 h-4 mr-2" />
              Share Your Strategy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
