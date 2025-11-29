// lib/polymarket/authenticated-client.ts
// Authenticated Polymarket CLOB REST API client for fetching user orders

import { prisma } from '@/lib/prisma';
import { decryptCredentials } from '@/lib/crypto/encryption';
import crypto from 'crypto';
import axios from 'axios';

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
 * Fetch user's API credentials from database and decrypt them
 */
async function getUserCredentials(walletAddress: string) {
  const user = await prisma.user.findUnique({
    where: { walletAddress },
    select: {
      apiKey: true,
      apiSecret: true,
      apiPassphrase: true,
      funderAddress: true,
    },
  });

  if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
    console.log(`No API credentials found for ${walletAddress}`);
    return null;
  }

  // Decrypt credentials before returning
  try {
    const decrypted = decryptCredentials({
      apiKey: user.apiKey,
      apiSecret: user.apiSecret,
      apiPassphrase: user.apiPassphrase,
    });

    return {
      ...decrypted,
      funderAddress: user.funderAddress, // Pass through funder address (not encrypted)
    };
  } catch (error) {
    console.error('Error decrypting credentials:', error);
    throw new Error('Failed to decrypt API credentials. They may have been encrypted with a different key.');
  }
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
    // IMPORTANT: POLY_ADDRESS in API calls must match the wallet that CREATED the API credentials
    // The API key is tied to the signing wallet (login wallet), not the proxy/funder wallet
    // The server will return orders for all wallets controlled by this address (including proxy)
    console.log(`Using address for API calls: ${walletAddress} (login wallet - matches API key owner)`);
    if (credentials.funderAddress) {
      console.log(`   Proxy wallet (where funds are held): ${credentials.funderAddress}`);
    }

    // Build query string
    const queryParams = new URLSearchParams();
    if (marketConditionId) {
      queryParams.append('market', marketConditionId);
    }

    const path = '/data/orders' + (queryParams.toString() ? `?${queryParams.toString()}` : '');
    const method = 'GET';

    console.log(`Fetching open orders from: ${CLOB_API_URL}${path}`);

    // Create authentication headers using the LOGIN wallet address (the one that created the API key)
    const authHeaders = createL2AuthHeaders(
      walletAddress, // Must be the login wallet that derived the API credentials!
      credentials.apiKey!,
      credentials.apiSecret!,
      credentials.apiPassphrase!,
      method,
      path
    );

    // Debug: Log auth headers (redacted)
    console.log('📤 Auth headers:', {
      POLY_ADDRESS: authHeaders.POLY_ADDRESS,
      POLY_API_KEY: authHeaders.POLY_API_KEY?.substring(0, 20) + '...',
      POLY_SIGNATURE: authHeaders.POLY_SIGNATURE?.substring(0, 20) + '...',
      POLY_TIMESTAMP: authHeaders.POLY_TIMESTAMP,
      POLY_PASSPHRASE: authHeaders.POLY_PASSPHRASE?.substring(0, 10) + '...',
    });

    // Make authenticated request using axios for better reliability
    const response = await axios.get(`${CLOB_API_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; PolyOpt/1.0)',
        'Accept': 'application/json',
        ...authHeaders,
      },
      timeout: 10000,
    });

    const data = response.data;
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
  } catch (error: any) {
    if (error.response) {
      // Axios error with response
      console.error(`API error (${error.response.status}):`, error.response.data);
      throw new Error(`Failed to fetch orders: ${error.response.status} ${JSON.stringify(error.response.data)}`);
    }
    console.error(`Error fetching authenticated orders:`, error.message);
    throw error;
  }
}
