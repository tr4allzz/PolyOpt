'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  TrendingUp,
  Calendar,
  DollarSign,
  Target,
  AlertCircle,
  Lightbulb,
  ExternalLink,
  BarChart3,
  Shield,
  Zap,
} from 'lucide-react';
import { formatUSD } from '@/lib/polymarket/utils';
import { OrderForm } from './order-form';

interface Market {
  id: string;
  question: string;
  clobTokenIds: string[];
  midpoint: number;
  rewardPool: number;
  volume?: number;
  volume24h?: number;
  liquidity?: number;
  endDate?: string | Date;
  conditionId?: string;
  active?: boolean;
}

interface OptimizationResult {
  recommendation: {
    buyOrder: { price: string; size: number; cost: string };
    sellOrder: { price: string; size: number; cost: string };
  };
  metrics: {
    expectedDailyReward: number;
    expectedMonthlyReward: number;
    expectedAPY: number;
  };
  riskMetrics?: {
    fillProbability: number;
    fillRiskLevel: string;
    volatilityScore: number;
    volatilityLevel: string;
  };
  warnings?: string[];
}

interface MarketDrawerProps {
  market: Market | null;
  capital: number;
  walletAddress: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderPlaced?: () => void;
}

type Strategy = 'balanced' | 'conservative' | 'aggressive';

const STRATEGIES = [
  {
    id: 'balanced' as Strategy,
    label: 'Balanced',
    icon: Target,
    description: 'Optimal balance of reward and risk',
    riskTolerance: 'medium',
  },
  {
    id: 'conservative' as Strategy,
    label: 'Conservative',
    icon: Shield,
    description: 'Lower risk, wider spreads',
    riskTolerance: 'low',
  },
  {
    id: 'aggressive' as Strategy,
    label: 'Aggressive',
    icon: Zap,
    description: 'Higher reward, tighter spreads',
    riskTolerance: 'high',
  },
];

export function MarketDrawer({
  market,
  capital,
  walletAddress,
  open,
  onOpenChange,
  onOrderPlaced,
}: MarketDrawerProps) {
  const [strategy, setStrategy] = useState<Strategy>('balanced');
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch optimization when market, capital, or strategy changes
  const fetchOptimization = useCallback(async () => {
    if (!market || !capital || capital <= 0) return;

    setLoading(true);
    setError(null);

    try {
      const selectedStrategy = STRATEGIES.find(s => s.id === strategy);
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capital,
          marketId: market.id,
          strategy: 'dynamic',
          riskTolerance: selectedStrategy?.riskTolerance || 'medium',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setOptimization(data);
      } else {
        setError(data.error || 'Failed to optimize');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get optimization');
    } finally {
      setLoading(false);
    }
  }, [market, capital, strategy]);

  useEffect(() => {
    if (open && market && capital > 0) {
      fetchOptimization();
    }
  }, [open, market, capital, strategy, fetchOptimization]);

  // Reset when drawer closes
  useEffect(() => {
    if (!open) {
      setOptimization(null);
      setError(null);
      setStrategy('balanced');
    }
  }, [open]);

  if (!market) return null;

  const suggestedPrice = optimization?.recommendation?.buyOrder?.price;
  const suggestedSize = optimization?.recommendation?.buyOrder?.size?.toString();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg leading-tight pr-8">
            {market.question}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {formatUSD(market.rewardPool)}/day
            </Badge>
            <a
              href={`https://polymarket.com/event/${market.conditionId || market.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View on Polymarket
              <ExternalLink className="h-3 w-3" />
            </a>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Market Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Target className="h-3 w-3" />
                Midpoint
              </div>
              <p className="text-lg font-semibold">
                {(market.midpoint * 100).toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <DollarSign className="h-3 w-3" />
                Reward Pool
              </div>
              <p className="text-lg font-semibold">
                {formatUSD(market.rewardPool)}
              </p>
            </div>
            {market.volume24h && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <BarChart3 className="h-3 w-3" />
                  24h Volume
                </div>
                <p className="text-lg font-semibold">
                  {formatUSD(market.volume24h)}
                </p>
              </div>
            )}
            {market.endDate && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" />
                  End Date
                </div>
                <p className="text-sm font-semibold">
                  {new Date(market.endDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Strategy Selector */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Select Strategy</h4>
            <div className="grid grid-cols-3 gap-2">
              {STRATEGIES.map((s) => (
                <Button
                  key={s.id}
                  variant={strategy === s.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStrategy(s.id)}
                  className="flex flex-col h-auto py-2 px-2"
                >
                  <s.icon className="h-4 w-4 mb-1" />
                  <span className="text-xs">{s.label}</span>
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {STRATEGIES.find(s => s.id === strategy)?.description}
            </p>
          </div>

          <Separator />

          {/* Expected Rewards */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Expected Rewards
            </h4>

            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                {error}
              </div>
            ) : optimization ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-xs text-green-700 mb-1">Daily</p>
                    <p className="text-lg font-bold text-green-700">
                      {formatUSD(optimization.metrics.expectedDailyReward)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-xs text-green-700 mb-1">Monthly</p>
                    <p className="text-lg font-bold text-green-700">
                      {formatUSD(optimization.metrics.expectedMonthlyReward)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-xs text-green-700 mb-1">APY</p>
                    <p className="text-lg font-bold text-green-700">
                      {(optimization.metrics.expectedAPY * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Risk Metrics */}
                {optimization.riskMetrics && (
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Fill Risk:</span>
                      <Badge
                        variant="outline"
                        className={
                          optimization.riskMetrics.fillRiskLevel === 'Low'
                            ? 'text-green-600 border-green-200'
                            : optimization.riskMetrics.fillRiskLevel === 'Medium'
                            ? 'text-yellow-600 border-yellow-200'
                            : 'text-red-600 border-red-200'
                        }
                      >
                        {optimization.riskMetrics.fillRiskLevel}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Volatility:</span>
                      <span>{optimization.riskMetrics.volatilityLevel}</span>
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {optimization.warnings && optimization.warnings.length > 0 && (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 flex items-start gap-2">
                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    {optimization.warnings[0]}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Enter capital amount to see expected rewards
              </p>
            )}
          </div>

          <Separator />

          {/* Order Form */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Place Order</h4>
            <OrderForm
              market={market}
              walletAddress={walletAddress}
              suggestedPrice={suggestedPrice}
              suggestedSize={suggestedSize}
              onOrderPlaced={() => {
                onOrderPlaced?.();
              }}
            />
          </div>

          {/* Tips */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Tips</span>
            </div>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Place orders 3-5% from midpoint for optimal Q-score</li>
              <li>• GTC orders earn rewards continuously while open</li>
              <li>• Balance YES and NO sides for maximum rewards</li>
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
