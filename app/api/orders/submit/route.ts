/**
 * API Route: Submit Order
 * POST /api/orders/submit
 *
 * ⚠️ DISABLED: This feature has been disabled for security reasons.
 *
 * Previously, this route submitted orders using server-stored credentials.
 * This approach requires storing sensitive user data which poses security risks.
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
