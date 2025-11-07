// app/api/user/credentials/route.ts
// Save and manage Polymarket API credentials for authenticated access

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const CredentialsSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
  apiPassphrase: z.string().min(1),
});

/**
 * POST /api/user/credentials
 * Save Polymarket API credentials for a user
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, apiKey, apiSecret, apiPassphrase } = CredentialsSchema.parse(body);

    console.log(`💾 Saving API credentials for wallet ${walletAddress}`);

    // Create or update user with API credentials
    const user = await prisma.user.upsert({
      where: { walletAddress },
      create: {
        walletAddress,
        apiKey,
        apiSecret,
        apiPassphrase,
        apiCreatedAt: new Date(),
      },
      update: {
        apiKey,
        apiSecret,
        apiPassphrase,
        apiCreatedAt: new Date(),
      },
    });

    console.log(`✅ API credentials saved for ${walletAddress}`);

    return NextResponse.json({
      success: true,
      message: 'API credentials saved successfully',
      hasCredentials: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error saving credentials:', error);
    return NextResponse.json(
      { error: 'Failed to save credentials' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/credentials?walletAddress=0x...
 * Check if user has API credentials saved
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress parameter is required' },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: {
        apiKey: true,
        apiCreatedAt: true,
      },
    });

    const hasCredentials = !!(user && user.apiKey);

    return NextResponse.json({
      hasCredentials,
      createdAt: user?.apiCreatedAt || null,
    });
  } catch (error) {
    console.error('Error checking credentials:', error);
    return NextResponse.json(
      { error: 'Failed to check credentials' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/credentials?walletAddress=0x...
 * Delete user's API credentials
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

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
  } catch (error) {
    console.error('Error deleting credentials:', error);
    return NextResponse.json(
      { error: 'Failed to delete credentials' },
      { status: 500 }
    );
  }
}
