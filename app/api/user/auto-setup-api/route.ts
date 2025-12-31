/**
 * API Route: Auto Setup API
 *
 * ⚠️ DISABLED: This feature has been disabled for security reasons.
 *
 * Previously, this route automatically derived and stored API credentials
 * from wallet signatures. This approach required storing sensitive user
 * data server-side which poses security risks.
 *
 * Users should manage their credentials directly on Polymarket.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Auto-setup is disabled',
      reason: 'For security, we no longer store API credentials server-side.',
      suggestion: 'Please use Polymarket directly for trading operations.',
    },
    { status: 503 }
  );
}
