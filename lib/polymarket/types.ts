// lib/polymarket/types.ts

export interface MarketData {
  id: string; // Gamma API ID (numeric)
  conditionId?: string; // CLOB condition ID (hex) - for Data API
  question: string;
  description?: string;
  endDate: Date;
  midpoint: number;
  volume: number;
  liquidity: number;
  active: boolean;
  resolved: boolean;
}

export interface RewardMarketData extends MarketData {
  maxSpread: number;
  minSize: number;
  rewardPool: number;
}

export interface UserOrderData {
  price: number;
  size: number;
  side: 'YES' | 'NO';
  type: 'BID' | 'ASK';
  createdAt: Date;
}
