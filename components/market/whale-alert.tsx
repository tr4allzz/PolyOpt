// components/market/whale-alert.tsx
'use client';

import { useEffect, useState } from 'react';
import { useWhaleDetector } from '@/hooks/useWebSocket';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, TrendingUp, TrendingDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WhaleAlertProps {
  marketId: string;
  threshold?: number;
  showHistory?: boolean;
}

export function WhaleAlert({
  marketId,
  threshold = 10000,
  showHistory = true,
}: WhaleAlertProps) {
  const { whales, latestWhale, requestNotificationPermission } = useWhaleDetector(
    marketId,
    threshold
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const handleEnableNotifications = async () => {
    await requestNotificationPermission();
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">🐋 Whale Alerts</h3>
          <Badge variant="outline" className="text-xs">
            &gt; ${(threshold / 1000).toFixed(0)}k
          </Badge>
        </div>

        {/* Enable notifications */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleEnableNotifications}
          className={notificationsEnabled ? 'bg-green-50 border-green-200' : ''}
        >
          {notificationsEnabled ? (
            <>
              <Bell className="w-4 h-4 mr-2" />
              Enabled
            </>
          ) : (
            <>
              <BellOff className="w-4 h-4 mr-2" />
              Enable Alerts
            </>
          )}
        </Button>
      </div>

      {/* Latest whale (animated alert) */}
      {latestWhale && (
        <div className="mb-4 p-4 rounded-lg border-2 border-yellow-400 bg-yellow-50 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="text-4xl">🐋</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {latestWhale.side === 'BUY' ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className="font-semibold">
                  Large {latestWhale.side} Order Detected!
                </span>
              </div>
              <div className="text-sm text-gray-600">
                <div>
                  <span className="font-mono">
                    ${parseFloat(latestWhale.price).toFixed(3)}
                  </span>
                  {' × '}
                  <span className="font-mono">
                    {parseFloat(latestWhale.size).toFixed(0)} shares
                  </span>
                  {' = '}
                  <span className="font-bold">
                    ${(parseFloat(latestWhale.price) * parseFloat(latestWhale.size)).toFixed(2)}
                  </span>
                </div>
                {latestWhale.maker_address && (
                  <div className="mt-1 text-xs text-gray-500">
                    Trader: {latestWhale.maker_address.slice(0, 6)}...{latestWhale.maker_address.slice(-4)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Whale history */}
      {showHistory && whales.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Whale Activity</h4>
          <div className="space-y-2">
            {whales.map((whale, index) => {
              const tradeValue = parseFloat(whale.price) * parseFloat(whale.size);
              const timestamp = new Date(whale.timestamp);

              return (
                <div
                  key={whale.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  {/* Icon */}
                  <div className="text-xl">
                    {whale.side === 'BUY' ? '📈' : '📉'}
                  </div>

                  {/* Details */}
                  <div className="flex-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={whale.side === 'BUY' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {whale.side}
                      </Badge>
                      <span className="font-mono font-medium">
                        ${tradeValue.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatDistanceToNow(timestamp, { addSuffix: true })}
                    </div>
                  </div>

                  {/* Price and size */}
                  <div className="text-right text-xs">
                    <div className="font-mono">
                      ${parseFloat(whale.price).toFixed(3)}
                    </div>
                    <div className="text-gray-500">
                      {parseFloat(whale.size).toFixed(0)}×
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No whales detected */}
      {whales.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🌊</div>
          <p className="text-sm">No whale activity detected yet</p>
          <p className="text-xs mt-1">
            Monitoring for orders &gt; ${(threshold / 1000).toFixed(0)}k
          </p>
        </div>
      )}

      {/* Info */}
      {!notificationsEnabled && (
        <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-xs text-blue-800">
            💡 Enable notifications to get instant alerts when whales enter this market
          </p>
        </div>
      )}
    </Card>
  );
}
