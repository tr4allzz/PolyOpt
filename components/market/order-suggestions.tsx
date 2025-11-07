'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, DollarSign, Target, Lightbulb, ArrowDown, ArrowUp } from 'lucide-react';

interface OrderPlacementSuggestion {
  side: 'buy' | 'sell';
  price: number;
  size: number;
  capitalRequired: number;
  expectedQScore: number;
  reasoning: string;
}

interface PlacementStrategy {
  totalCapital: number;
  suggestions: OrderPlacementSuggestion[];
  expectedTotalQScore: number;
  expectedDailyReward: number;
  estimatedROI: number;
  tips: string[];
}

interface OrderSuggestionsProps {
  marketId: string;
}

export function OrderSuggestions({ marketId }: OrderSuggestionsProps) {
  const [capital, setCapital] = useState(100);
  const [strategy, setStrategy] = useState<PlacementStrategy | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/suggest-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketId, capital }),
      });

      const data = await response.json();
      if (data.strategy) {
        setStrategy(data.strategy);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Order Placement Suggestions
        </CardTitle>
        <CardDescription>
          Get optimal bid/ask prices for your capital to maximize Q-score
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Capital Input */}
        <div>
          <Label htmlFor="suggestion-capital">Your Capital ($)</Label>
          <div className="flex gap-4 mt-2">
            <Input
              id="suggestion-capital"
              type="number"
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
              min={10}
              max={1000000}
              className="flex-1"
            />
            <Button onClick={fetchSuggestions} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Target className="mr-2 h-4 w-4" />
                  Get Suggestions
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results */}
        {strategy && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/20 rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Expected Daily</div>
                <div className="text-2xl font-bold text-green-600">
                  ${strategy.expectedDailyReward.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">ROI (APY)</div>
                <div className="text-2xl font-bold text-blue-600">
                  {strategy.estimatedROI.toFixed(0)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Your Q_min</div>
                <div className="text-2xl font-bold">
                  {strategy.expectedTotalQScore.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Order Suggestions */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Recommended Orders</h3>
              {strategy.suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${
                    suggestion.side === 'buy'
                      ? 'border-green-500 bg-green-50/50'
                      : 'border-red-500 bg-red-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {suggestion.side === 'buy' ? (
                        <ArrowDown className="h-5 w-5 text-green-600" />
                      ) : (
                        <ArrowUp className="h-5 w-5 text-red-600" />
                      )}
                      <Badge variant={suggestion.side === 'buy' ? 'default' : 'destructive'}>
                        {suggestion.side.toUpperCase()} ORDER
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Q-Score</div>
                      <div className="font-bold">{suggestion.expectedQScore.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Price</div>
                      <div className="font-semibold">
                        {(suggestion.price * 100).toFixed(2)}¢
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Size</div>
                      <div className="font-semibold">
                        {suggestion.size.toFixed(0)} shares
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Capital</div>
                      <div className="font-semibold">
                        ${suggestion.capitalRequired.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {suggestion.reasoning}
                  </p>
                </div>
              ))}
            </div>

            {/* Tips */}
            <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 font-semibold">
                <Lightbulb className="h-5 w-5 text-blue-600" />
                Tips for Maximum Rewards
              </div>
              <ul className="space-y-2">
                {strategy.tips.map((tip, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action */}
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                Ready to place these orders? Visit Polymarket to execute your strategy.
              </p>
              <Button asChild className="w-full">
                <a
                  href={`https://polymarket.com/event/${marketId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Market on Polymarket
                </a>
              </Button>
            </div>
          </div>
        )}

        {!strategy && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            Enter your capital and click "Get Suggestions" to see optimal order placements
          </div>
        )}
      </CardContent>
    </Card>
  );
}
