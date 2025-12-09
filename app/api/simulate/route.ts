// app/api/simulate/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  calculateQScore,
  calculateExpectedReward,
} from '@/lib/rewards/calculator';
import { Market, Order } from '@/types/rewards';

const GAMMA_API = 'https://gamma-api.polymarket.com';

/**
 * Fetch fresh midpoint from Polymarket API
 */
async function fetchFreshMidpoint(marketId: string): Promise<number | null> {
  try {
    const response = await fetch(`${GAMMA_API}/markets/${marketId}`, {
      next: { revalidate: 0 }, // No cache
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (data.outcomePrices) {
      const prices = JSON.parse(data.outcomePrices);
      if (prices.length >= 2) {
        return parseFloat(prices[0]); // YES price
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching fresh midpoint:', error);
    return null;
  }
}

interface SimulateRequest {
  marketId: string;
  capital: number;
  strategy?: 'balanced' | 'conservative' | 'aggressive' | 'yes_only' | 'no_only';
}

interface StrategyConfig {
  name: string;
  description: string;
  risk: 'Low' | 'Medium' | 'High';
  spreadRatio: number;
  singleSided?: 'YES' | 'NO';
}

const STRATEGIES: Record<string, StrategyConfig> = {
  balanced: {
    name: 'Balanced',
    description: 'Two-sided liquidity at moderate spread',
    risk: 'Medium',
    spreadRatio: 0.35,
  },
  conservative: {
    name: 'Conservative',
    description: 'Wide spreads for lower risk',
    risk: 'Low',
    spreadRatio: 0.50,
  },
  aggressive: {
    name: 'Aggressive',
    description: 'Tight spreads for higher rewards',
    risk: 'High',
    spreadRatio: 0.25,
  },
  yes_only: {
    name: 'YES Only (One-Sided)',
    description: 'Only provide YES liquidity',
    risk: 'High',
    spreadRatio: 0.35,
    singleSided: 'YES',
  },
  no_only: {
    name: 'NO Only (One-Sided)',
    description: 'Only provide NO liquidity',
    risk: 'High',
    spreadRatio: 0.35,
    singleSided: 'NO',
  },
};

/**
 * POST /api/simulate
 * Simulate rewards for a given market and capital amount
 */
export async function POST(request: Request) {
  try {
    const body: SimulateRequest = await request.json();
    const { marketId, capital, strategy = 'balanced' } = body;

    if (!marketId || !capital || capital <= 0) {
      return NextResponse.json(
        { error: 'Invalid request: marketId and positive capital required' },
        { status: 400 }
      );
    }

    // Fetch market from database
    const dbMarket = await prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!dbMarket) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    // Fetch fresh midpoint from Polymarket API
    const freshMidpoint = await fetchFreshMidpoint(marketId);

    // Convert to rewards Market type, use fresh midpoint if available
    const market: Market = {
      id: dbMarket.id,
      question: dbMarket.question,
      midpoint: freshMidpoint ?? dbMarket.midpoint,
      maxSpread: dbMarket.maxSpread,
      minSize: dbMarket.minSize,
      rewardPool: dbMarket.rewardPool,
    };

    // Estimate competition Q_min (simplified - in production would analyze orderbook)
    // Use liquidity as a rough proxy for competition
    const estimatedCompetitionQMin = (dbMarket.liquidity || 10000) * 0.1;

    // Calculate results for all strategies
    const allStrategies = Object.entries(STRATEGIES).map(([key, config]) => {
      const result = calculateStrategy(capital, market, config, estimatedCompetitionQMin);
      return {
        key,
        ...config,
        dailyReward: result.expectedReward.dailyReward,
      };
    });

    // Calculate for selected strategy
    const selectedStrategy = STRATEGIES[strategy] || STRATEGIES.balanced;
    const result = calculateStrategy(capital, market, selectedStrategy, estimatedCompetitionQMin);

    // Build response
    const response = {
      qScore: result.qScore,
      expectedReward: result.expectedReward,
      strategy: {
        name: selectedStrategy.name,
        description: selectedStrategy.description,
        risk: selectedStrategy.risk,
        totalCapital: capital,
        orders: result.orders,
      },
      allStrategies,
      disclaimer: getDisclaimer(selectedStrategy, market),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error simulating rewards:', error);
    return NextResponse.json(
      { error: 'Failed to simulate rewards' },
      { status: 500 }
    );
  }
}

function calculateStrategy(
  capital: number,
  market: Market,
  config: StrategyConfig,
  competitionQMin: number
) {
  const spreadFromMid = market.maxSpread * config.spreadRatio;
  const orders: Order[] = [];
  const orderDetails: any[] = [];

  if (config.singleSided === 'YES') {
    // Single-sided YES: BID (buy YES) and ASK (sell YES)
    const buyPrice = market.midpoint - spreadFromMid;
    const sellPrice = market.midpoint + spreadFromMid;
    const buySize = (capital * 0.5) / buyPrice;
    const sellSize = (capital * 0.5) / sellPrice;

    orders.push(
      { price: buyPrice, size: buySize, side: 'YES', type: 'BID' },
      { price: sellPrice, size: sellSize, side: 'YES', type: 'ASK' }
    );

    const buyQty = Math.floor(buySize);
    const sellQty = Math.floor(sellSize);

    orderDetails.push(
      {
        side: 'BUY',
        outcome: 'YES',
        price: `${(buyPrice * 100).toFixed(1)}¢`,
        size: buyQty,
        cost: (buyQty * buyPrice).toFixed(2),
      },
      {
        side: 'SELL',
        outcome: 'YES',
        price: `${(sellPrice * 100).toFixed(1)}¢`,
        size: sellQty,
        cost: (sellQty * sellPrice).toFixed(2),
      }
    );
  } else if (config.singleSided === 'NO') {
    // Single-sided NO: BID (buy NO) and ASK (sell NO)
    const noMidpoint = 1 - market.midpoint;
    const buyPrice = noMidpoint - spreadFromMid;
    const sellPrice = noMidpoint + spreadFromMid;
    const buySize = (capital * 0.5) / buyPrice;
    const sellSize = (capital * 0.5) / sellPrice;

    orders.push(
      { price: buyPrice, size: buySize, side: 'NO', type: 'BID' },
      { price: sellPrice, size: sellSize, side: 'NO', type: 'ASK' }
    );

    const buyQty = Math.floor(buySize);
    const sellQty = Math.floor(sellSize);

    orderDetails.push(
      {
        side: 'BUY',
        outcome: 'NO',
        price: `${(buyPrice * 100).toFixed(1)}¢`,
        size: buyQty,
        cost: (buyQty * buyPrice).toFixed(2),
      },
      {
        side: 'SELL',
        outcome: 'NO',
        price: `${(sellPrice * 100).toFixed(1)}¢`,
        size: sellQty,
        cost: (sellQty * sellPrice).toFixed(2),
      }
    );
  } else {
    // Two-sided: YES BID + NO BID (or equivalently YES BID + YES ASK)
    const yesBuyPrice = market.midpoint - spreadFromMid;
    const yesSellPrice = market.midpoint + spreadFromMid;
    const yesBuySize = (capital * 0.5) / yesBuyPrice;
    const yesSellSize = (capital * 0.5) / yesSellPrice;

    orders.push(
      { price: yesBuyPrice, size: yesBuySize, side: 'YES', type: 'BID' },
      { price: yesSellPrice, size: yesSellSize, side: 'YES', type: 'ASK' }
    );

    const buyQty = Math.floor(yesBuySize);
    const sellQty = Math.floor(yesSellSize);

    orderDetails.push(
      {
        side: 'BUY',
        outcome: 'YES',
        price: `${(yesBuyPrice * 100).toFixed(1)}¢`,
        size: buyQty,
        cost: (buyQty * yesBuyPrice).toFixed(2),
      },
      {
        side: 'SELL',
        outcome: 'YES',
        price: `${(yesSellPrice * 100).toFixed(1)}¢`,
        size: sellQty,
        cost: (sellQty * yesSellPrice).toFixed(2),
      }
    );
  }

  const qScore = calculateQScore(orders, market);
  const totalQMin = competitionQMin + qScore.qMin;
  const expectedReward = calculateExpectedReward(
    qScore.qMin,
    totalQMin,
    market.rewardPool,
    capital
  );

  return {
    qScore,
    expectedReward,
    orders: orderDetails,
  };
}

function getDisclaimer(strategy: StrategyConfig, market: Market) {
  if (strategy.singleSided) {
    return {
      title: 'Single-Sided Risk',
      message: `One-sided liquidity receives a penalty (divided by scaling factor). Consider two-sided strategies for better Q-scores.`,
    };
  }

  if (strategy.risk === 'High') {
    return {
      title: 'High Risk Strategy',
      message: `Aggressive spreads increase the chance your orders get filled, which means you lose the liquidity reward position. Monitor positions closely.`,
    };
  }

  if (market.midpoint < 0.15 || market.midpoint > 0.85) {
    return {
      title: 'Extreme Midpoint',
      message: `This market has a midpoint outside 10-90%, requiring two-sided liquidity. One-sided strategies will receive zero rewards.`,
    };
  }

  return null;
}
