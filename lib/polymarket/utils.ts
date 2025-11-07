// lib/polymarket/utils.ts

/**
 * Format Polymarket price (0.0 to 1.0) to percentage
 */
export function formatPrice(price: number): string {
  return `${(price * 100).toFixed(1)}%`;
}

/**
 * Format USD amount
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format large numbers with suffixes (K, M, B)
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toFixed(2);
}

/**
 * Calculate bid-ask spread
 */
export function calculateBidAskSpread(
  bestBid: number,
  bestAsk: number
): number {
  return bestAsk - bestBid;
}

/**
 * Validate wallet address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Shorten wallet address for display
 */
export function shortenAddress(address: string): string {
  if (!isValidAddress(address)) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
