/**
 * API Route: Builder Status
 * GET /api/builder/status
 *
 * Check if builder credentials are configured (from environment variables)
 * and return the integration status.
 *
 * NOTE: Order placement is currently disabled. This route is kept for
 * informational purposes only.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { isBuilderConfigured, getBuilderStatus } from '@/lib/polymarket/builder-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    // Get builder configuration status from environment
    const builderConfigured = isBuilderConfigured();
    const builderStatus = getBuilderStatus();

    return NextResponse.json({
      // App-level builder configuration (from environment)
      builder: {
        configured: builderConfigured,
        apiKeyPrefix: builderStatus.apiKeyPrefix,
      },
      // Capabilities - order placement is disabled
      capabilities: {
        orderAttribution: false,
        leaderboardTracking: builderConfigured,
        orderPlacement: false, // Disabled for security
      },
      // User-specific status
      user: walletAddress ? {
        walletAddress: walletAddress.toLowerCase(),
        hasL2Credentials: false, // We no longer store credentials
        canPlaceOrders: false, // Order placement disabled
      } : null,
      // Info message
      message: 'Direct order placement is temporarily disabled. Please use Polymarket directly.',
    });
  } catch (error: any) {
    console.error('Error checking builder status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check builder status' },
      { status: 500 }
    );
  }
}
