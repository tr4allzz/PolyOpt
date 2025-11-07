// types/rewards.ts

export interface Order {
  price: number;      // 0.0 to 1.0
  size: number;       // Number of shares
  side: 'YES' | 'NO';
  type: 'BID' | 'ASK';
}

export interface Market {
  id: string;
  question: string;
  midpoint: number;     // Current market midpoint (0.0 to 1.0)
  maxSpread: number;    // Max spread from midpoint (e.g., 0.03 = 3¢)
  minSize: number;      // Minimum shares to qualify
  rewardPool: number;   // Daily USD reward amount
}

export interface QScore {
  qOne: number;   // First side score
  qTwo: number;   // Second side score
  qMin: number;   // Final score (min of qOne and qTwo)
}

export interface RewardEstimate {
  userShare: number;      // Percentage (0 to 1)
  dailyReward: number;    // USD amount
  monthlyReward: number;  // USD amount
  annualizedAPY?: number; // If capital known
}

export interface OptimalPlacement {
  buyOrder: { price: number; size: number };
  sellOrder: { price: number; size: number };
  expectedQScore: QScore;
  expectedDailyReward: number;
  capitalEfficiency: number; // Reward per $ deployed
}
