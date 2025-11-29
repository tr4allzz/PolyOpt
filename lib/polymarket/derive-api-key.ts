// lib/polymarket/derive-api-key.ts
// Derive Polymarket API credentials from wallet signature

import { WalletClient } from 'viem';

const CLOB_API_URL = 'https://clob.polymarket.com';

interface DerivedApiCredentials {
  apiKey: string;
  apiSecret: string;
  apiPassphrase: string;
}

/**
 * Derive API credentials from wallet signature (EIP-712)
 * This allows users to authenticate with just their wallet without manually creating API keys
 */
export async function deriveApiCredentials(
  walletClient: WalletClient,
  walletAddress: string,
  funderAddress?: string
): Promise<DerivedApiCredentials> {
  console.log('🔑 Deriving API credentials from wallet signature...');

  // Step 1: Get nonce from CLOB
  const nonceResponse = await fetch(`${CLOB_API_URL}/auth/nonce?address=${walletAddress}`);
  if (!nonceResponse.ok) {
    throw new Error('Failed to get nonce from CLOB');
  }
  const { nonce } = await nonceResponse.json();
  console.log('📝 Got nonce:', nonce);

  // Step 2: Sign EIP-712 message
  const timestamp = Math.floor(Date.now() / 1000);

  const domain = {
    name: 'ClobAuthDomain',
    version: '1',
    chainId: 137, // Polygon
  };

  const types = {
    ClobAuth: [
      { name: 'address', type: 'address' },
      { name: 'timestamp', type: 'string' },
      { name: 'nonce', type: 'uint256' },
      { name: 'message', type: 'string' },
    ],
  };

  const message = {
    address: walletAddress,
    timestamp: timestamp.toString(),
    nonce: nonce.toString(),
    message: 'This message attests that I control the given wallet',
  };

  console.log('✍️ Signing EIP-712 message...');
  const signature = await walletClient.signTypedData({
    account: walletAddress as `0x${string}`,
    domain,
    types,
    primaryType: 'ClobAuth',
    message,
  });

  console.log('✅ Signature created');

  // Step 3: Derive API key from signature
  const deriveUrl = `${CLOB_API_URL}/auth/derive-api-key`;
  const deriveResponse = await fetch(deriveUrl, {
    method: 'GET',
    headers: {
      'POLY_ADDRESS': funderAddress || walletAddress, // Use funder address if proxy wallet
      'POLY_SIGNATURE': signature,
      'POLY_TIMESTAMP': timestamp.toString(),
      'POLY_NONCE': nonce.toString(),
    },
  });

  if (!deriveResponse.ok) {
    const errorText = await deriveResponse.text();
    console.error('❌ Failed to derive API key:', errorText);
    throw new Error(`Failed to derive API credentials: ${deriveResponse.status}`);
  }

  const credentials: DerivedApiCredentials = await deriveResponse.json();
  console.log('✅ API credentials derived successfully');

  return credentials;
}
