// lib/polymarket/authenticated-client.ts
// Authenticated Polymarket CLOB REST API client for fetching user orders

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const CLOB_API_URL = 'https://clob.polymarket.com';

/**
 * Create L2 authentication headers for Polymarket API
 * Based on: https://docs.polymarket.com/api-documentation/authentication
 * Matches the implementation in @polymarket/clob-client
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

  // Create signature: HMAC-SHA256(secret, timestamp + method + path + body)
  let message = timestamp + method + path;
  if (body) {
    message += body;
  }

  const base64Secret = Buffer.from(secret, 'base64');
  const hmac = crypto.createHmac('sha256', base64Secret);
  const sig = hmac.update(message).digest('base64');

  // URL-safe base64 encoding (keep "=" suffix)
  // Convert '+' to '-' and '/' to '_'
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
 * Fetch user's API credentials from database
 */
async function getUserCredentials(walletAddress: string) {
  const user = await prisma.user.findUnique({
    where: { walletAddress },
    select: {
      apiKey: true,
      apiSecret: true,
      apiPassphrase: true,
    },
  });

  if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
    console.log(`No API credentials found for ${walletAddress}`);
    return null;
  }

  return user;
}

/**
 * Fetch user's open orders using REST API
 */
export async function fetchAuthenticatedOrders(
  walletAddress: string,
  marketConditionId?: string
) {
  const credentials = await getUserCredentials(walletAddress);

  if (!credentials) {
    throw new Error('No API credentials configured for this wallet');
  }

  try {
    // Build query string
    const queryParams = new URLSearchParams();
    if (marketConditionId) {
      queryParams.append('market', marketConditionId);
    }

    const path = '/data/orders' + (queryParams.toString() ? `?${queryParams.toString()}` : '');
    const method = 'GET';

    console.log(`Fetching open orders from: ${CLOB_API_URL}${path}`);

    // Create authentication headers
    const authHeaders = createL2AuthHeaders(
      walletAddress,
      credentials.apiKey!,
      credentials.apiSecret!,
      credentials.apiPassphrase!,
      method,
      path
    );

    // Make authenticated request
    const response = await fetch(`${CLOB_API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      throw new Error(`Failed to fetch orders: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log(`Fetched orders response type:`, typeof data);

    // The response might be an array or an object with a data property
    if (Array.isArray(data)) {
      console.log(`Received ${data.length} orders`);
      return data;
    } else if (data && typeof data === 'object') {
      console.log(`Response keys:`, Object.keys(data));
      if ('data' in data && Array.isArray(data.data)) {
        console.log(`Received ${data.data.length} orders from data property`);
        return data.data;
      }
      // Return the whole object if we can't find the array
      return data;
    }

    return data;
  } catch (error) {
    console.error(`Error fetching authenticated orders:`, error);
    throw error;
  }
}
