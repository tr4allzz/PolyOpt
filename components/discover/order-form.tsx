'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle2,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import { formatUSD } from '@/lib/polymarket/utils';

interface Market {
  id: string;
  question: string;
  clobTokenIds: string[];
  midpoint: number;
  rewardPool: number;
}

interface OrderFormProps {
  market: Market;
  walletAddress: string;
  suggestedPrice?: string;
  suggestedSize?: string;
  onOrderPlaced?: () => void;
}

export function OrderForm({
  market,
  walletAddress,
  suggestedPrice,
  suggestedSize,
  onOrderPlaced,
}: OrderFormProps) {
  const { authenticatedFetch } = useAuth();

  // Form state
  const [tokenId, setTokenId] = useState('');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [outcome, setOutcome] = useState<'YES' | 'NO'>('YES');
  const [price, setPrice] = useState(suggestedPrice || '');
  const [size, setSize] = useState(suggestedSize || '');
  const [orderType, setOrderType] = useState<'GTC' | 'GTD' | 'FOK'>('GTC');

  // Status state
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Update suggested values when they change
  useEffect(() => {
    if (suggestedPrice) setPrice(suggestedPrice);
    if (suggestedSize) setSize(suggestedSize);
  }, [suggestedPrice, suggestedSize]);

  // Set token ID based on market and outcome
  useEffect(() => {
    if (market?.clobTokenIds) {
      try {
        const tokens = typeof market.clobTokenIds === 'string'
          ? JSON.parse(market.clobTokenIds)
          : market.clobTokenIds;
        setTokenId(outcome === 'YES' ? tokens[0] : tokens[1]);
      } catch {
        // If parsing fails, try direct access
        const tokens = market.clobTokenIds;
        if (Array.isArray(tokens)) {
          setTokenId(outcome === 'YES' ? tokens[0] : tokens[1]);
        }
      }
    }
  }, [market, outcome]);

  // Handle outcome change
  const handleOutcomeChange = (newOutcome: 'YES' | 'NO') => {
    setOutcome(newOutcome);
    setError(null);
    setSuccess(null);
  };

  // Calculate order value
  const orderValue = parseFloat(price || '0') * parseFloat(size || '0');
  const potentialPayout = parseFloat(size || '0');
  const potentialProfit = potentialPayout - orderValue;

  // Place order
  const handlePlaceOrder = async () => {
    if (!tokenId || !price || !size) {
      setError('Please fill in all required fields');
      return;
    }

    const priceNum = parseFloat(price);
    if (priceNum <= 0 || priceNum >= 1) {
      setError('Price must be between 0.01 and 0.99');
      return;
    }

    setPlacing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await authenticatedFetch('/api/orders/place', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress,
          tokenId,
          price: priceNum,
          size: parseFloat(size),
          side,
          orderType,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(`Order placed successfully!`);
        // Clear form
        setPrice('');
        setSize('');
        if (onOrderPlaced) {
          onOrderPlaced();
        }
      } else {
        setError(data.error || 'Failed to place order');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Outcome Selection */}
      <div className="space-y-2">
        <Label>Outcome</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={outcome === 'YES' ? 'default' : 'outline'}
            onClick={() => handleOutcomeChange('YES')}
            className={outcome === 'YES' ? 'bg-green-600 hover:bg-green-700' : ''}
            size="sm"
          >
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Yes
          </Button>
          <Button
            type="button"
            variant={outcome === 'NO' ? 'default' : 'outline'}
            onClick={() => handleOutcomeChange('NO')}
            className={outcome === 'NO' ? 'bg-red-600 hover:bg-red-700' : ''}
            size="sm"
          >
            <ArrowDownCircle className="h-4 w-4 mr-2" />
            No
          </Button>
        </div>
      </div>

      {/* Side Selection */}
      <div className="space-y-2">
        <Label>Order Side</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={side === 'BUY' ? 'default' : 'outline'}
            onClick={() => setSide('BUY')}
            size="sm"
          >
            Buy (Bid)
          </Button>
          <Button
            type="button"
            variant={side === 'SELL' ? 'default' : 'outline'}
            onClick={() => setSide('SELL')}
            size="sm"
          >
            Sell (Ask)
          </Button>
        </div>
      </div>

      {/* Price & Size */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="price">Price (0.01 - 0.99)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              $
            </span>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0.01"
              max="0.99"
              placeholder="0.50"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="pl-7"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="size">Size (shares)</Label>
          <Input
            id="size"
            type="number"
            step="1"
            min="1"
            placeholder="100"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />
        </div>
      </div>

      {/* Order Type */}
      <div className="space-y-2">
        <Label>Order Type</Label>
        <Select value={orderType} onValueChange={(v: any) => setOrderType(v)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GTC">GTC (Good Till Cancelled)</SelectItem>
            <SelectItem value="FOK">FOK (Fill or Kill)</SelectItem>
            <SelectItem value="GTD">GTD (Good Till Date)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Order Summary */}
      {price && size && (
        <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cost:</span>
            <span className="font-medium">{formatUSD(orderValue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Potential Payout:</span>
            <span className="font-medium">{formatUSD(potentialPayout)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Potential Profit:</span>
            <span className="font-medium text-green-600">
              +{formatUSD(potentialProfit)} ({((potentialProfit / orderValue) * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Place Order Button */}
      <Button
        onClick={handlePlaceOrder}
        disabled={placing || !price || !size || !walletAddress}
        className="w-full"
        size="lg"
      >
        {placing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Placing Order...
          </>
        ) : (
          <>
            <DollarSign className="mr-2 h-4 w-4" />
            Place {side} Order
          </>
        )}
      </Button>

      {!walletAddress && (
        <p className="text-xs text-muted-foreground text-center">
          Connect your wallet to place orders
        </p>
      )}
    </div>
  );
}
