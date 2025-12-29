import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createL1AuthHeaders } from '@/lib/polymarket/eip712-auth';
import { encryptCredentials } from '@/lib/crypto/encryption';

const CLOB_API_URL = process.env.CLOB_API_URL || 'https://clob.polymarket.com';

/**
 * Schema for generating credentials request
 */
const GenerateCredentialsSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  signature: z.string().startsWith('0x', 'Invalid signature format'),
  timestamp: z.string(),
  nonce: z.number().int().min(0).default(0),
});

/**
 * Response from Polymarket's /auth/api-key endpoint
 */
interface CreateApiKeyResponse {
  apiKey: string;
  secret: string;
  passphrase: string;
}

/**
 * POST /api/user/generate-credentials
 *
 * Generates API credentials using L1 authentication (EIP-712 signature)
 * This eliminates the need for users to manually create and enter credentials
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = GenerateCredentialsSchema.parse(body);
    const { address, signature, timestamp, nonce } = validatedData;

    console.log(`🔐 Generating API credentials for wallet ${address}`);
    console.log(`   Timestamp: ${timestamp}, Nonce: ${nonce}`);

    // Create L1 authentication headers
    const headers = createL1AuthHeaders(address, signature, timestamp, nonce);

    let credentials: CreateApiKeyResponse | null = null;

    // Try to create API credentials first (following createOrDerive pattern)
    try {
      console.log('Attempting to create new API credentials...');
      const createResponse = await fetch(`${CLOB_API_URL}/auth/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      if (createResponse.ok) {
        credentials = await createResponse.json();
        console.log('✅ Successfully created new API credentials');
      } else {
        const errorText = await createResponse.text();
        console.log(`⚠️  Create failed (${createResponse.status}): ${errorText}`);
        console.log('Attempting to derive existing credentials...');

        // Fall back to derive if create fails (might already exist)
        const deriveResponse = await fetch(`${CLOB_API_URL}/auth/derive-api-key`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        });

        if (!deriveResponse.ok) {
          const deriveErrorText = await deriveResponse.text();
          console.error('Both create and derive failed. Derive error:', deriveResponse.status, deriveErrorText);

          return NextResponse.json(
            {
              error: 'Failed to generate or derive credentials from Polymarket',
              createError: errorText,
              deriveError: deriveErrorText,
            },
            { status: deriveResponse.status }
          );
        }

        credentials = await deriveResponse.json();
        console.log('✅ Successfully derived existing API credentials');
      }
    } catch (error) {
      console.error('Network error during credential generation:', error);
      return NextResponse.json(
        { error: 'Network error while communicating with Polymarket', details: String(error) },
        { status: 500 }
      );
    }

    // Ensure we got valid credentials
    if (!credentials) {
      return NextResponse.json(
        { error: 'Failed to obtain credentials from Polymarket' },
        { status: 500 }
      );
    }

    // Validate response
    if (!credentials.apiKey || !credentials.secret || !credentials.passphrase) {
      console.error('Invalid credentials response:', credentials);
      return NextResponse.json(
        { error: 'Invalid credentials returned from Polymarket' },
        { status: 500 }
      );
    }

    // Store credentials in database (create or update user)
    // Lowercase wallet address for consistency with auth middleware
    const normalizedAddress = address.toLowerCase();

    // Encrypt credentials before storing
    const encrypted = encryptCredentials({
      apiKey: credentials.apiKey,
      apiSecret: credentials.secret,
      apiPassphrase: credentials.passphrase,
    });

    await prisma.user.upsert({
      where: { walletAddress: normalizedAddress },
      create: {
        walletAddress: normalizedAddress,
        apiKey: encrypted.apiKey,
        apiSecret: encrypted.apiSecret,
        apiPassphrase: encrypted.apiPassphrase,
        apiCreatedAt: new Date(),
      },
      update: {
        apiKey: encrypted.apiKey,
        apiSecret: encrypted.apiSecret,
        apiPassphrase: encrypted.apiPassphrase,
        apiCreatedAt: new Date(),
      },
    });

    console.log(`✅ API credentials generated and saved for ${address}`);

    return NextResponse.json({
      success: true,
      message: 'API credentials generated and saved successfully',
      apiKey: credentials.apiKey,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error generating credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
