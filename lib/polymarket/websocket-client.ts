// lib/polymarket/websocket-client.ts
// WebSocket client for real-time Polymarket data

export type WSMessageType =
  | 'subscribe'
  | 'unsubscribe'
  | 'market'
  | 'book'
  | 'trade'
  | 'user'
  | 'tick';

export type WSChannel =
  | 'market'    // Market updates (price, volume)
  | 'book'      // Order book depth
  | 'trades'    // Recent trades
  | 'user';     // User-specific updates

export interface WSMessage {
  type: WSMessageType;
  channel?: WSChannel;
  market?: string;
  data?: any;
}

export interface OrderBookUpdate {
  market: string;
  asset: string;
  timestamp: number;
  hash: number;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
}

export interface MarketUpdate {
  market: string;
  event_type: string;
  outcome?: string;
  price?: string;
  side?: string;
  size?: string;
  timestamp: number;
}

export interface TradeUpdate {
  id: string;
  market: string;
  asset_id: string;
  side: 'BUY' | 'SELL';
  price: string;
  size: string;
  timestamp: number;
  maker_address?: string;
  taker_address?: string;
}

type MessageHandler = (data: any) => void;
type ErrorHandler = (error: Error) => void;
type ConnectionHandler = () => void;

/**
 * WebSocket client for Polymarket real-time data
 *
 * Endpoints:
 * - CLOB: wss://ws-subscriptions-clob.polymarket.com/ws/
 * - RTDS: wss://ws-live-data.polymarket.com
 */
export class PolymarketWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private disconnectionHandlers: Set<ConnectionHandler> = new Set();
  private subscriptions: Set<string> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(endpoint: 'clob' | 'rtds' = 'clob') {
    this.url = endpoint === 'clob'
      ? 'wss://ws-subscriptions-clob.polymarket.com/ws/'
      : 'wss://ws-live-data.polymarket.com';
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      console.log(`[WS] Connecting to ${this.url}...`);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[WS] Connected successfully');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;

        // Resubscribe to all channels
        this.subscriptions.forEach(subscription => {
          this.send(JSON.parse(subscription));
        });

        // Start heartbeat
        this.startHeartbeat();

        // Notify connection handlers
        this.connectionHandlers.forEach(handler => handler());
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (event) => {
        console.error('[WS] Error:', event);
        const error = new Error('WebSocket error');
        this.errorHandlers.forEach(handler => handler(error));
      };

      this.ws.onclose = () => {
        console.log('[WS] Connection closed');
        this.stopHeartbeat();

        // Notify disconnection handlers
        this.disconnectionHandlers.forEach(handler => handler());

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

          this.reconnectTimeout = setTimeout(() => {
            this.connect();
          }, delay);
        } else {
          console.error('[WS] Max reconnection attempts reached');
        }
      };
    } catch (error) {
      console.error('[WS] Connection failed:', error);
      const err = error instanceof Error ? error : new Error('Connection failed');
      this.errorHandlers.forEach(handler => handler(err));
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscriptions.clear();
    console.log('[WS] Disconnected');
  }

  /**
   * Subscribe to a market's order book
   */
  subscribeToOrderBook(marketId: string, assetId: string): void {
    const message = {
      type: 'subscribe',
      channel: 'book',
      market: marketId,
      asset_id: assetId,
    };

    this.subscriptions.add(JSON.stringify(message));
    this.send(message);
  }

  /**
   * Subscribe to market updates
   */
  subscribeToMarket(marketId: string): void {
    const message = {
      type: 'subscribe',
      channel: 'market',
      market: marketId,
    };

    this.subscriptions.add(JSON.stringify(message));
    this.send(message);
  }

  /**
   * Subscribe to trade feed
   */
  subscribeToTrades(marketId: string): void {
    const message = {
      type: 'subscribe',
      channel: 'trades',
      market: marketId,
    };

    this.subscriptions.add(JSON.stringify(message));
    this.send(message);
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: WSChannel, marketId?: string): void {
    const message = {
      type: 'unsubscribe',
      channel,
      market: marketId,
    };

    const key = JSON.stringify(message);
    this.subscriptions.delete(key);
    this.send(message);
  }

  /**
   * Register a message handler for a specific channel
   */
  on(channel: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(channel)) {
      this.messageHandlers.set(channel, new Set());
    }
    this.messageHandlers.get(channel)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(channel);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(channel);
        }
      }
    };
  }

  /**
   * Register an error handler
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  /**
   * Register a connection handler
   */
  onConnect(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  /**
   * Register a disconnection handler
   */
  onDisconnect(handler: ConnectionHandler): () => void {
    this.disconnectionHandlers.add(handler);
    return () => this.disconnectionHandlers.delete(handler);
  }

  /**
   * Send a message to the WebSocket server
   */
  private send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      console.log('[WS] Sent:', message);
    } else {
      console.warn('[WS] Cannot send message, not connected');
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: any): void {
    const { channel, type } = message;

    // Handle by channel
    if (channel) {
      const handlers = this.messageHandlers.get(channel);
      if (handlers) {
        handlers.forEach(handler => handler(message));
      }
    }

    // Handle by type
    if (type) {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.forEach(handler => handler(message));
      }
    }

    // Handle all messages
    const allHandlers = this.messageHandlers.get('*');
    if (allHandlers) {
      allHandlers.forEach(handler => handler(message));
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance for CLOB WebSocket
let clobInstance: PolymarketWebSocket | null = null;

export function getClobWebSocket(): PolymarketWebSocket {
  if (!clobInstance) {
    clobInstance = new PolymarketWebSocket('clob');
  }
  return clobInstance;
}

// Singleton instance for RTDS WebSocket
let rtdsInstance: PolymarketWebSocket | null = null;

export function getRtdsWebSocket(): PolymarketWebSocket {
  if (!rtdsInstance) {
    rtdsInstance = new PolymarketWebSocket('rtds');
  }
  return rtdsInstance;
}
