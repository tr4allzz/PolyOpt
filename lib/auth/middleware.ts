/**
 * Authentication Middleware for API Routes
 *
 * Verifies that the requesting wallet owns the data they're accessing
 * Uses wallet signature verification
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyMessage } from 'viem'

export interface AuthContext {
  walletAddress: string
  timestamp: number
}

/**
 * Generate authentication message for client to sign
 * Must match exactly what the client signs
 */
export function generateAuthMessage(walletAddress: string, timestamp: number): string {
  return `opt.markets Authentication

Wallet: ${walletAddress}
Timestamp: ${timestamp}

This signature proves you own this wallet and authorizes access to your data.`
}

/**
 * Verify wallet signature for authentication
 *
 * Expected headers:
 * - X-Wallet-Address: 0x...
 * - X-Signature: 0x...
 * - X-Timestamp: unix timestamp (milliseconds)
 */
export async function verifyWalletAuth(
  request: NextRequest
): Promise<AuthContext | null> {
  try {
    const walletAddress = request.headers.get('X-Wallet-Address')
    const signature = request.headers.get('X-Signature')
    const timestamp = request.headers.get('X-Timestamp')

    if (!walletAddress || !signature || !timestamp) {
      console.log('Missing auth headers:', {
        hasWallet: !!walletAddress,
        hasSig: !!signature,
        hasTime: !!timestamp
      })
      return null
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      console.error('Invalid wallet address format')
      return null
    }

    // Check timestamp (must be within 5 minutes)
    const now = Date.now()
    const requestTime = parseInt(timestamp)
    const fiveMinutes = 5 * 60 * 1000

    if (isNaN(requestTime)) {
      console.error('Invalid timestamp format')
      return null
    }

    if (Math.abs(now - requestTime) > fiveMinutes) {
      console.error('Request timestamp expired:', {
        now,
        requestTime,
        diff: Math.abs(now - requestTime) / 1000 / 60,
        maxMinutes: 5
      })
      return null
    }

    // Generate the message that should have been signed
    const message = generateAuthMessage(walletAddress, requestTime)

    // Verify signature
    const isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    })

    if (!isValid) {
      console.error('Invalid signature for wallet:', walletAddress)
      return null
    }

    return {
      walletAddress: walletAddress.toLowerCase(),
      timestamp: requestTime,
    }
  } catch (error) {
    console.error('Auth verification error:', error)
    return null
  }
}

/**
 * Middleware wrapper for authenticated routes
 * Verifies signature and ensures user can only access their own data
 */
export function requireAuth(
  handler: (request: NextRequest, auth: AuthContext) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const auth = await verifyWalletAuth(request)

    if (!auth) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Please sign in with your wallet to access this endpoint.',
          code: 'AUTH_REQUIRED'
        },
        { status: 401 }
      )
    }

    // Verify the wallet in the request matches the authenticated wallet
    const { searchParams } = new URL(request.url)
    const requestedWallet = searchParams.get('walletAddress')

    if (requestedWallet && requestedWallet.toLowerCase() !== auth.walletAddress.toLowerCase()) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'You can only access your own data.',
          code: 'FORBIDDEN'
        },
        { status: 403 }
      )
    }

    // Also check POST body for walletAddress
    if (request.method === 'POST') {
      try {
        const body = await request.json()
        if (body.walletAddress && body.walletAddress.toLowerCase() !== auth.walletAddress.toLowerCase()) {
          return NextResponse.json(
            {
              error: 'Forbidden',
              message: 'You can only access your own data.',
              code: 'FORBIDDEN'
            },
            { status: 403 }
          )
        }
        // Re-create request with body for handler
        const newRequest = new NextRequest(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(body),
        })
        return handler(newRequest, auth)
      } catch (e) {
        // If no JSON body, proceed normally
      }
    }

    return handler(request, auth)
  }
}

/**
 * Optional auth - allows both authenticated and unauthenticated access
 * But if authenticated, validates the signature
 */
export function optionalAuth(
  handler: (request: NextRequest, auth: AuthContext | null) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const auth = await verifyWalletAuth(request)
    return handler(request, auth)
  }
}
