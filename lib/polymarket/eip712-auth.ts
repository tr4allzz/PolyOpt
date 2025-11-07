/**
 * EIP-712 typed data structures and utilities for Polymarket CLOB L1 Authentication
 * Based on: https://docs.polymarket.com/api-documentation/authentication
 */

export const POLYGON_CHAIN_ID = 137;

/**
 * EIP-712 domain for CLOB authentication
 */
export const CLOB_AUTH_DOMAIN = {
  name: "ClobAuthDomain",
  version: "1",
  chainId: POLYGON_CHAIN_ID,
} as const;

/**
 * EIP-712 types for CLOB authentication
 */
export const CLOB_AUTH_TYPES = {
  ClobAuth: [
    { name: "address", type: "address" },
    { name: "timestamp", type: "string" },
    { name: "nonce", type: "uint256" },
    { name: "message", type: "string" },
  ],
} as const;

/**
 * Static message for CLOB authentication
 */
export const CLOB_AUTH_MESSAGE = "This message attests that I control the given wallet";

/**
 * Create the EIP-712 typed data value for CLOB authentication
 */
export function createClobAuthValue(
  address: string,
  timestamp: string,
  nonce: number = 0
) {
  return {
    address,
    timestamp,
    nonce,
    message: CLOB_AUTH_MESSAGE,
  };
}

/**
 * L1 Authentication headers for Polymarket CLOB API
 */
export interface L1AuthHeaders {
  POLY_ADDRESS: string;
  POLY_SIGNATURE: string;
  POLY_TIMESTAMP: string;
  POLY_NONCE: string;
}

/**
 * Create L1 authentication headers for CLOB API requests
 */
export function createL1AuthHeaders(
  address: string,
  signature: string,
  timestamp: string,
  nonce: number = 0
): L1AuthHeaders {
  return {
    POLY_ADDRESS: address,
    POLY_SIGNATURE: signature,
    POLY_TIMESTAMP: timestamp,
    POLY_NONCE: nonce.toString(),
  };
}

/**
 * Get current UNIX timestamp as string
 */
export function getCurrentTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}
