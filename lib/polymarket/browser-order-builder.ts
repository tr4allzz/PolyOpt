/**
 * Browser-compatible order builder using ethers.js with MetaMask
 * Signs orders directly with EIP-712 typed data
 */

import { ethers } from 'ethers';

// Contract addresses on Polygon
const REGULAR_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';
const NEG_RISK_EXCHANGE = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
const CHAIN_ID = 137;

/**
 * Get EIP-712 domain for the correct exchange contract
 */
function getDomain(negRisk: boolean) {
  return {
    name: 'Polymarket CTF Exchange',
    version: '1',
    chainId: CHAIN_ID,
    verifyingContract: negRisk ? NEG_RISK_EXCHANGE : REGULAR_EXCHANGE,
  };
}

// EIP-712 Types
const ORDER_TYPES = {
  Order: [
    { name: 'salt', type: 'uint256' },
    { name: 'maker', type: 'address' },
    { name: 'signer', type: 'address' },
    { name: 'taker', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'makerAmount', type: 'uint256' },
    { name: 'takerAmount', type: 'uint256' },
    { name: 'expiration', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'feeRateBps', type: 'uint256' },
    { name: 'side', type: 'uint8' },
    { name: 'signatureType', type: 'uint8' },
  ],
};

export interface CreateOrderParams {
  tokenId: string;
  price: number;
  size: number;
  side: 'BUY' | 'SELL';
  makerAddress: string;    // Proxy wallet (where funds are)
  signerAddress: string;   // EOA wallet (who signs)
  negRisk?: boolean;       // Whether market uses neg risk exchange (fetched automatically if not provided)
}

/**
 * Fetch negRisk status for a token via our API (avoids CORS issues)
 */
export async function getNegRiskForToken(tokenId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/markets/neg-risk?tokenId=${tokenId}`);
    if (!response.ok) {
      console.warn('⚠️ Could not fetch negRisk, defaulting to false');
      return false;
    }
    const data = await response.json();
    return data.negRisk === true;
  } catch (error) {
    console.warn('⚠️ Error fetching negRisk:', error);
    return false;
  }
}

export interface SignedOrderResult {
  order: {
    salt: string;
    maker: string;
    signer: string;
    taker: string;
    tokenId: string;
    makerAmount: string;
    takerAmount: string;
    expiration: string;
    nonce: string;
    feeRateBps: string;
    side: number;
    signatureType: number;
  };
  signature: string;
}

/**
 * Generate a random salt for order uniqueness
 */
function generateSalt(): string {
  return Math.round(Math.random() * Date.now()).toString();
}

/**
 * Calculate maker and taker amounts from price and size
 */
function calculateAmounts(price: number, size: number, side: 'BUY' | 'SELL'): { makerAmount: string; takerAmount: string } {
  const DECIMALS = 1e6;
  const roundedPrice = Math.round(price * 100) / 100;
  const priceInUnits = Math.round(roundedPrice * DECIMALS);
  const sizeInUnits = Math.round(size * DECIMALS);

  if (side === 'BUY') {
    const makerAmount = Math.round(priceInUnits * size).toString();
    const takerAmount = sizeInUnits.toString();
    return { makerAmount, takerAmount };
  } else {
    const makerAmount = sizeInUnits.toString();
    const takerAmount = Math.round(priceInUnits * size).toString();
    return { makerAmount, takerAmount };
  }
}

/**
 * Create and sign an order using MetaMask with EIP-712
 */
export async function createSignedOrderWithMetaMask(
  params: CreateOrderParams
): Promise<SignedOrderResult> {
  console.log('🔐 Creating order with MetaMask...');

  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('MetaMask not available');
  }

  // Get ethers provider and signer from MetaMask
  const provider = new ethers.providers.Web3Provider((window as any).ethereum);
  const signer = provider.getSigner();
  const signerAddress = await signer.getAddress();

  console.log('   MetaMask signer:', signerAddress);
  console.log('   Order signer param:', params.signerAddress);

  // Verify signer matches
  if (signerAddress.toLowerCase() !== params.signerAddress.toLowerCase()) {
    throw new Error(`Signer mismatch: MetaMask is ${signerAddress}, expected ${params.signerAddress}`);
  }

  // Get negRisk status if not provided
  let negRisk = params.negRisk;
  if (negRisk === undefined) {
    console.log('   Fetching negRisk status for token...');
    negRisk = await getNegRiskForToken(params.tokenId);
  }
  console.log('   negRisk:', negRisk);
  console.log('   Exchange:', negRisk ? NEG_RISK_EXCHANGE : REGULAR_EXCHANGE);

  const { makerAmount, takerAmount } = calculateAmounts(params.price, params.size, params.side);

  // Build order
  const order = {
    salt: generateSalt(),
    maker: params.makerAddress,
    signer: signerAddress, // Use checksummed address from MetaMask
    taker: '0x0000000000000000000000000000000000000000',
    tokenId: params.tokenId,
    makerAmount,
    takerAmount,
    expiration: '0',
    nonce: '0',
    feeRateBps: '0',
    side: params.side === 'BUY' ? 0 : 1,
    signatureType: 2, // Browser Wallet (MetaMask)
  };

  console.log('   Order to sign:', order);

  // Get the correct domain for this market's exchange
  const domain = getDomain(negRisk);
  console.log('   EIP-712 Domain:', domain);

  try {
    // Sign with EIP-712
    const signature = await signer._signTypedData(domain, ORDER_TYPES, order);
    console.log('   ✅ Signature:', signature);

    return {
      order: {
        salt: order.salt,
        maker: order.maker,
        signer: order.signer,
        taker: order.taker,
        tokenId: order.tokenId,
        makerAmount: order.makerAmount,
        takerAmount: order.takerAmount,
        expiration: order.expiration,
        nonce: order.nonce,
        feeRateBps: order.feeRateBps,
        side: order.side,
        signatureType: order.signatureType,
      },
      signature,
    };
  } catch (error: any) {
    console.error('❌ Signing failed:', error);
    throw new Error(`Signing failed: ${error.message}`);
  }
}
