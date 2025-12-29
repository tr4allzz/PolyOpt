/**
 * Polymarket Builder Client
 * Implements order placement with builder attribution for the Builders Program
 *
 * IMPORTANT: Builder credentials are stored in environment variables (not per-user)
 * This means ALL orders placed through this app are attributed to YOUR builder account.
 *
 * Required environment variables:
 * - BUILDER_API_KEY
 * - BUILDER_API_SECRET
 * - BUILDER_API_PASSPHRASE
 *
 * Required headers for builder attribution:
 * - POLY_BUILDER_API_KEY
 * - POLY_BUILDER_TIMESTAMP
 * - POLY_BUILDER_PASSPHRASE
 * - POLY_BUILDER_SIGNATURE
 */

import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto/encryption';
import crypto from 'crypto';
import axios from 'axios';

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
  price: number;      // 0.0 to 1.0
  size: number;       // Number of shares
  side: Side;
  orderType?: OrderType;
  expiration?: number; // Unix timestamp for GTD orders
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
 * Create L2 authentication headers for CLOB API
 */
function createL2AuthHeaders(
  walletAddress: string,
  apiKey: string,
  secret: string,
  passphrase: string,
  method: string,
  path: string,
  body?: string
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();

  let message = timestamp + method + path;
  if (body) {
    message += body;
  }

  const base64Secret = Buffer.from(secret, 'base64');
  const hmac = crypto.createHmac('sha256', base64Secret);
  const sig = hmac.update(message).digest('base64');
  const sigUrlSafe = sig.replace(/\+/g, '-').replace(/\//g, '_');

  return {
    POLY_ADDRESS: walletAddress,
    POLY_SIGNATURE: sigUrlSafe,
    POLY_TIMESTAMP: timestamp,
    POLY_API_KEY: apiKey,
    POLY_PASSPHRASE: passphrase,
  };
}

/**
 * Create builder attribution headers using app-level credentials
 * These headers attribute ALL orders to YOUR builder account
 */
function createBuilderHeaders(
  method: string,
  path: string,
  body?: string
): Record<string, string> {
  if (!BUILDER_API_KEY || !BUILDER_API_SECRET || !BUILDER_API_PASSPHRASE) {
    console.warn('⚠️ Builder credentials not configured in environment');
    return {};
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();

  // HMAC signature: timestamp + method + path + body
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
 * Get user's L2 credentials from database (for user authentication)
 */
async function getUserL2Credentials(walletAddress: string) {
  const user = await prisma.user.findUnique({
    where: { walletAddress },
    select: {
      apiKey: true,
      apiSecret: true,
      apiPassphrase: true,
      funderAddress: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.apiKey || !user.apiSecret || !user.apiPassphrase) {
    throw new Error('No L2 API credentials configured for this wallet');
  }

  return {
    apiKey: decrypt(user.apiKey),
    apiSecret: decrypt(user.apiSecret),
    apiPassphrase: decrypt(user.apiPassphrase),
    funderAddress: user.funderAddress,
  };
}

/**
 * Place an order on Polymarket with builder attribution
 * - User's L2 credentials are used for authentication
 * - App's builder credentials are used for attribution (all orders attributed to you)
 */
export async function placeOrder(
  walletAddress: string,
  order: OrderRequest
): Promise<PlacedOrder> {
  const userCredentials = await getUserL2Credentials(walletAddress);

  const path = '/order';
  const method = 'POST';

  // Build order payload
  const orderPayload = {
    tokenId: order.tokenId,
    price: order.price.toString(),
    size: order.size.toString(),
    side: order.side,
    orderType: order.orderType || 'GTC',
    ...(order.expiration && { expiration: order.expiration }),
  };

  const body = JSON.stringify(orderPayload);

  // Create L2 auth headers (user's credentials)
  const authHeaders = createL2AuthHeaders(
    walletAddress,
    userCredentials.apiKey,
    userCredentials.apiSecret,
    userCredentials.apiPassphrase,
    method,
    path,
    body
  );

  // Create builder attribution headers (YOUR app's credentials)
  const builderHeaders = createBuilderHeaders(method, path, body);

  if (Object.keys(builderHeaders).length > 0) {
    console.log('📦 Adding builder attribution headers (orders attributed to app owner)');
  } else {
    console.warn('⚠️ No builder credentials in environment - orders will not be attributed');
  }

  try {
    const response = await axios.post(`${CLOB_API_URL}${path}`, orderPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PolyOpt/1.0',
        'Accept': 'application/json',
        ...authHeaders,
        ...builderHeaders,
      },
      timeout: 15000,
    });

    console.log('✅ Order placed successfully:', response.data);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(`Order placement failed (${error.response.status}):`, error.response.data);
      throw new Error(`Failed to place order: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Cancel an order on Polymarket
 */
export async function cancelOrder(
  walletAddress: string,
  orderId: string
): Promise<{ success: boolean; message: string }> {
  const userCredentials = await getUserL2Credentials(walletAddress);

  const path = `/order/${orderId}`;
  const method = 'DELETE';

  const authHeaders = createL2AuthHeaders(
    walletAddress,
    userCredentials.apiKey,
    userCredentials.apiSecret,
    userCredentials.apiPassphrase,
    method,
    path
  );

  try {
    const response = await axios.delete(`${CLOB_API_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PolyOpt/1.0',
        'Accept': 'application/json',
        ...authHeaders,
      },
      timeout: 15000,
    });

    console.log('✅ Order cancelled successfully:', response.data);
    return { success: true, message: 'Order cancelled' };
  } catch (error: any) {
    if (error.response) {
      console.error(`Order cancellation failed (${error.response.status}):`, error.response.data);
      throw new Error(`Failed to cancel order: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Cancel all orders for a user
 */
export async function cancelAllOrders(
  walletAddress: string,
  marketConditionId?: string
): Promise<{ success: boolean; cancelled: number }> {
  const userCredentials = await getUserL2Credentials(walletAddress);

  let path = '/orders';
  if (marketConditionId) {
    path += `?market=${marketConditionId}`;
  }
  const method = 'DELETE';

  const authHeaders = createL2AuthHeaders(
    walletAddress,
    userCredentials.apiKey,
    userCredentials.apiSecret,
    userCredentials.apiPassphrase,
    method,
    path
  );

  try {
    const response = await axios.delete(`${CLOB_API_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PolyOpt/1.0',
        'Accept': 'application/json',
        ...authHeaders,
      },
      timeout: 15000,
    });

    console.log('✅ All orders cancelled:', response.data);
    return { success: true, cancelled: response.data?.cancelled || 0 };
  } catch (error: any) {
    if (error.response) {
      console.error(`Cancel all orders failed (${error.response.status}):`, error.response.data);
      throw new Error(`Failed to cancel orders: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}
