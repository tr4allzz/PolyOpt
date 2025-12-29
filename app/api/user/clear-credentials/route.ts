// app/api/user/clear-credentials/route.ts
// Clear invalid API credentials so user can re-setup

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/user/clear-credentials
 * Clear API credentials for the authenticated user
 */
export const DELETE = requireAuth(async (request: NextRequest, auth) => {
  const walletAddress = auth.walletAddress;

  console.log('🗑️ Clearing API credentials for:', walletAddress);

  try {
    await prisma.user.update({
      where: { walletAddress },
      data: {
        apiKey: null,
        apiSecret: null,
        apiPassphrase: null,
        apiCreatedAt: null,
      },
    });

    console.log('✅ API credentials cleared');

    return NextResponse.json({
      success: true,
      message: 'API credentials cleared. You can now run auto-setup again.',
    });
  } catch (error) {
    console.error('❌ Error clearing credentials:', error);
    return NextResponse.json(
      { error: 'Failed to clear credentials' },
      { status: 500 }
    );
  }
});
