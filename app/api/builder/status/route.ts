/**
 * API Route: Builder Status
 * GET /api/builder/status
 *
 * Check if builder credentials are configured (from environment variables)
 * and return the integration status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isBuilderConfigured, getBuilderStatus } from '@/lib/polymarket/builder-client';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    // Get builder configuration status from environment
    const builderConfigured = isBuilderConfigured();
    const builderStatus = getBuilderStatus();

    // Check user's L2 credentials if wallet address provided
    let hasL2Credentials = false;
    if (walletAddress && /^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      const user = await prisma.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
        select: { apiKey: true },
      });
      hasL2Credentials = !!user?.apiKey;
    }

    return NextResponse.json({
      // App-level builder configuration (from environment)
      builder: {
        configured: builderConfigured,
        apiKeyPrefix: builderStatus.apiKeyPrefix,
      },
      // Capabilities
      capabilities: {
        orderAttribution: builderConfigured,
        leaderboardTracking: builderConfigured,
      },
      // User-specific status
      user: walletAddress ? {
        walletAddress: walletAddress.toLowerCase(),
        hasL2Credentials,
        canPlaceOrders: hasL2Credentials,
        ordersWillBeAttributed: hasL2Credentials && builderConfigured,
      } : null,
      // Recommendations
      recommendations: getRecommendations(builderConfigured, hasL2Credentials),
    });
  } catch (error: any) {
    console.error('Error checking builder status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check builder status' },
      { status: 500 }
    );
  }
}

function getRecommendations(builderConfigured: boolean, hasL2Credentials: boolean): string[] {
  const recommendations: string[] = [];

  if (!builderConfigured) {
    recommendations.push('Configure BUILDER_API_KEY, BUILDER_API_SECRET, and BUILDER_API_PASSPHRASE in your .env file');
  }

  if (!hasL2Credentials) {
    recommendations.push('User needs to connect their Polymarket API credentials to place orders');
  }

  if (builderConfigured && hasL2Credentials) {
    recommendations.push('All set! Orders will be attributed to your builder account');
  }

  return recommendations;
}
