// components/market/realtime-order-book.tsx
'use client';

import { useOrderBook } from '@/hooks/useWebSocket';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface RealtimeOrderBookProps {
  marketId: string;
  assetId: string;
  midpoint?: number;
}

export function RealtimeOrderBook({
  marketId,
  assetId,
  midpoint = 0.5,
}: RealtimeOrderBookProps) {
  const { orderBook, isConnected, error } = useOrderBook(marketId, assetId);

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-500">
          <p className="font-medium">Connection Error</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      </Card>
    );
  }

  if (!orderBook && isConnected) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <Activity className="w-8 h-8 mx-auto mb-2 animate-pulse" />
          <p>Waiting for order book data...</p>
        </div>
      </Card>
    );
  }

  const bids = orderBook?.bids || [];
  const asks = orderBook?.asks || [];

  // Calculate depth
  const totalBidVolume = bids.reduce((sum, b) => sum + parseFloat(b.size), 0);
  const totalAskVolume = asks.reduce((sum, a) => sum + parseFloat(a.size), 0);

  // Best bid/ask
  const bestBid = bids[0] ? parseFloat(bids[0].price) : null;
  const bestAsk = asks[0] ? parseFloat(asks[0].price) : null;
  const spread = bestBid && bestAsk ? bestAsk - bestBid : null;

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Live Order Book</h3>
          <p className="text-sm text-gray-500">
            Real-time depth • {isConnected ? (
              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse" />
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-2 bg-gray-50 text-gray-700">
                Connecting...
              </Badge>
            )}
          </p>
        </div>

        {spread !== null && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Spread</p>
            <p className="text-sm font-medium">
              {(spread * 100).toFixed(2)}¢
            </p>
          </div>
        )}
      </div>

      {/* Order Book Visualization */}
      <div className="grid grid-cols-2 gap-4">
        {/* Bids (Buy Orders) */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <h4 className="text-sm font-medium text-green-600">Bids</h4>
            <span className="text-xs text-gray-500 ml-auto">
              {totalBidVolume.toFixed(0)} shares
            </span>
          </div>

          <div className="space-y-1">
            {bids.slice(0, 10).map((bid, index) => {
              const price = parseFloat(bid.price);
              const size = parseFloat(bid.size);
              const percentage = (size / totalBidVolume) * 100;
              const isNearMidpoint = Math.abs(price - midpoint) < 0.05;

              return (
                <div
                  key={index}
                  className="relative h-6 rounded overflow-hidden"
                >
                  {/* Depth bar */}
                  <div
                    className={`absolute inset-y-0 right-0 ${
                      isNearMidpoint ? 'bg-green-200' : 'bg-green-100'
                    } transition-all`}
                    style={{ width: `${percentage}%` }}
                  />

                  {/* Price and size */}
                  <div className="relative flex items-center justify-between px-2 h-full text-xs">
                    <span className={`font-mono ${isNearMidpoint ? 'font-bold' : ''}`}>
                      ${price.toFixed(3)}
                    </span>
                    <span className="text-gray-600">
                      {size.toFixed(0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Asks (Sell Orders) */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <h4 className="text-sm font-medium text-red-600">Asks</h4>
            <span className="text-xs text-gray-500 ml-auto">
              {totalAskVolume.toFixed(0)} shares
            </span>
          </div>

          <div className="space-y-1">
            {asks.slice(0, 10).map((ask, index) => {
              const price = parseFloat(ask.price);
              const size = parseFloat(ask.size);
              const percentage = (size / totalAskVolume) * 100;
              const isNearMidpoint = Math.abs(price - midpoint) < 0.05;

              return (
                <div
                  key={index}
                  className="relative h-6 rounded overflow-hidden"
                >
                  {/* Depth bar */}
                  <div
                    className={`absolute inset-y-0 left-0 ${
                      isNearMidpoint ? 'bg-red-200' : 'bg-red-100'
                    } transition-all`}
                    style={{ width: `${percentage}%` }}
                  />

                  {/* Price and size */}
                  <div className="relative flex items-center justify-between px-2 h-full text-xs">
                    <span className={`font-mono ${isNearMidpoint ? 'font-bold' : ''}`}>
                      ${price.toFixed(3)}
                    </span>
                    <span className="text-gray-600">
                      {size.toFixed(0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Market Stats */}
      {orderBook && (
        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Best Bid</p>
            <p className="text-sm font-mono font-medium text-green-600">
              {bestBid ? `$${bestBid.toFixed(3)}` : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Midpoint</p>
            <p className="text-sm font-mono font-medium">
              ${((bestBid || 0 + (bestAsk || 0)) / 2).toFixed(3)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Best Ask</p>
            <p className="text-sm font-mono font-medium text-red-600">
              {bestAsk ? `$${bestAsk.toFixed(3)}` : '-'}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
