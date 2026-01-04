'use client'

import { useAccount, useWalletClient } from 'wagmi'
import { useCallback, useState, useEffect } from 'react'

export interface AuthHeaders {
  'x-wallet-address': string
  'x-signature': string
  'x-timestamp': string
}

interface CachedAuth {
  signature: string
  timestamp: number
  walletAddress: string
  expiresAt: number
}

const AUTH_CACHE_KEY = 'polyopt_auth_cache'
const AUTH_CACHE_DURATION = 4 * 60 * 1000 // 4 minutes (server allows 5 min max)

/**
 * Hook for wallet-based authentication
 * Provides utilities to sign messages and create authenticated requests
 */
export function useAuth() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  // Clear cache when wallet disconnects or address changes
  useEffect(() => {
    if (!isConnected || !address) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(AUTH_CACHE_KEY)
      }
    }
  }, [isConnected, address])

  /**
   * Get cached authentication if valid
   */
  const getCachedAuth = useCallback((): CachedAuth | null => {
    if (typeof window === 'undefined') return null

    try {
      const cached = localStorage.getItem(AUTH_CACHE_KEY)
      if (!cached) return null

      const auth: CachedAuth = JSON.parse(cached)

      // Check if cache is valid for this address
      if (auth.walletAddress.toLowerCase() !== address?.toLowerCase()) {
        localStorage.removeItem(AUTH_CACHE_KEY)
        return null
      }

      // Check if cache is expired
      if (Date.now() > auth.expiresAt) {
        localStorage.removeItem(AUTH_CACHE_KEY)
        return null
      }

      return auth
    } catch (error) {
      console.error('Error reading auth cache:', error)
      return null
    }
  }, [address])

  /**
   * Cache authentication
   */
  const cacheAuth = useCallback((auth: { signature: string; timestamp: number; walletAddress: string }) => {
    if (typeof window === 'undefined') return

    try {
      const cached: CachedAuth = {
        ...auth,
        expiresAt: Date.now() + AUTH_CACHE_DURATION,
      }
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cached))
    } catch (error) {
      console.error('Error caching auth:', error)
    }
  }, [])

  /**
   * Generate authentication message for signing
   */
  const generateAuthMessage = useCallback((walletAddress: string, timestamp: number): string => {
    return `opt.markets Authentication

Wallet: ${walletAddress}
Timestamp: ${timestamp}

This signature proves you own this wallet and authorizes access to your data.`
  }, [])

  /**
   * Sign an authentication message
   * Returns the signature and timestamp for use in API requests
   */
  const signAuth = useCallback(async (): Promise<{
    signature: string
    timestamp: number
    walletAddress: string
  } | null> => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected')
    }

    if (!walletClient) {
      throw new Error('Wallet client not ready')
    }

    setIsAuthenticating(true)
    try {
      const timestamp = Date.now()
      const message = generateAuthMessage(address, timestamp)

      // Use wallet client directly to avoid Wagmi's buggy connector middleware
      const signature = await walletClient.signMessage({
        account: address,
        message,
      })

      return {
        signature,
        timestamp,
        walletAddress: address,
      }
    } catch (error) {
      console.error('Error signing auth message:', error)
      throw error
    } finally {
      setIsAuthenticating(false)
    }
  }, [address, isConnected, walletClient, generateAuthMessage])

  /**
   * Create authentication headers for API requests
   * Uses cached signature if available and valid
   */
  const getAuthHeaders = useCallback(async (): Promise<AuthHeaders> => {
    // Try to use cached auth first
    const cached = getCachedAuth()
    if (cached) {
      console.log('✅ Using cached authentication (expires in', Math.round((cached.expiresAt - Date.now()) / 1000 / 60), 'minutes)')
      return {
        'x-wallet-address': cached.walletAddress,
        'x-signature': cached.signature,
        'x-timestamp': cached.timestamp.toString(),
      }
    }

    // No valid cache, need to sign new message
    console.log('🔏 No cached auth, requesting signature...')
    const auth = await signAuth()
    if (!auth) {
      throw new Error('Failed to sign authentication message')
    }

    // Cache the new signature
    cacheAuth(auth)
    console.log('✅ Signature cached for 4 minutes')

    return {
      'x-wallet-address': auth.walletAddress,
      'x-signature': auth.signature,
      'x-timestamp': auth.timestamp.toString(),
    }
  }, [signAuth, getCachedAuth, cacheAuth])

  /**
   * Make an authenticated fetch request
   * Automatically adds authentication headers
   */
  const authenticatedFetch = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const authHeaders = await getAuthHeaders()

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...authHeaders,
        'Content-Type': 'application/json',
      },
    })
  }, [getAuthHeaders])

  return {
    address,
    isConnected,
    isAuthenticating,
    walletClientReady: !!walletClient,
    signAuth,
    getAuthHeaders,
    authenticatedFetch,
  }
}
