/**
 * API Route: Submit Signed Order
 * POST /api/orders/submit
 *
 * Submits a pre-signed order to Polymarket with:
 * - L2 API authentication (user's credentials)
 * - Builder attribution headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildHmacSignature, BuilderApiKeyCreds } from '@polymarket/builder-signing-sdk';
import { prisma } from '@/lib/prisma';
import { decryptCredentials } from '@/lib/crypto/encryption';
import crypto from 'crypto';

const CLOB_API_URL = process.env.CLOB_API_URL || 'https://clob.polymarket.com';

// Builder credentials from environment
const BUILDER_CREDENTIALS: BuilderApiKeyCreds = {
  key: process.env.BUILDER_API_KEY || '',
  secret: process.env.BUILDER_API_SECRET || '',
  passphrase: process.env.BUILDER_API_PASSPHRASE || '',
};

/**
 * Create L2 authentication headers for user
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

  console.log('🔐 L2 Auth Debug:');
  console.log('   walletAddress:', walletAddress);
  console.log('   apiKey:', apiKey);
  console.log('   secret (first 10):', secret?.substring(0, 10) + '...');
  console.log('   passphrase:', passphrase);
  console.log('   timestamp:', timestamp);
  console.log('   method:', method);
  console.log('   path:', path);

  const base64Secret = Buffer.from(secret, 'base64');
  const hmac = crypto.createHmac('sha256', base64Secret);
  const sig = hmac.update(message).digest('base64');
  const sigUrlSafe = sig.replace(/\+/g, '-').replace(/\//g, '_');

  console.log('   signature:', sigUrlSafe.substring(0, 20) + '...');

  return {
    POLY_ADDRESS: walletAddress.toLowerCase(),
    POLY_SIGNATURE: sigUrlSafe,
    POLY_TIMESTAMP: timestamp,
    POLY_API_KEY: apiKey,
    POLY_PASSPHRASE: passphrase,
  };
}

/**
 * Create builder attribution headers using official SDK
 */
function createBuilderHeaders(
  method: string,
  path: string,
  body?: string
): Record<string, string> {
  if (!BUILDER_CREDENTIALS.key || !BUILDER_CREDENTIALS.secret || !BUILDER_CREDENTIALS.passphrase) {
    console.warn('⚠️ Builder credentials not configured');
    return {};
  }

  const timestamp = Date.now().toString();

  const signature = buildHmacSignature(
    BUILDER_CREDENTIALS.secret,
    parseInt(timestamp),
    method,
    path,
    body || ''
  );

  return {
    POLY_BUILDER_API_KEY: BUILDER_CREDENTIALS.key,
    POLY_BUILDER_SIGNATURE: signature,
    POLY_BUILDER_TIMESTAMP: timestamp,
    POLY_BUILDER_PASSPHRASE: BUILDER_CREDENTIALS.passphrase,
  };
}

/**
 * Get user's decrypted API credentials and funder address
 */
async function getUserCredentials(walletAddress: string) {
  const user = await prisma.user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
    select: {
      apiKey: true,
      apiSecret: true,
      apiPassphrase: true,
      funderAddress: true,
    },
  });

  if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
    return null;
  }

  try {
    const decrypted = decryptCredentials({
      apiKey: user.apiKey,
      apiSecret: user.apiSecret,
      apiPassphrase: user.apiPassphrase,
    });
    return {
      ...decrypted,
      // Use funder (proxy wallet) if available, otherwise use login wallet
      funderAddress: user.funderAddress || walletAddress.toLowerCase(),
    };
  } catch (error) {
    console.error('Error decrypting credentials:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order, signature, orderType = 'GTC', walletAddress } = body;

    // Validate required fields
    if (!order || !signature) {
      return NextResponse.json(
        { error: 'Order and signature are required' },
        { status: 400 }
      );
    }

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Get user's L2 API credentials
    const userCredentials = await getUserCredentials(walletAddress);
    if (!userCredentials) {
      return NextResponse.json(
        { error: 'No API credentials found. Please set up your account first.' },
        { status: 401 }
      );
    }

    // Use funder address (proxy wallet) for API calls
    // This is the address that owns the API key and holds funds
    const funderAddress = userCredentials.funderAddress.toLowerCase();

    // Build the signed order payload for Polymarket
    // Format must match clob-client's orderToJson function exactly
    // IMPORTANT: owner field is the API KEY (UUID), not a wallet address!
    const signedOrderPayload = {
      deferExec: false,
      order: {
        salt: parseInt(order.salt, 10), // May lose precision but matches official client
        maker: order.maker,
        signer: order.signer,
        taker: order.taker,
        tokenId: order.tokenId,
        makerAmount: order.makerAmount,
        takerAmount: order.takerAmount,
        side: order.side === 0 ? 'BUY' : 'SELL', // Must be string, not number!
        expiration: order.expiration,
        nonce: order.nonce,
        feeRateBps: order.feeRateBps,
        signatureType: order.signatureType,
        signature: signature,
      },
      owner: userCredentials.apiKey, // Owner is the API key UUID!
      orderType,
    };

    const path = '/order';
    const method = 'POST';
    const bodyStr = JSON.stringify(signedOrderPayload);

    // Create L2 auth headers (user authentication)
    // POLY_ADDRESS = login wallet (EOA) - this is who created the API key
    // owner = proxy/funder wallet - this is where orders and funds are
    const l2AuthHeaders = createL2AuthHeaders(
      walletAddress.toLowerCase(), // Use login wallet for API auth
      userCredentials.apiKey,
      userCredentials.apiSecret,
      userCredentials.apiPassphrase,
      method,
      path,
      bodyStr
    );

    // Create builder headers (attribution)
    const builderHeaders = createBuilderHeaders(method, path, bodyStr);

    console.log('📦 Submitting order with L2 auth + builder attribution');
    console.log('   Login wallet:', walletAddress.substring(0, 10) + '...');
    console.log('   Funder/proxy:', funderAddress.substring(0, 10) + '...');
    console.log('   API Key (owner):', userCredentials.apiKey);
    console.log('   Order maker:', order.maker);
    console.log('   Order signer:', order.signer);
    console.log('   Order payload:', JSON.stringify(signedOrderPayload, null, 2));

    // Check balance before submitting
    try {
      const balancePath = '/data/balance';
      const balanceTimestamp = Math.floor(Date.now() / 1000).toString();
      const balanceMessage = balanceTimestamp + 'GET' + balancePath;
      const balanceBase64Secret = Buffer.from(userCredentials.apiSecret, 'base64');
      const balanceHmac = crypto.createHmac('sha256', balanceBase64Secret);
      const balanceSig = balanceHmac.update(balanceMessage).digest('base64').replace(/\+/g, '-').replace(/\//g, '_');

      const balanceResponse = await fetch(`${CLOB_API_URL}${balancePath}`, {
        headers: {
          'POLY_ADDRESS': walletAddress.toLowerCase(),
          'POLY_SIGNATURE': balanceSig,
          'POLY_TIMESTAMP': balanceTimestamp,
          'POLY_API_KEY': userCredentials.apiKey,
          'POLY_PASSPHRASE': userCredentials.apiPassphrase,
        },
      });
      const balanceText = await balanceResponse.text();
      console.log('💰 Balance response:', balanceResponse.status, balanceText);
    } catch (e: any) {
      console.log('⚠️ Could not fetch balance:', e.message);
    }

    // Submit to Polymarket with both sets of headers
    const response = await fetch(`${CLOB_API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...l2AuthHeaders,
        ...builderHeaders,
      },
      body: bodyStr,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Order submission failed:');
      console.error('   Status:', response.status);
      console.error('   Response:', JSON.stringify(data, null, 2));
      return NextResponse.json(
        { error: data.error || data.message || 'Order submission failed', details: data },
        { status: response.status }
      );
    }

    console.log('✅ Order submitted successfully:', data);
    return NextResponse.json({
      success: true,
      order: data,
    });
  } catch (error: any) {
    console.error('Error submitting order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit order' },
      { status: 500 }
    );
  }
}
