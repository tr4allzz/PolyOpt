// hooks/useWebSocket.ts
// React hooks for WebSocket real-time data

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getClobWebSocket,
  getRtdsWebSocket,
  OrderBookUpdate,
  MarketUpdate,
  TradeUpdate,
} from '@/lib/polymarket/websocket-client';

/**
 * Hook for real-time order book data
 */
export function useOrderBook(marketId: string, assetId: string) {
  const [orderBook, setOrderBook] = useState<OrderBookUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const ws = getClobWebSocket();

    // Connect if not already connected
    if (!ws.isConnected()) {
      ws.connect();
    }

    // Subscribe to order book
    ws.subscribeToOrderBook(marketId, assetId);

    // Handle order book updates
    const unsubscribe = ws.on('book', (data: OrderBookUpdate) => {
      if (data.market === marketId) {
        setOrderBook(data);
      }
    });

    // Handle connection status
    const unsubConnect = ws.onConnect(() => setIsConnected(true));
    const unsubDisconnect = ws.onDisconnect(() => setIsConnected(false));
    const unsubError = ws.onError((err) => setError(err));

    setIsConnected(ws.isConnected());

    return () => {
      unsubscribe();
      unsubConnect();
      unsubDisconnect();
      unsubError();
      ws.unsubscribe('book', marketId);
    };
  }, [marketId, assetId]);

  return { orderBook, isConnected, error };
}

/**
 * Hook for real-time market updates
 */
export function useMarketUpdates(marketId: string) {
  const [marketData, setMarketData] = useState<MarketUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const ws = getClobWebSocket();

    if (!ws.isConnected()) {
      ws.connect();
    }

    ws.subscribeToMarket(marketId);

    const unsubscribe = ws.on('market', (data: MarketUpdate) => {
      if (data.market === marketId) {
        setMarketData(data);
      }
    });

    const unsubConnect = ws.onConnect(() => setIsConnected(true));
    const unsubDisconnect = ws.onDisconnect(() => setIsConnected(false));
    const unsubError = ws.onError((err) => setError(err));

    setIsConnected(ws.isConnected());

    return () => {
      unsubscribe();
      unsubConnect();
      unsubDisconnect();
      unsubError();
      ws.unsubscribe('market', marketId);
    };
  }, [marketId]);

  return { marketData, isConnected, error };
}

/**
 * Hook for real-time trade feed
 */
export function useTradeFeed(marketId: string, limit: number = 20) {
  const [trades, setTrades] = useState<TradeUpdate[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const ws = getClobWebSocket();

    if (!ws.isConnected()) {
      ws.connect();
    }

    ws.subscribeToTrades(marketId);

    const unsubscribe = ws.on('trades', (data: TradeUpdate) => {
      if (data.market === marketId) {
        setTrades((prev) => {
          const newTrades = [data, ...prev];
          return newTrades.slice(0, limit); // Keep only latest N trades
        });
      }
    });

    const unsubConnect = ws.onConnect(() => setIsConnected(true));
    const unsubDisconnect = ws.onDisconnect(() => setIsConnected(false));
    const unsubError = ws.onError((err) => setError(err));

    setIsConnected(ws.isConnected());

    return () => {
      unsubscribe();
      unsubConnect();
      unsubDisconnect();
      unsubError();
      ws.unsubscribe('trades', marketId);
    };
  }, [marketId, limit]);

  return { trades, isConnected, error };
}

/**
 * Hook for whale detection (large orders)
 */
export function useWhaleDetector(
  marketId: string,
  threshold: number = 10000 // $10k+ orders
) {
  const [whales, setWhales] = useState<TradeUpdate[]>([]);
  const [latestWhale, setLatestWhale] = useState<TradeUpdate | null>(null);
  const notificationShownRef = useRef(new Set<string>());

  useEffect(() => {
    const ws = getClobWebSocket();

    if (!ws.isConnected()) {
      ws.connect();
    }

    ws.subscribeToTrades(marketId);

    const unsubscribe = ws.on('trades', (data: TradeUpdate) => {
      if (data.market === marketId) {
        const tradeValue = parseFloat(data.price) * parseFloat(data.size);

        if (tradeValue >= threshold) {
          // Check if we've already shown notification for this trade
          if (!notificationShownRef.current.has(data.id)) {
            setLatestWhale(data);
            setWhales((prev) => [data, ...prev].slice(0, 10)); // Keep latest 10 whales
            notificationShownRef.current.add(data.id);

            // Show browser notification if permitted
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('🐋 Whale Alert!', {
                body: `Large ${data.side} order: $${tradeValue.toFixed(2)}`,
                icon: '/whale-icon.png',
              });
            }
          }
        }
      }
    });

    return () => {
      unsubscribe();
      ws.unsubscribe('trades', marketId);
    };
  }, [marketId, threshold]);

  // Function to request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  return {
    whales,
    latestWhale,
    requestNotificationPermission,
  };
}

/**
 * Hook for real-time Q-score updates
 * Recalculates Q-scores whenever order book changes
 */
export function useRealtimeQScore(
  marketId: string,
  assetId: string,
  userOrders: any[] // User's orders
) {
  const { orderBook } = useOrderBook(marketId, assetId);
  const [qScore, setQScore] = useState<number | null>(null);
  const [competition, setCompetition] = useState<number>(0);

  useEffect(() => {
    if (!orderBook || userOrders.length === 0) {
      return;
    }

    // Calculate total competition from order book
    const totalBids = orderBook.bids.reduce(
      (sum, bid) => sum + parseFloat(bid.size),
      0
    );
    const totalAsks = orderBook.asks.reduce(
      (sum, ask) => sum + parseFloat(ask.size),
      0
    );
    const totalCompetition = totalBids + totalAsks;

    setCompetition(totalCompetition);

    // TODO: Integrate with your Q-score calculator
    // import { calculateQScore } from '@/lib/rewards/calculator';
    // const result = calculateQScore(userOrders, market);
    // setQScore(result.qMin);

  }, [orderBook, userOrders]);

  return { qScore, competition, orderBook };
}

/**
 * Hook for connection status indicator
 */
export function useWebSocketStatus() {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    const ws = getClobWebSocket();

    const unsubConnect = ws.onConnect(() => {
      setStatus('connected');
      setReconnectAttempts(0);
    });

    const unsubDisconnect = ws.onDisconnect(() => {
      setStatus('disconnected');
      setReconnectAttempts((prev) => prev + 1);
    });

    setStatus(ws.isConnected() ? 'connected' : 'disconnected');

    return () => {
      unsubConnect();
      unsubDisconnect();
    };
  }, []);

  return { status, reconnectAttempts };
}

/**
 * Hook for live market commentary (RTDS)
 */
export function useMarketCommentary(marketId?: string) {
  const [comments, setComments] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = getRtdsWebSocket();

    if (!ws.isConnected()) {
      ws.connect();
    }

    // Subscribe to commentary feed
    const unsubscribe = ws.on('*', (data) => {
      // RTDS sends various event types
      if (data.type === 'comment' || data.type === 'activity') {
        if (!marketId || data.market === marketId) {
          setComments((prev) => [data, ...prev].slice(0, 50));
        }
      }
    });

    const unsubConnect = ws.onConnect(() => setIsConnected(true));
    const unsubDisconnect = ws.onDisconnect(() => setIsConnected(false));

    setIsConnected(ws.isConnected());

    return () => {
      unsubscribe();
      unsubConnect();
      unsubDisconnect();
    };
  }, [marketId]);

  return { comments, isConnected };
}
