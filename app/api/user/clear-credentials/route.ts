/**
 * API Route: Clear Credentials
 *
 * ⚠️ DISABLED: This feature has been disabled for security reasons.
 *
 * We no longer store API credentials, so there's nothing to clear.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Credential storage is disabled',
      reason: 'For security, we no longer store API credentials server-side.',
      message: 'No credentials to clear.',
    },
    { status: 503 }
  );
}
