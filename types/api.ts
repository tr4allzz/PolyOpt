// types/api.ts

export interface PolymarketMarket {
  id: string;
  conditionId: string;
  question: string;
  description?: string;
  endDate: string;
  endDateIso?: string;
  slug: string;
  rewardsMinSize: number;
  rewardsMaxSpread: number;
  active: boolean;
  closed: boolean;
  volume: string;
  liquidity: string;
  outcomePrices?: string; // JSON string of prices like "[\"0.52\", \"0.48\"]"
  lastTradePrice?: number;
  bestBid?: number;
  bestAsk?: number;
}

export interface PolymarketOrder {
  id: string;
  market: string;
  asset_id: string;
  maker_address: string;
  price: string;
  size: string;
  side: 'BUY' | 'SELL';
  outcome: 'YES' | 'NO';
  created_at: string;
}

export interface RewardConfig {
  condition_id: string;
  reward_epoch: number;
  daily_reward_amount: string;
  max_spread: string;
  min_size: string;
}

export interface OrderBookSummary {
  market: string;
  asset_id: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  spread: string;
  last: string;
}
