/**
 * API Route: Place Order
 * POST /api/orders/place
 *
 * ⚠️ DISABLED: This feature has been disabled for security reasons.
 *
 * Previously, this route placed orders using server-stored user credentials.
 * Storing private keys and API secrets server-side poses significant security risks.
 *
 * TODO: Implement client-side signing where users sign orders in their
 * browser using their wallet (MetaMask, WalletConnect, etc.)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Order placement is temporarily disabled',
      reason: 'This feature is being redesigned for improved security. Orders will use client-side signing in a future update.',
      suggestion: 'Please place orders directly on polymarket.com for now.'
    },
    { status: 503 }
  );
}
