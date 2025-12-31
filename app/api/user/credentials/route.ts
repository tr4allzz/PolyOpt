/**
 * API Route: User Credentials
 *
 * ⚠️ SIMPLIFIED: No longer stores API credentials or private keys.
 * Only handles public data like funderAddress (proxy wallet).
 *
 * This change was made for security reasons - we no longer store
 * any sensitive user data server-side.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/credentials?wallet=0x...
 * Get public user data (funderAddress only)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const walletParam = searchParams.get('wallet');

  if (!walletParam) {
    return NextResponse.json(
      { error: 'wallet parameter is required' },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { walletAddress: walletParam.toLowerCase() },
    select: {
      funderAddress: true,
    },
  });

  return NextResponse.json({
    // These are always false now - we don't store credentials
    hasCredentials: false,
    hasStoredKey: false,
    funderAddress: user?.funderAddress || null,
  });
}

/**
 * POST /api/user/credentials
 * ⚠️ DISABLED - We no longer store API credentials
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Credential storage is disabled',
      reason: 'For security, we no longer store API credentials server-side.',
      suggestion: 'Use Polymarket directly for trading.',
    },
    { status: 503 }
  );
}

/**
 * DELETE /api/user/credentials
 * ⚠️ DISABLED - No credentials to delete
 */
export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Credential storage is disabled',
      reason: 'For security, we no longer store API credentials server-side.',
    },
    { status: 503 }
  );
}
