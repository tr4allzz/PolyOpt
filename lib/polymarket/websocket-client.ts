/**
 * Polymarket WebSocket Client for Real-Time Market Data
 *
 * Connects to Polymarket CLOB WebSocket for live orderbook updates
 * URL: wss://ws-subscriptions-clob.polymarket.com/ws/
 */

const CLOB_WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/';

export interface OrderBookLevel {
  price: string;
  size: string;
}

export interface BookMessage {
  event_type: 'book';
  asset_id: string;
  market: string; // condition ID
  timestamp: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  hash: string;
}

export interface PriceChangeMessage {
  event_type: 'price_change';
  asset_id: string;
  market: string;
  side: 'BUY' | 'SELL';
  price: string;
  size: string;
  timestamp: string;
}

export interface LastTradeMessage {
  event_type: 'last_trade_price';
  asset_id: string;
  market: string;
  price: string;
  timestamp: string;
}

export type WebSocketMessage = BookMessage | PriceChangeMessage | LastTradeMessage;

export interface WebSocketCallbacks {
  onBook?: (data: BookMessage) => void;
  onPriceChange?: (data: PriceChangeMessage) => void;
  onLastTrade?: (data: LastTradeMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

/**
 * WebSocket client for Polymarket real-time market data
 */
export class PolymarketWebSocket {
  private ws: WebSocket | null = null;
  private callbacks: WebSocketCallbacks;
  private subscribedAssets: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  constructor(callbacks: WebSocketCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(CLOB_WS_URL);

        this.ws.onopen = () => {
          console.log('🔌 WebSocket connected to Polymarket');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.callbacks.onConnect?.();

          // Resubscribe to previously subscribed assets
          if (this.subscribedAssets.size > 0) {
            this.subscribeToAssets(Array.from(this.subscribedAssets));
          }

          resolve();
        };

        this.ws.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          this.isConnecting = false;
          this.callbacks.onDisconnect?.();
          this.attemptReconnect();
        };

        this.ws.onerror = (event) => {
          console.error('🔌 WebSocket error:', event);
          this.isConnecting = false;
          const error = new Error('WebSocket connection error');
          this.callbacks.onError?.(error);
          reject(error);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string) {
    try {
      const messages = JSON.parse(data);

      // Can be array or single message
      const messageArray = Array.isArray(messages) ? messages : [messages];

      for (const message of messageArray) {
        switch (message.event_type) {
          case 'book':
            this.callbacks.onBook?.(message as BookMessage);
            break;
          case 'price_change':
            this.callbacks.onPriceChange?.(message as PriceChangeMessage);
            break;
          case 'last_trade_price':
            this.callbacks.onLastTrade?.(message as LastTradeMessage);
            break;
          default:
            // Ignore other message types (tick_size_change, etc.)
            break;
        }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Subscribe to market updates for specific asset IDs (token IDs)
   */
  subscribeToAssets(assetIds: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Store for later when connected
      assetIds.forEach(id => this.subscribedAssets.add(id));
      return;
    }

    const message = {
      type: 'market',
      assets_ids: assetIds,
    };

    console.log('📡 Subscribing to assets:', assetIds.map(id => id.substring(0, 20) + '...'));
    this.ws.send(JSON.stringify(message));

    assetIds.forEach(id => this.subscribedAssets.add(id));
  }

  /**
   * Unsubscribe from specific assets
   */
  unsubscribeFromAssets(assetIds: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      assetIds.forEach(id => this.subscribedAssets.delete(id));
      return;
    }

    const message = {
      type: 'market',
      assets_ids: assetIds,
      operation: 'unsubscribe',
    };

    this.ws.send(JSON.stringify(message));
    assetIds.forEach(id => this.subscribedAssets.delete(id));
  }

  /**
   * Attempt to reconnect after disconnect
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🔌 Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`🔌 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribedAssets.clear();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get list of subscribed assets
   */
  getSubscribedAssets(): string[] {
    return Array.from(this.subscribedAssets);
  }
}

// Singleton instance for app-wide use
let instance: PolymarketWebSocket | null = null;

export function getWebSocketClient(callbacks?: WebSocketCallbacks): PolymarketWebSocket {
  if (!instance) {
    instance = new PolymarketWebSocket(callbacks);
  }
  return instance;
}
