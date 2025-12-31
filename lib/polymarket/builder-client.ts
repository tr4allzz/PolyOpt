/**
 * Polymarket Builder Client
 *
 * ⚠️ PARTIALLY DISABLED: Order placement functions are disabled.
 * Builder status functions are kept for informational purposes.
 *
 * We no longer store user API credentials for security reasons.
 */

import crypto from 'crypto';

const CLOB_API_URL = process.env.CLOB_API_URL || 'https://clob.polymarket.com';

// Builder credentials from environment (YOUR credentials as the app owner)
const BUILDER_API_KEY = process.env.BUILDER_API_KEY;
const BUILDER_API_SECRET = process.env.BUILDER_API_SECRET;
const BUILDER_API_PASSPHRASE = process.env.BUILDER_API_PASSPHRASE;

// Order types supported by Polymarket
export type OrderType = 'GTC' | 'GTD' | 'FOK';
export type Side = 'BUY' | 'SELL';

export interface OrderRequest {
  tokenId: string;
  price: number;
  size: number;
  side: Side;
  orderType?: OrderType;
  expiration?: number;
}

export interface PlacedOrder {
  id: string;
  status: string;
  tokenId: string;
  price: string;
  size: string;
  side: string;
  orderType: string;
  createdAt: string;
}

/**
 * Check if builder credentials are configured in environment
 */
export function isBuilderConfigured(): boolean {
  return !!(BUILDER_API_KEY && BUILDER_API_SECRET && BUILDER_API_PASSPHRASE);
}

/**
 * Get builder configuration status
 */
export function getBuilderStatus(): {
  configured: boolean;
  apiKeyPrefix?: string;
} {
  if (!isBuilderConfigured()) {
    return { configured: false };
  }
  return {
    configured: true,
    apiKeyPrefix: BUILDER_API_KEY?.substring(0, 8) + '...',
  };
}

/**
 * Create builder attribution headers using app-level credentials
 */
export function createBuilderHeaders(
  method: string,
  path: string,
  body?: string
): Record<string, string> {
  if (!BUILDER_API_KEY || !BUILDER_API_SECRET || !BUILDER_API_PASSPHRASE) {
    return {};
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();

  let message = timestamp + method + path;
  if (body) {
    message += body;
  }

  const base64Secret = Buffer.from(BUILDER_API_SECRET, 'base64');
  const hmac = crypto.createHmac('sha256', base64Secret);
  const sig = hmac.update(message).digest('base64');
  const sigUrlSafe = sig.replace(/\+/g, '-').replace(/\//g, '_');

  return {
    POLY_BUILDER_API_KEY: BUILDER_API_KEY,
    POLY_BUILDER_SIGNATURE: sigUrlSafe,
    POLY_BUILDER_TIMESTAMP: timestamp,
    POLY_BUILDER_PASSPHRASE: BUILDER_API_PASSPHRASE,
  };
}

/**
 * Place an order on Polymarket
 * ⚠️ DISABLED - We no longer store user API credentials
 */
export async function placeOrder(
  walletAddress: string,
  order: OrderRequest
): Promise<PlacedOrder> {
  throw new Error('Order placement is disabled. We no longer store API credentials for security reasons.');
}

/**
 * Cancel an order on Polymarket
 * ⚠️ DISABLED - We no longer store user API credentials
 */
export async function cancelOrder(
  walletAddress: string,
  orderId: string
): Promise<{ success: boolean; message: string }> {
  throw new Error('Order cancellation is disabled. We no longer store API credentials for security reasons.');
}

/**
 * Cancel all orders for a user
 * ⚠️ DISABLED - We no longer store user API credentials
 */
export async function cancelAllOrders(
  walletAddress: string,
  marketConditionId?: string
): Promise<{ success: boolean; cancelled: number }> {
  throw new Error('Order cancellation is disabled. We no longer store API credentials for security reasons.');
}
