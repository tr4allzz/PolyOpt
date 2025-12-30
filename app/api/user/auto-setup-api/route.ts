// app/api/user/auto-setup-api/route.ts
// Automatically derive and save API credentials from wallet signature

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { encryptCredentials } from '@/lib/crypto/encryption';
import axios from 'axios';

/**
 * POST /api/user/auto-setup-api
 * Automatically derive API credentials from wallet signature
 * This is called after user connects wallet - no manual API key creation needed!
 */
export const POST = requireAuth(async (request: NextRequest, auth) => {
  const walletAddress = auth.walletAddress;

  console.log('🔄 Auto-setting up API credentials for:', walletAddress);

  try {
    // Get the wallet client signature from the request
    const body = await request.json();
    const { signature, timestamp, nonce } = body;

    console.log('📝 Using nonce:', nonce);

    // Check if user already has a known funder address from previous manual setup
    const existingUser = await prisma.user.findUnique({
      where: { walletAddress },
      select: { funderAddress: true },
    });

    const knownFunderAddress = existingUser?.funderAddress;

    console.log('📍 Wallet addresses:', {
      login: walletAddress,
      knownFunder: knownFunderAddress || 'none',
    });

    // Call Polymarket CLOB to derive API credentials
    const CLOB_API_URL = 'https://clob.polymarket.com';

    // IMPORTANT: POLY_ADDRESS must match the wallet that signed the message
    // The signature includes the address - they must match or we get "Invalid L1 Request headers"
    // We'll create credentials for the LOGIN wallet, then see if they work for the proxy
    console.log('🔑 Creating API credentials...');
    console.log('   - Signing wallet (EOA):', walletAddress);
    if (knownFunderAddress) {
      console.log('   - Note: Proxy wallet detected:', knownFunderAddress);
      console.log('   - Will create credentials for login wallet and test if they work for proxy');
    }

    // Log exact request details for debugging
    const headers = {
      'POLY_ADDRESS': walletAddress, // Must match the signature!
      'POLY_SIGNATURE': signature,
      'POLY_TIMESTAMP': timestamp.toString(),
      'POLY_NONCE': nonce.toString(),
    };

    console.log('📤 Sending create-api-key request (POST):');
    console.log('   URL:', `${CLOB_API_URL}/auth/api-key`);
    console.log('   Headers:', {
      POLY_ADDRESS: headers.POLY_ADDRESS,
      POLY_SIGNATURE: headers.POLY_SIGNATURE?.substring(0, 20) + '...',
      POLY_TIMESTAMP: headers.POLY_TIMESTAMP,
      POLY_NONCE: headers.POLY_NONCE,
    });

    // Try CREATE first, then fall back to DERIVE (like the official client does)
    // This is the createOrDeriveApiKey() pattern from @polymarket/clob-client
    let credentials = null;
    let method = '';

    const axiosConfig = {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Origin': 'https://polymarket.com',
        'Referer': 'https://polymarket.com/',
      },
      timeout: 15000,
    };

    // Step 1: Try CREATE (POST /auth/api-key)
    console.log('   Step 1: Trying POST /auth/api-key (create new key)...');
    try {
      const createResponse = await axios.post(`${CLOB_API_URL}/auth/api-key`, null, axiosConfig);
      credentials = createResponse.data;
      method = 'created';
      console.log('   ✅ Create succeeded!');
    } catch (createError: any) {
      const createErrorMsg = createError.response?.data?.error || createError.message;
      console.log('   ❌ Create failed:', createErrorMsg);

      // Step 2: Fall back to DERIVE (GET /auth/derive-api-key)
      console.log('   Step 2: Trying GET /auth/derive-api-key (derive existing key)...');
      try {
        const deriveResponse = await axios.get(`${CLOB_API_URL}/auth/derive-api-key`, axiosConfig);
        credentials = deriveResponse.data;
        method = 'derived';
        console.log('   ✅ Derive succeeded!');
      } catch (deriveError: any) {
        const deriveErrorMsg = deriveError.response?.data?.error || deriveError.message;
        console.error('   ❌ Derive also failed:', deriveErrorMsg);
        console.error('   Derive status:', deriveError.response?.status);

        // Both methods failed
        return NextResponse.json(
          {
            error: `Could not create or derive API credentials. Create error: ${createErrorMsg}. Derive error: ${deriveErrorMsg}`,
            manualSetupRequired: true,
            hint: 'This may be due to Cloudflare protection. Try creating API keys manually at https://polymarket.com/profile',
          },
          { status: 400 }
        );
      }
    }

    console.log(`✅ API credentials ${method} successfully`);

    // Encrypt and save credentials to database
    const encrypted = encryptCredentials({
      apiKey: credentials.apiKey,
      apiSecret: credentials.secret,
      apiPassphrase: credentials.passphrase,
    });

    await prisma.user.upsert({
      where: { walletAddress },
      create: {
        walletAddress,
        apiKey: encrypted.apiKey,
        apiSecret: encrypted.apiSecret,
        apiPassphrase: encrypted.apiPassphrase,
        funderAddress: knownFunderAddress || null,
        apiCreatedAt: new Date(),
      },
      update: {
        apiKey: encrypted.apiKey,
        apiSecret: encrypted.apiSecret,
        apiPassphrase: encrypted.apiPassphrase,
        funderAddress: knownFunderAddress || undefined,
        apiCreatedAt: new Date(),
      },
    });

    console.log(`✅ API credentials saved (${method})`);

    return NextResponse.json({
      success: true,
      message: `API credentials automatically ${method}`,
      autoDerived: method === 'derived',
    });

  } catch (error) {
    console.error('❌ Auto-setup failed:', error);

    return NextResponse.json(
      {
        error: 'Auto-setup failed. You can still configure API credentials manually in Settings.',
        manualSetupAvailable: true,
      },
      { status: 500 }
    );
  }
});
