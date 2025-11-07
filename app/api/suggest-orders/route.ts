// app/api/suggest-orders/route.ts
// API endpoint to get optimal order placement suggestions

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateOrderPlacementSuggestions } from '@/lib/rewards/market-analyzer';

const SuggestOrdersSchema = z.object({
  marketId: z.string(),
  capital: z.number().positive().min(10).max(1000000),
});

/**
 * POST /api/suggest-orders
 * Get optimal order placement suggestions for a market
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { marketId, capital } = SuggestOrdersSchema.parse(body);

    const strategy = await generateOrderPlacementSuggestions(marketId, capital);

    if (!strategy) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      strategy,
      marketId,
      capital,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error generating order suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
