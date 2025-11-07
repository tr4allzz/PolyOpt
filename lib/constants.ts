// lib/constants.ts

export const SCALING_FACTOR = 3.0; // c in formula (from Polymarket docs)

export const API_ENDPOINTS = {
  POLYMARKET_API: process.env.POLYMARKET_API_URL || 'https://gamma-api.polymarket.com',
  CLOB_API: process.env.CLOB_API_URL || 'https://clob.polymarket.com',
  DATA_API: process.env.DATA_API_URL || 'https://data-api.polymarket.com',
} as const;

export const CACHE_DURATIONS = {
  MARKETS: 60, // 60 seconds
  ORDER_BOOK: 30, // 30 seconds
  USER_POSITIONS: 30, // 30 seconds
} as const;

export const SUBSCRIPTION_TIERS = {
  FREE: {
    maxAlerts: 3,
    maxTrackedMarkets: 5,
    refreshRate: 60,
  },
  PREMIUM: {
    maxAlerts: 10,
    maxTrackedMarkets: 20,
    refreshRate: 30,
  },
  PRO: {
    maxAlerts: -1, // unlimited
    maxTrackedMarkets: -1, // unlimited
    refreshRate: 10,
  },
} as const;
