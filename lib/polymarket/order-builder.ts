/**
 * Polymarket Order Builder
 * Creates and signs orders for the CLOB API
 */

import { type WalletClient } from 'viem';

// Contract addresses on Polygon
const CTF_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';
const NEG_RISK_CTF_EXCHANGE = '0xC5d563A36AE78145C45a50134d48A1215220f80a';

// Order structure for Polymarket
export interface OrderData {
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
  side: number; // 0 = BUY, 1 = SELL
  signatureType: number; // 0 = EOA, 1 = POLY_PROXY, 2 = POLY_GNOSIS_SAFE
}

export interface SignedOrder {
  order: OrderData;
  signature: string;
}

export interface CreateOrderParams {
  tokenId: string;
  price: number;      // 0.0 to 1.0
  size: number;       // Number of shares
  side: 'BUY' | 'SELL';
  feeRateBps?: number;
  nonce?: string;
  expiration?: number; // Unix timestamp - only for GTD orders, use 0 for GTC
  orderType?: 'GTC' | 'GTD'; // GTC = Good Till Cancelled (expiration=0), GTD = Good Till Date
  proxyWallet?: string; // If using proxy wallet, set maker to this
  isNegRisk?: boolean; // Most Polymarket markets use NEG_RISK contract (default: true)
}

// EIP-712 Domain for Polymarket
const getOrderDomain = (chainId: number, isNegRisk: boolean = false) => ({
  name: 'Polymarket CTF Exchange',
  version: '1',
  chainId,
  verifyingContract: isNegRisk ? NEG_RISK_CTF_EXCHANGE : CTF_EXCHANGE,
} as const);

// EIP-712 Types for Order
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
} as const;

/**
 * Generate a random salt for order uniqueness
 * Must match format from @polymarket/order-utils to avoid precision issues
 */
function generateSalt(): string {
  return Math.round(Math.random() * Date.now()).toString();
}

/**
 * Calculate maker and taker amounts from price and size
 * For BUY: maker provides USDC, taker provides shares
 * For SELL: maker provides shares, taker provides USDC
 *
 * IMPORTANT: Polymarket requires prices to be multiples of 0.001 (tick size)
 */
function calculateAmounts(price: number, size: number, side: 'BUY' | 'SELL'): { makerAmount: string; takerAmount: string } {
  // Polymarket uses 6 decimals for USDC and 6 decimals for shares
  const DECIMALS = 1e6;

  // Round price to tick size (0.01) to avoid "breaks minimum tick size" error
  // Most markets use 0.01, some use 0.001 - using 0.01 is safer
  const roundedPrice = Math.round(price * 100) / 100;

  const priceInUnits = Math.round(roundedPrice * DECIMALS);
  const sizeInUnits = Math.round(size * DECIMALS);

  if (side === 'BUY') {
    // Buying shares: pay price * size in USDC, receive size shares
    const makerAmount = Math.round((priceInUnits * size)).toString();
    const takerAmount = sizeInUnits.toString();
    return { makerAmount, takerAmount };
  } else {
    // Selling shares: provide size shares, receive price * size in USDC
    const makerAmount = sizeInUnits.toString();
    const takerAmount = Math.round((priceInUnits * size)).toString();
    return { makerAmount, takerAmount };
  }
}

/**
 * Build an unsigned order
 * @param signerAddress - The EOA wallet that will sign and owns the API key
 * @param params - Order parameters including optional proxyWallet
 *
 * If proxyWallet is provided:
 * - maker = proxyWallet (where funds are held)
 * - signer = EOA (the wallet that owns the API key and signs)
 * - signatureType = 1 (POLY_PROXY)
 * The EOA signs the order; Polymarket verifies EOA controls the proxy
 */
export function buildOrder(
  signerAddress: string,
  params: CreateOrderParams
): OrderData {
  const { makerAmount, takerAmount } = calculateAmounts(params.price, params.size, params.side);

  // For GTC orders, expiration must be 0
  // For GTD orders, use provided expiration or default to 30 days
  const isGTD = params.orderType === 'GTD';
  let expiration: string;
  if (isGTD) {
    const defaultExpiration = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    expiration = (params.expiration || defaultExpiration).toString();
  } else {
    // GTC orders must have expiration = 0
    expiration = '0';
  }

  // Signature Types:
  // 0 = EOA (direct wallet trading)
  // 1 = POLY_PROXY for Magic/Email login
  // 2 = Browser Wallet proxy (Metamask, Coinbase Wallet, etc.)
  //
  // For Browser Wallet (signatureType=2):
  //   - maker = proxy wallet (where funds are)
  //   - signer = EOA (who signs the order)
  // EOA (signatureType=0): For direct EOA trading
  //   - maker = signer = EOA
  const useProxy = !!params.proxyWallet;

  return {
    salt: generateSalt(),
    maker: useProxy ? params.proxyWallet!.toLowerCase() : signerAddress.toLowerCase(),
    signer: signerAddress.toLowerCase(), // Always the EOA that signs
    taker: '0x0000000000000000000000000000000000000000', // Open order
    tokenId: params.tokenId,
    makerAmount,
    takerAmount,
    expiration,
    nonce: params.nonce || '0',
    feeRateBps: (params.feeRateBps || 0).toString(),
    side: params.side === 'BUY' ? 0 : 1,
    signatureType: useProxy ? 2 : 0, // 2 = Browser Wallet proxy (Metamask), 0 = EOA
  };
}

/**
 * Sign an order using the wallet
 */
export async function signOrder(
  walletClient: WalletClient,
  order: OrderData,
  chainId: number = 137,
  isNegRisk: boolean = false
): Promise<string> {
  const domain = getOrderDomain(chainId, isNegRisk);
  console.log('📝 Signing order with domain:', {
    ...domain,
    isNegRisk,
    contract: isNegRisk ? 'NEG_RISK_CTF_EXCHANGE' : 'CTF_EXCHANGE',
  });

  // Convert order to proper format for signing
  const message = {
    salt: BigInt(order.salt),
    maker: order.maker as `0x${string}`,
    signer: order.signer as `0x${string}`,
    taker: order.taker as `0x${string}`,
    tokenId: BigInt(order.tokenId),
    makerAmount: BigInt(order.makerAmount),
    takerAmount: BigInt(order.takerAmount),
    expiration: BigInt(order.expiration),
    nonce: BigInt(order.nonce),
    feeRateBps: BigInt(order.feeRateBps),
    side: order.side,
    signatureType: order.signatureType,
  };

  // Get the account from wallet client
  const account = walletClient.account;
  if (!account) {
    throw new Error('Wallet account not available');
  }

  const signature = await walletClient.signTypedData({
    account,
    domain,
    types: ORDER_TYPES,
    primaryType: 'Order',
    message,
  });

  return signature;
}

/**
 * Create and sign an order in one step
 * Note: Most Polymarket markets use NEG_RISK contract, so isNegRisk defaults to true
 */
export async function createSignedOrder(
  walletClient: WalletClient,
  maker: string,
  params: CreateOrderParams,
  chainId: number = 137
): Promise<SignedOrder> {
  const order = buildOrder(maker, params);
  // Most Polymarket markets use NEG_RISK_CTF_EXCHANGE
  const isNegRisk = params.isNegRisk ?? true;
  const signature = await signOrder(walletClient, order, chainId, isNegRisk);

  return { order, signature };
}
