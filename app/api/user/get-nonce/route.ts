// app/api/user/get-nonce/route.ts
// Proxy endpoint to get nonce from Polymarket CLOB (avoid CORS)
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';

/**
 * GET /api/user/get-nonce
 * Get authentication nonce from Polymarket CLOB
 * Proxies the request to avoid CORS issues
 */
export const GET = requireAuth(async (request: NextRequest, auth) => {
  const walletAddress = auth.walletAddress;

  console.log('📝 Getting nonce for wallet:', walletAddress);

  try {
    const CLOB_API_URL = 'https://clob.polymarket.com';
    const nonceResponse = await fetch(`${CLOB_API_URL}/auth/nonce?address=${walletAddress}`);

    if (!nonceResponse.ok) {
      const errorText = await nonceResponse.text();
      console.error('Failed to get nonce:', nonceResponse.status, errorText);
      return NextResponse.json(
        { error: 'Failed to get nonce from Polymarket' },
        { status: nonceResponse.status }
      );
    }

    const { nonce } = await nonceResponse.json();
    console.log('✅ Got nonce:', nonce);

    return NextResponse.json({ nonce });
  } catch (error) {
    console.error('Error getting nonce:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nonce' },
      { status: 500 }
    );
  }
});
