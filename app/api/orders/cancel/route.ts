/**
 * API Route: Cancel Order(s)
 * DELETE /api/orders/cancel
 *
 * Cancel a single order or all orders for a user.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cancelOrder, cancelAllOrders } from '@/lib/polymarket/builder-client';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const orderId = searchParams.get('orderId');
    const marketId = searchParams.get('marketId');
    const cancelAll = searchParams.get('all') === 'true';

    // Validate wallet address
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Cancel all orders or single order
    if (cancelAll) {
      const result = await cancelAllOrders(
        walletAddress.toLowerCase(),
        marketId || undefined
      );

      return NextResponse.json({
        success: true,
        message: `Cancelled ${result.cancelled} orders`,
        cancelled: result.cancelled,
      });
    } else {
      if (!orderId) {
        return NextResponse.json(
          { error: 'Order ID is required (or use all=true to cancel all orders)' },
          { status: 400 }
        );
      }

      const result = await cancelOrder(walletAddress.toLowerCase(), orderId);

      return NextResponse.json({
        success: true,
        message: result.message,
      });
    }
  } catch (error: any) {
    console.error('Error cancelling order:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to cancel order' },
      { status: 500 }
    );
  }
}
