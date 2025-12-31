/**
 * API Route: Cancel Order
 * DELETE /api/orders/cancel
 *
 * ⚠️ DISABLED: This feature has been disabled for security reasons.
 *
 * Order management features are temporarily disabled while we redesign
 * the system to use client-side signing for improved security.
 *
 * TODO: Implement client-side signing for order cancellation.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Order cancellation is temporarily disabled',
      reason: 'This feature is being redesigned for improved security.',
      suggestion: 'Please manage orders directly on polymarket.com for now.'
    },
    { status: 503 }
  );
}
