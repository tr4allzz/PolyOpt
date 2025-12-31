/**
 * API Route: Generate Credentials
 *
 * ⚠️ DISABLED: This feature has been disabled for security reasons.
 *
 * Previously, this route generated and stored Polymarket API credentials
 * server-side. This approach required storing sensitive user data which
 * poses security risks.
 *
 * Users should manage their credentials directly on Polymarket.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Credential generation is disabled',
      reason: 'For security, we no longer store API credentials server-side.',
      suggestion: 'Please use Polymarket directly for trading operations.',
    },
    { status: 503 }
  );
}
