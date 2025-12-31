// lib/polymarket/authenticated-client.ts
// Authenticated Polymarket CLOB REST API client
//
// ⚠️ DISABLED: We no longer store user API credentials for security reasons.
// This file is kept as a stub to prevent import errors.

/**
 * Fetch user's open orders using REST API
 * ⚠️ DISABLED - We no longer store API credentials
 */
export async function fetchAuthenticatedOrders(
  walletAddress: string,
  marketConditionId?: string
): Promise<any[]> {
  console.warn('fetchAuthenticatedOrders is disabled - we no longer store API credentials');
  throw new Error('Order fetching is disabled. We no longer store API credentials for security reasons.');
}
