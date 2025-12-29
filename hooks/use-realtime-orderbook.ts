'use client';

/**
 * React hook for real-time orderbook updates via WebSocket
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PolymarketWebSocket,
  BookMessage,
  PriceChangeMessage,
  LastTradeMessage,
  OrderBookLevel,
} from '@/lib/polymarket/websocket-client';

export interface OrderBookState {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  bestBid: string | null;
  bestAsk: string | null;
  spread: number | null;
  midpoint: number | null;
  lastTradePrice: string | null;
  lastUpdate: Date | null;
}

export interface UseRealtimeOrderBookOptions {
  /** Token IDs to subscribe to (YES and NO tokens) */
  tokenIds: string[];
  /** Called when orderbook updates */
  onUpdate?: (state: OrderBookState) => void;
  /** Called when a trade occurs */
  onTrade?: (price: string, assetId: string) => void;
}

export function useRealtimeOrderBook(options: UseRealtimeOrderBookOptions) {
  const { tokenIds, onUpdate, onTrade } = options;

  const [orderBook, setOrderBook] = useState<OrderBookState>({
    bids: [],
    asks: [],
    bestBid: null,
    bestAsk: null,
    spread: null,
    midpoint: null,
    lastTradePrice: null,
    lastUpdate: null,
  });

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<PolymarketWebSocket | null>(null);

  // Calculate derived values from bids/asks
  const calculateDerivedValues = useCallback((bids: OrderBookLevel[], asks: OrderBookLevel[]) => {
    const bestBid = bids.length > 0 ? bids[0].price : null;
    const bestAsk = asks.length > 0 ? asks[0].price : null;

    let spread: number | null = null;
    let midpoint: number | null = null;

    if (bestBid && bestAsk) {
      const bidNum = parseFloat(bestBid);
      const askNum = parseFloat(bestAsk);
      spread = askNum - bidNum;
      midpoint = (bidNum + askNum) / 2;
    }

    return { bestBid, bestAsk, spread, midpoint };
  }, []);

  // Handle book message (full orderbook snapshot)
  const handleBook = useCallback((message: BookMessage) => {
    // Sort bids descending (highest first)
    const sortedBids = [...message.bids].sort(
      (a, b) => parseFloat(b.price) - parseFloat(a.price)
    );

    // Sort asks ascending (lowest first)
    const sortedAsks = [...message.asks].sort(
      (a, b) => parseFloat(a.price) - parseFloat(b.price)
    );

    const derived = calculateDerivedValues(sortedBids, sortedAsks);

    const newState: OrderBookState = {
      bids: sortedBids,
      asks: sortedAsks,
      ...derived,
      lastTradePrice: orderBook.lastTradePrice,
      lastUpdate: new Date(),
    };

    setOrderBook(newState);
    onUpdate?.(newState);
  }, [calculateDerivedValues, onUpdate, orderBook.lastTradePrice]);

  // Handle price change message (incremental update)
  const handlePriceChange = useCallback((message: PriceChangeMessage) => {
    setOrderBook(prev => {
      const isBid = message.side === 'BUY';
      const levels = isBid ? [...prev.bids] : [...prev.asks];

      // Find existing level at this price
      const existingIndex = levels.findIndex(l => l.price === message.price);

      if (parseFloat(message.size) === 0) {
        // Remove level
        if (existingIndex >= 0) {
          levels.splice(existingIndex, 1);
        }
      } else if (existingIndex >= 0) {
        // Update existing level
        levels[existingIndex] = { price: message.price, size: message.size };
      } else {
        // Add new level
        levels.push({ price: message.price, size: message.size });
      }

      // Sort appropriately
      if (isBid) {
        levels.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      } else {
        levels.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      }

      const newBids = isBid ? levels : prev.bids;
      const newAsks = isBid ? prev.asks : levels;
      const derived = calculateDerivedValues(newBids, newAsks);

      const newState: OrderBookState = {
        bids: newBids,
        asks: newAsks,
        ...derived,
        lastTradePrice: prev.lastTradePrice,
        lastUpdate: new Date(),
      };

      onUpdate?.(newState);
      return newState;
    });
  }, [calculateDerivedValues, onUpdate]);

  // Handle trade message
  const handleTrade = useCallback((message: LastTradeMessage) => {
    setOrderBook(prev => ({
      ...prev,
      lastTradePrice: message.price,
      lastUpdate: new Date(),
    }));
    onTrade?.(message.price, message.asset_id);
  }, [onTrade]);

  // Connect and subscribe
  useEffect(() => {
    if (tokenIds.length === 0) return;

    const ws = new PolymarketWebSocket({
      onConnect: () => {
        setIsConnected(true);
        setError(null);
        console.log('📡 Real-time orderbook connected');
      },
      onDisconnect: () => {
        setIsConnected(false);
        console.log('📡 Real-time orderbook disconnected');
      },
      onError: (err) => {
        setError(err.message);
        console.error('📡 Real-time orderbook error:', err);
      },
      onBook: handleBook,
      onPriceChange: handlePriceChange,
      onLastTrade: handleTrade,
    });

    wsRef.current = ws;

    ws.connect()
      .then(() => {
        ws.subscribeToAssets(tokenIds);
      })
      .catch((err) => {
        setError(err.message);
      });

    return () => {
      ws.disconnect();
      wsRef.current = null;
    };
  }, [tokenIds.join(','), handleBook, handlePriceChange, handleTrade]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current.connect().then(() => {
        wsRef.current?.subscribeToAssets(tokenIds);
      });
    }
  }, [tokenIds]);

  return {
    orderBook,
    isConnected,
    error,
    reconnect,
  };
}
