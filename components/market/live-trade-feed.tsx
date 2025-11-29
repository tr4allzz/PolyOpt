// components/market/live-trade-feed.tsx
'use client';

import { useTradeFeed } from '@/hooks/useWebSocket';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LiveTradeFeedProps {
  marketId: string;
  limit?: number;
}

export function LiveTradeFeed({ marketId, limit = 20 }: LiveTradeFeedProps) {
  const { trades, isConnected } = useTradeFeed(marketId, limit);

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Live Trades</h3>
        {isConnected ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse" />
            Streaming
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-gray-50 text-gray-700">
            <Activity className="w-3 h-3 mr-1.5 animate-pulse" />
            Connecting...
          </Badge>
        )}
      </div>

      {/* Trade list */}
      {trades.length > 0 ? (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {trades.map((trade) => {
            const tradeValue = parseFloat(trade.price) * parseFloat(trade.size);
            const timestamp = new Date(trade.timestamp);
            const isLarge = tradeValue > 1000; // $1k+ is highlighted

            return (
              <div
                key={trade.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  isLarge
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {/* Side icon */}
                <div>
                  {trade.side === 'BUY' ? (
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    </div>
                  )}
                </div>

                {/* Trade details */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={trade.side === 'BUY' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {trade.side}
                    </Badge>
                    <span className="text-sm font-medium">
                      ${tradeValue.toFixed(2)}
                    </span>
                    {isLarge && <span className="text-lg">🐋</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono text-gray-600">
                      ${parseFloat(trade.price).toFixed(3)}
                    </span>
                    <span className="text-xs text-gray-400">×</span>
                    <span className="text-xs font-mono text-gray-600">
                      {parseFloat(trade.size).toFixed(0)}
                    </span>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-right">
                  <div className="text-xs text-gray-500">
                    {formatDistanceToNow(timestamp, { addSuffix: true })}
                  </div>
                  {trade.maker_address && (
                    <div className="text-xs font-mono text-gray-400 mt-1">
                      {trade.maker_address.slice(0, 6)}...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-3 animate-pulse" />
          <p className="text-sm">Waiting for trades...</p>
          <p className="text-xs mt-1">Live trades will appear here</p>
        </div>
      )}
    </Card>
  );
}
