/**
 * API Route: Create and Submit Order using Official ClobClient
 * POST /api/orders/create
 *
 * Uses the official @polymarket/clob-client to create and sign orders
 * This ensures signature compatibility with Polymarket's API
 */

import { NextRequest, NextResponse } from 'next/server';
import { ClobClient, Side } from '@polymarket/clob-client';
import { Wallet } from 'ethers';
import { prisma } from '@/lib/prisma';
import { decryptCredentials, decrypt } from '@/lib/crypto/encryption';

const CLOB_URL = process.env.CLOB_API_URL || 'https://clob.polymarket.com';
const CHAIN_ID = 137; // Polygon

interface OrderRequest {
  tokenId: string;
  price: number;
  size: number;
  side: 'BUY' | 'SELL';
  walletAddress: string;
  privateKey?: string; // Optional - will use stored key if not provided
}

export async function POST(request: NextRequest) {
  try {
    const body: OrderRequest = await request.json();
    const { tokenId, price, size, side, walletAddress, privateKey: providedKey } = body;

    // Validate required fields
    if (!tokenId || !price || !size || !side || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenId, price, size, side, walletAddress' },
        { status: 400 }
      );
    }

    // Get user credentials from database
    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      select: {
        apiKey: true,
        apiSecret: true,
        apiPassphrase: true,
        funderAddress: true,
        encryptedPrivateKey: true,
      },
    });

    if (!user?.apiKey) {
      return NextResponse.json(
        { error: 'No API credentials found. Please set up your account first.' },
        { status: 401 }
      );
    }

    // Get private key: use provided key or decrypt stored key
    let privateKey = providedKey;
    if (!privateKey && user.encryptedPrivateKey) {
      privateKey = decrypt(user.encryptedPrivateKey);
    }

    if (!privateKey) {
      return NextResponse.json(
        { error: 'No private key available. Please run setup script again or provide private key.' },
        { status: 401 }
      );
    }

    // Decrypt credentials
    const creds = decryptCredentials({
      apiKey: user.apiKey,
      apiSecret: user.apiSecret!,
      apiPassphrase: user.apiPassphrase!,
    });

    const proxyAddress = user.funderAddress;
    const useProxy = !!proxyAddress && proxyAddress.toLowerCase() !== walletAddress.toLowerCase();

    console.log('📦 Creating order with official ClobClient');
    console.log('   Wallet:', walletAddress);
    console.log('   Proxy:', proxyAddress || 'none');
    console.log('   Use Proxy:', useProxy);
    console.log('   Using stored key:', !providedKey && !!user.encryptedPrivateKey);

    // Create wallet from private key
    const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const wallet = new Wallet(formattedKey);

    // Initialize ClobClient with proper configuration
    // signatureType: 0=EOA, 1=Magic/Email, 2=Browser Wallet (Metamask)
    const client = new ClobClient(
      CLOB_URL,
      CHAIN_ID,
      wallet,
      {
        key: creds.apiKey,
        secret: creds.apiSecret,
        passphrase: creds.apiPassphrase,
      },
      useProxy ? 2 : 0, // signatureType: 2 = Browser Wallet (Metamask), 0 = EOA
      useProxy ? proxyAddress! : walletAddress
    );

    // Round price to tick size (0.01)
    const roundedPrice = Math.round(price * 100) / 100;

    console.log('   Token ID:', tokenId.substring(0, 20) + '...');
    console.log('   Price:', roundedPrice);
    console.log('   Size:', size);
    console.log('   Side:', side);

    // Create the order using official client
    const order = await client.createOrder({
      tokenID: tokenId,
      price: roundedPrice,
      size: size,
      side: side === 'BUY' ? Side.BUY : Side.SELL,
      feeRateBps: 0,
    });

    console.log('✅ Order created:', JSON.stringify(order, null, 2));

    // Post the order
    const result = await client.postOrder(order);

    console.log('✅ Order posted:', JSON.stringify(result, null, 2));

    return NextResponse.json({
      success: true,
      order: result,
    });

  } catch (error: any) {
    console.error('❌ Error creating order:', error.message);
    if (error.response?.data) {
      console.error('   API Response:', JSON.stringify(error.response.data, null, 2));
      return NextResponse.json(
        { error: error.response.data.error || error.message, details: error.response.data },
        { status: error.response.status || 500 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
