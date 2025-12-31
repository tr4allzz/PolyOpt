/**
 * API Route: Create Order
 * POST /api/orders/create
 *
 * ⚠️ DISABLED: This feature has been disabled for security reasons.
 *
 * Previously, this route stored and used user private keys server-side
 * for order signing. This approach has significant security risks:
 * - Server compromise would expose all user private keys
 * - Requires users to trust the app with full custody of their funds
 * - Single point of failure for encryption key management
 *
 * TODO: Implement client-side signing where users sign orders in their
 * browser using their wallet (MetaMask, WalletConnect, etc.) without
 * ever sending private keys to the server.
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
