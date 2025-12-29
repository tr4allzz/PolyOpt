/**
 * API Route: Get negRisk status for a token
 * GET /api/markets/neg-risk?tokenId=...
 */

import { NextRequest, NextResponse } from 'next/server';

const CLOB_API_URL = 'https://clob.polymarket.com';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get('tokenId');

  if (!tokenId) {
    return NextResponse.json(
      { error: 'tokenId is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${CLOB_API_URL}/neg-risk?token_id=${tokenId}`);

    if (!response.ok) {
      console.warn(`⚠️ Could not fetch negRisk for ${tokenId.substring(0, 20)}...`);
      return NextResponse.json({ negRisk: false });
    }

    const data = await response.json();
    return NextResponse.json({ negRisk: data.neg_risk === true });
  } catch (error: any) {
    console.error('Error fetching negRisk:', error.message);
    return NextResponse.json({ negRisk: false });
  }
}
