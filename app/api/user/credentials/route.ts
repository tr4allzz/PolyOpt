// app/api/user/credentials/route.ts
// Save and manage Polymarket API credentials for authenticated access

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { encryptCredentials } from '@/lib/crypto/encryption';
import { withErrorHandler, ValidationError } from '@/lib/errors/handler';
import { requireAuth } from '@/lib/auth/middleware';

const CredentialsSchema = z.object({
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
  apiPassphrase: z.string().min(1),
  funderAddress: z.string().optional(), // Optional proxy wallet address
});

/**
 * POST /api/user/credentials
 * Save Polymarket API credentials for a user
 * Credentials are encrypted before storage
 * Requires authentication - wallet signature verification
 */
export const POST = requireAuth(async (request: NextRequest, auth) => {
  const body = await request.json();
  const { apiKey, apiSecret, apiPassphrase, funderAddress } = CredentialsSchema.parse(body);

  const walletAddress = auth.walletAddress;

  console.log(`💾 Saving API credentials for wallet ${walletAddress}`);
  if (funderAddress) {
    console.log(`   Funder/proxy wallet: ${funderAddress}`);
  }

  // Encrypt credentials before saving
  const encrypted = encryptCredentials({
    apiKey,
    apiSecret,
    apiPassphrase,
  });

  // Create or update user with encrypted API credentials
  const user = await prisma.user.upsert({
    where: { walletAddress },
    create: {
      walletAddress,
      apiKey: encrypted.apiKey,
      apiSecret: encrypted.apiSecret,
      apiPassphrase: encrypted.apiPassphrase,
      funderAddress: funderAddress || null,
      apiCreatedAt: new Date(),
    },
    update: {
      apiKey: encrypted.apiKey,
      apiSecret: encrypted.apiSecret,
      apiPassphrase: encrypted.apiPassphrase,
      funderAddress: funderAddress || null,
      apiCreatedAt: new Date(),
    },
  });

  console.log(`✅ API credentials saved (encrypted) for ${walletAddress}`);

  return NextResponse.json({
    success: true,
    message: 'API credentials saved successfully',
    hasCredentials: true,
  });
});

/**
 * GET /api/user/credentials
 * Check if user has API credentials saved
 * Supports both authenticated requests and simple wallet query param
 */
export async function GET(request: NextRequest) {
  // Support simple wallet query param for fetching funder address
  const { searchParams } = new URL(request.url);
  const walletParam = searchParams.get('wallet');

  if (walletParam) {
    const user = await prisma.user.findUnique({
      where: { walletAddress: walletParam.toLowerCase() },
      select: {
        apiKey: true,
        funderAddress: true,
        apiCreatedAt: true,
        encryptedPrivateKey: true,
      },
    });

    return NextResponse.json({
      hasCredentials: !!(user && user.apiKey),
      hasStoredKey: !!(user && user.encryptedPrivateKey),
      funderAddress: user?.funderAddress || null,
      createdAt: user?.apiCreatedAt || null,
    });
  }

  // Fall back to authenticated request
  return requireAuth(async (req: NextRequest, auth) => {
    const walletAddress = auth.walletAddress;

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: {
        apiKey: true,
        funderAddress: true,
        apiCreatedAt: true,
      },
    });

    const hasCredentials = !!(user && user.apiKey);

    return NextResponse.json({
      hasCredentials,
      funderAddress: user?.funderAddress || null,
      createdAt: user?.apiCreatedAt || null,
    });
  })(request);
}

/**
 * DELETE /api/user/credentials
 * Delete user's API credentials
 * Requires authentication - wallet signature verification
 */
export const DELETE = requireAuth(async (request: NextRequest, auth) => {
  const walletAddress = auth.walletAddress;

  await prisma.user.update({
    where: { walletAddress },
    data: {
      apiKey: null,
      apiSecret: null,
      apiPassphrase: null,
      apiCreatedAt: null,
    },
  });

  console.log(`🗑️ API credentials deleted for ${walletAddress}`);

  return NextResponse.json({
    success: true,
    message: 'API credentials deleted successfully',
  });
});
