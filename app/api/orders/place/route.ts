/**
 * API Route: Place Order
 * POST /api/orders/place
 *
 * Places an order on Polymarket with builder attribution.
 * Requires L2 API credentials and optionally builder credentials.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { placeOrder, OrderRequest } from '@/lib/polymarket/builder-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, tokenId, price, size, side, orderType, expiration } = body;

    // Validate required fields
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      );
    }

    if (typeof price !== 'number' || price < 0 || price > 1) {
      return NextResponse.json(
        { error: 'Price must be a number between 0 and 1' },
        { status: 400 }
      );
    }

    if (typeof size !== 'number' || size <= 0) {
      return NextResponse.json(
        { error: 'Size must be a positive number' },
        { status: 400 }
      );
    }

    if (!side || !['BUY', 'SELL'].includes(side.toUpperCase())) {
      return NextResponse.json(
        { error: 'Side must be BUY or SELL' },
        { status: 400 }
      );
    }

    if (orderType && !['GTC', 'GTD', 'FOK'].includes(orderType.toUpperCase())) {
      return NextResponse.json(
        { error: 'Order type must be GTC, GTD, or FOK' },
        { status: 400 }
      );
    }

    // Build order request
    const orderRequest: OrderRequest = {
      tokenId,
      price,
      size,
      side: side.toUpperCase() as 'BUY' | 'SELL',
      orderType: (orderType?.toUpperCase() || 'GTC') as 'GTC' | 'GTD' | 'FOK',
      ...(expiration && { expiration }),
    };

    // Place the order
    const result = await placeOrder(walletAddress.toLowerCase(), orderRequest);

    return NextResponse.json({
      success: true,
      order: result,
    });
  } catch (error: any) {
    console.error('Error placing order:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to place order' },
      { status: 500 }
    );
  }
}
