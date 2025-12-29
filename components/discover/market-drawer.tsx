'use client';

import { useState, useEffect, useMemo } from 'react';
import { createSignedOrderWithMetaMask } from '@/lib/polymarket/browser-order-builder';
import { useRealtimeOrderBook } from '@/hooks/use-realtime-orderbook';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Calendar,
  DollarSign,
  Target,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  ExternalLink,
  BarChart3,
  Shield,
  Zap,
  ArrowUpCircle,
  ArrowDownCircle,
  Copy,
  Radio,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatUSD } from '@/lib/polymarket/utils';

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

interface MarketDrawerProps {
  market: Market | null;
  capital: number;
  walletAddress: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderPlaced?: () => void;
}

type Strategy = 'balanced' | 'conservative' | 'aggressive';

interface CalculatedOrder {
  outcome: 'YES' | 'NO';
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  cost: number;
}

const STRATEGIES = [
  {
    id: 'balanced' as Strategy,
    label: 'Balanced',
    icon: Target,
    description: 'Split between YES and NO',
    spreadFromMid: 0.04, // 4% from midpoint
  },
  {
    id: 'conservative' as Strategy,
    label: 'Conservative',
    icon: Shield,
    description: 'Wider spreads, lower fill risk',
    spreadFromMid: 0.06, // 6% from midpoint
  },
  {
    id: 'aggressive' as Strategy,
    label: 'Aggressive',
    icon: Zap,
    description: 'Tighter spreads, higher rewards',
    spreadFromMid: 0.02, // 2% from midpoint
  },
];

export function MarketDrawer({
  market,
  capital: initialCapital,
  walletAddress,
  open,
  onOpenChange,
  onOrderPlaced,
}: MarketDrawerProps) {
  const [strategy, setStrategy] = useState<Strategy>('balanced');
  const [capital, setCapital] = useState(initialCapital);
  const [capitalInput, setCapitalInput] = useState(initialCapital.toString());
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [funderAddress, setFunderAddress] = useState<string | null>(null);
  const [loadingFunder, setLoadingFunder] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);

  // Real-time orderbook via WebSocket
  const tokenIds = useMemo(() => {
    if (!market?.clobTokenIds || !open) return [];
    return market.clobTokenIds;
  }, [market?.clobTokenIds, open]);

  const { orderBook, isConnected: wsConnected } = useRealtimeOrderBook({
    tokenIds,
    onTrade: (price, assetId) => {
      console.log(`📈 Trade: ${price} on ${assetId.substring(0, 10)}...`);
    },
  });

  // Use live midpoint if available, otherwise use market's static midpoint
  const liveMidpoint = orderBook.midpoint ?? market?.midpoint ?? 0.5;
  const liveSpread = orderBook.spread ?? null;

  // Sync capital when initialCapital changes
  useEffect(() => {
    if (initialCapital > 0) {
      setCapital(initialCapital);
      setCapitalInput(initialCapital.toString());
    }
  }, [initialCapital]);

  // Fetch funder address and credentials status when wallet is connected
  useEffect(() => {
    if (walletAddress && open) {
      setLoadingFunder(true);
      console.log('🔍 Fetching credentials for:', walletAddress);
      fetch(`/api/user/credentials?wallet=${walletAddress}`)
        .then(res => res.json())
        .then(data => {
          console.log('📋 Credentials response:', data);
          if (data.funderAddress) {
            setFunderAddress(data.funderAddress);
            console.log('📍 Funder address loaded:', data.funderAddress);
          }
          if (data.hasCredentials) {
            setHasCredentials(true);
            console.log('✅ API credentials available');
          }
        })
        .catch(err => console.error('Failed to fetch credentials:', err))
        .finally(() => setLoadingFunder(false));
    }
  }, [walletAddress, open]);

  // Reset when drawer opens/closes
  useEffect(() => {
    if (open) {
      setSuccess(null);
      if (initialCapital > 0) {
        setCapital(initialCapital);
        setCapitalInput(initialCapital.toString());
      }
    } else {
      setStrategy('balanced');
      setSuccess(null);
      setFunderAddress(null);
    }
  }, [open, initialCapital]);

  // Handle capital input
  const handleCapitalChange = (value: string) => {
    setCapitalInput(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      setCapital(num);
    }
  };

  // Calculate orders based on strategy
  // Polymarket requires minimum 5 shares per order
  const MIN_ORDER_SIZE = 5;

  const calculateOrders = (): CalculatedOrder[] => {
    if (!market || capital <= 0) return [];

    const strategyConfig = STRATEGIES.find(s => s.id === strategy);
    const spread = strategyConfig?.spreadFromMid || 0.04;
    // Use live midpoint from WebSocket if available
    const midpoint = liveMidpoint;

    // Calculate prices (round to tick size 0.01)
    const yesBuyPrice = Math.round(Math.max(0.01, Math.min(0.99, midpoint - spread)) * 100) / 100;
    const noBuyPrice = Math.round(Math.max(0.01, Math.min(0.99, (1 - midpoint) - spread)) * 100) / 100;

    // Split capital between YES and NO
    const capitalPerSide = capital / 2;

    // Calculate sizes (shares = capital / price)
    // Ensure minimum 5 shares per order (Polymarket requirement)
    const yesSize = Math.max(MIN_ORDER_SIZE, Math.floor(capitalPerSide / yesBuyPrice));
    const noSize = Math.max(MIN_ORDER_SIZE, Math.floor(capitalPerSide / noBuyPrice));

    const orders: CalculatedOrder[] = [];

    // Only add order if we have enough capital for minimum size
    const yesCost = yesBuyPrice * yesSize;
    const noCost = noBuyPrice * noSize;
    const minCost = yesBuyPrice * MIN_ORDER_SIZE + noBuyPrice * MIN_ORDER_SIZE;

    if (capital >= minCost) {
      orders.push({
        outcome: 'YES',
        side: 'BUY',
        price: yesBuyPrice,
        size: yesSize,
        cost: yesCost,
      });

      orders.push({
        outcome: 'NO',
        side: 'BUY',
        price: noBuyPrice,
        size: noSize,
        cost: noCost,
      });
    }

    return orders;
  };

  const orders = calculateOrders();
  const totalCost = orders.reduce((sum, o) => sum + o.cost, 0);

  // Estimate daily reward based on capital share
  const estimatedShare = capital > 0 && market?.liquidity
    ? Math.min(capital / (market.liquidity + capital), 0.5)
    : 0;
  const estimatedDailyReward = market?.rewardPool
    ? market.rewardPool * estimatedShare * 0.3
    : 0;

  // Place orders using MetaMask signing + official Polymarket library
  const handlePlaceOrders = async () => {
    if (!market || orders.length === 0) return;

    // Check we have API credentials
    if (!hasCredentials) {
      setError('No API credentials found. Please run setup script first.');
      toast.error('Run setup script first');
      return;
    }

    // Check we have token IDs
    if (!market.clobTokenIds || market.clobTokenIds.length < 2) {
      setError('Market token IDs not available');
      toast.error('Market token IDs not available');
      return;
    }

    // Check MetaMask is available
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setError('MetaMask not available');
      toast.error('Please install MetaMask');
      return;
    }

    setPlacing(true);
    setError(null);
    setSuccess(null);

    const results: { outcome: string; success: boolean; error?: string }[] = [];
    const makerAddress = funderAddress || walletAddress;

    for (const order of orders) {
      try {
        // Get the correct token ID (YES = index 0, NO = index 1)
        const tokenIndex = order.outcome === 'YES' ? 0 : 1;
        const tokenId = market.clobTokenIds[tokenIndex];

        toast.info(`Sign ${order.outcome} order in MetaMask...`);
        console.log(`📦 Creating order with MetaMask signing:`);
        console.log(`   maker (proxy): ${makerAddress}`);
        console.log(`   signer (EOA): ${walletAddress}`);
        console.log(`   tokenId: ${tokenId.substring(0, 20)}...`);
        console.log(`   price: ${order.price}, size: ${order.size}`);

        // Sign order with MetaMask using official Polymarket library
        const signedOrder = await createSignedOrderWithMetaMask({
          tokenId,
          price: order.price,
          size: order.size,
          side: order.side,
          makerAddress,
          signerAddress: walletAddress,
        });

        toast.info(`Submitting ${order.outcome} order...`);

        // Submit to our API (which adds L2 auth headers)
        const response = await fetch('/api/orders/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order: signedOrder.order,
            signature: signedOrder.signature,
            orderType: 'GTC',
            walletAddress,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Order submission failed');
        }

        results.push({ outcome: order.outcome, success: true });
        toast.success(`${order.outcome} order placed successfully!`);
      } catch (err: any) {
        console.error(`Error placing ${order.outcome} order:`, err);
        results.push({ outcome: order.outcome, success: false, error: err.message });
        toast.error(`${order.outcome}: ${err.message}`);
      }
    }

    setPlacing(false);

    // Show summary
    const successCount = results.filter(r => r.success).length;
    if (successCount === orders.length) {
      setSuccess(`All ${successCount} orders placed successfully!`);
      onOrderPlaced?.();
    } else if (successCount > 0) {
      setSuccess(`${successCount}/${orders.length} orders placed. Check errors above.`);
    } else {
      setError('Failed to place orders. Please try again.');
    }
  };

  // Open Polymarket to view market (fallback)
  const handleOpenPolymarket = () => {
    if (!market) return;
    const url = `https://polymarket.com/event/${market.conditionId || market.id}`;
    window.open(url, '_blank');
  };

  // Copy order details to clipboard
  const handleCopyOrders = () => {
    if (orders.length === 0) return;

    const orderText = orders.map(o =>
      `${o.outcome}: ${o.side} at $${o.price.toFixed(2)} for ${o.size} shares ($${o.cost.toFixed(2)})`
    ).join('\n');

    navigator.clipboard.writeText(orderText);
    toast.success('Order details copied to clipboard');
  };

  if (!market) return null;

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

        <div className="mt-6 space-y-5">
          {/* Capital Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Your Capital</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Enter amount..."
                value={capitalInput}
                onChange={(e) => handleCapitalChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {[100, 500, 1000, 5000].map((amount) => (
                <Button
                  key={amount}
                  variant={capital === amount ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => handleCapitalChange(amount.toString())}
                >
                  ${amount}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Strategy Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Strategy</Label>
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

          {/* Market Info - Live Data */}
          <div className="space-y-2">
            {/* Live indicator */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Market Data</span>
              <div className="flex items-center gap-1">
                {wsConnected ? (
                  <>
                    <Wifi className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-600">Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Static</span>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={`p-2 rounded-lg ${wsConnected ? 'bg-green-50 border border-green-200' : 'bg-muted'}`}>
                <p className="text-xs text-muted-foreground">Midpoint</p>
                <p className={`font-semibold ${wsConnected ? 'text-green-700' : ''}`}>
                  {(liveMidpoint * 100).toFixed(1)}%
                </p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Reward</p>
                <p className="font-semibold text-green-600">{formatUSD(market.rewardPool)}</p>
              </div>
              {liveSpread !== null ? (
                <div className={`p-2 rounded-lg ${wsConnected ? 'bg-blue-50 border border-blue-200' : 'bg-muted'}`}>
                  <p className="text-xs text-muted-foreground">Spread</p>
                  <p className={`font-semibold ${wsConnected ? 'text-blue-700' : ''}`}>
                    {(liveSpread * 100).toFixed(1)}%
                  </p>
                </div>
              ) : market.endDate ? (
                <div className="p-2 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Ends</p>
                  <p className="font-semibold text-xs">
                    {new Date(market.endDate).toLocaleDateString()}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <Separator />

          {/* Calculated Orders */}
          {capital > 0 && orders.length > 0 ? (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Orders to Place</Label>

              {orders.map((order, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    order.outcome === 'YES'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {order.outcome === 'YES' ? (
                        <ArrowUpCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`font-medium ${
                        order.outcome === 'YES' ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {order.side} {order.outcome}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      GTC
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Price</p>
                      <p className="font-medium">${order.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Shares</p>
                      <p className="font-medium">{order.size}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cost</p>
                      <p className="font-medium">{formatUSD(order.cost)}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-muted-foreground">Total Cost</span>
                  <span className="font-bold">{formatUSD(totalCost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Est. Daily Reward</span>
                  <span className="font-bold text-green-600">~{formatUSD(estimatedDailyReward)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p>Enter capital amount to see orders</p>
            </div>
          )}

          {/* Status Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          {/* Action Buttons */}
          {orders.length > 0 && (
            <div className="space-y-2">
              <Button
                onClick={handlePlaceOrders}
                disabled={placing || !hasCredentials || loadingFunder}
                className="w-full"
                size="lg"
              >
                {placing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Placing Orders...
                  </>
                ) : loadingFunder ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : !hasCredentials ? (
                  'Setup Required'
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Sign & Place {orders.length} Orders
                  </>
                )}
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={handleOpenPolymarket}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Market
                </Button>
                <Button
                  onClick={handleCopyOrders}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Details
                </Button>
              </div>
            </div>
          )}

          {orders.length === 0 && (
            <div className="text-center py-2 text-sm text-muted-foreground">
              Enter capital amount to calculate orders
            </div>
          )}

          {/* Tips */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">How it works</span>
            </div>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>1. Select your capital and strategy</li>
              <li>2. Review the calculated orders</li>
              <li>3. Click button and sign in MetaMask</li>
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
