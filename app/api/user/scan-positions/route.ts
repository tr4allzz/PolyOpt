// app/api/user/scan-positions/route.ts
// Scan Polymarket for user's positions using authenticated API
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchAuthenticatedOrders } from '@/lib/polymarket/authenticated-client';
import { calculateQScore, calculateExpectedReward } from '@/lib/rewards/calculator';
import { requireAuth } from '@/lib/auth/middleware';
import { cachedFetch, batchCachedFetch } from '@/lib/cache/api-cache';

// Concurrency limit for market detail fetches
const MARKET_FETCH_CONCURRENCY = 5;

/**
 * POST /api/user/scan-positions
 * Scan for user's positions using authenticated Polymarket API
 * Requires authentication - wallet signature verification
 * Requires user to have API credentials configured
 */
export const POST = requireAuth(async (request: NextRequest, auth) => {
  // Use the verified wallet address from authentication
  const walletAddress = auth.walletAddress;

  console.log(`🔍 Scanning positions for authenticated wallet ${walletAddress} using authenticated API...`);

  // Create or get user
  const user = await prisma.user.upsert({
    where: { walletAddress },
    create: { walletAddress },
    update: {},
  }).catch((error) => {
    console.error('Error upserting user:', error);
    throw error;
  });

  // Fetch ALL user's open orders using authenticated API
  let allOrders;
  try {
    allOrders = await fetchAuthenticatedOrders(walletAddress);
    console.log(`📦 Fetched ${allOrders?.length || 0} total open orders from Polymarket`);

    // Debug: Log first order structure
    if (allOrders && allOrders.length > 0) {
      console.log('📋 Sample order structure:', JSON.stringify(allOrders[0], null, 2));
    }
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    if (error.message?.includes('No API credentials')) {
      return NextResponse.json({
        success: false,
        error: 'API credentials required',
        message: 'Please configure your Polymarket API credentials first. You can create API keys at https://polymarket.com/settings/api',
        needsCredentials: true,
      }, { status: 401 });
    }
    throw error;
  }

  if (!allOrders || allOrders.length === 0) {
    console.log(`No open orders found for ${walletAddress}`);
    return NextResponse.json({
      success: true,
      marketsWithPositions: [],
      totalOrders: 0,
      walletAddress,
      message: 'No open orders found. Make sure you have active limit orders on Polymarket.',
    });
  }

  // Ensure allOrders is an array
  let ordersArray = allOrders;
  if (!Array.isArray(allOrders)) {
    console.log('⚠️ Orders response is not an array, attempting to extract...');
    console.log('Response type:', typeof allOrders);
    console.log('Response keys:', allOrders ? Object.keys(allOrders) : 'null');

    if (allOrders && typeof allOrders === 'object') {
      // Try common property names
      if ('data' in allOrders) {
        ordersArray = (allOrders as any).data;
      } else if ('orders' in allOrders) {
        ordersArray = (allOrders as any).orders;
      } else {
        console.error('Cannot find orders array in response');
        ordersArray = [];
      }
    } else {
      ordersArray = [];
    }
  }

  // Group orders by market (condition_id)
  const ordersByMarket = new Map<string, any[]>();
  for (const order of ordersArray) {
    const marketId = order.market;
    if (!marketId) {
      console.warn('Order missing market field:', order);
      continue;
    }
    if (!ordersByMarket.has(marketId)) {
      ordersByMarket.set(marketId, []);
    }
    ordersByMarket.get(marketId)!.push(order);
  }

  console.log(`📊 Found orders in ${ordersByMarket.size} markets`);
  console.log('📋 Market IDs with orders:', Array.from(ordersByMarket.keys()).map(id => id.substring(0, 20) + '...'));

  // Fetch reward configuration from CLOB API (cached for 5 minutes)
  console.log('Fetching reward configuration from Polymarket...');
  const rewardConfigData = await cachedFetch<any>(
    'https://clob.polymarket.com/sampling-simplified-markets',
    {},
    5 * 60 * 1000 // Cache for 5 minutes
  );

  // Create a map of condition_id to reward config
  const rewardConfigMap = new Map();
  for (const market of rewardConfigData.data) {
    if (market.rewards && market.condition_id) {
      rewardConfigMap.set(market.condition_id, market);
    }
  }
  console.log(`📊 Found ${rewardConfigMap.size} markets with reward configs`);

  // Fetch market details - these contain rewards info directly!
  console.log(`\n🔍 Fetching market details (including rewards) with concurrency limit of ${MARKET_FETCH_CONCURRENCY}...`);
  const marketDetailsMap = new Map();

  // Build URLs for batch fetch
  const marketIds = Array.from(ordersByMarket.keys());
  const marketUrls = marketIds.map(id => `https://clob.polymarket.com/markets/${id}`);

  // Batch fetch with concurrency limit (prevents overwhelming the API)
  const batchResults = await batchCachedFetch<any>(
    marketUrls,
    {},
    2 * 60 * 1000, // Cache for 2 minutes
    MARKET_FETCH_CONCURRENCY
  );

  // Build the map from results
  for (let i = 0; i < marketIds.length; i++) {
    const marketId = marketIds[i];
    const url = marketUrls[i];
    const marketData = batchResults.get(url);

    if (marketData && marketData.condition_id) {
      marketDetailsMap.set(marketId, marketData);

      // Log market info
      let dailyReward = 0;
      if (marketData.rewards && marketData.rewards.rates) {
        dailyReward = marketData.rewards.rates.reduce((sum: number, rate: any) => {
          return sum + parseFloat(rate.rewards_daily_rate || '0');
        }, 0);
      }
      console.log(`   ✅ Market: ${marketData.question?.substring(0, 40)}... | Rewards: ${dailyReward > 0 ? `$${dailyReward}` : 'none'}`);
    }
  }

  console.log(`📊 Found ${marketDetailsMap.size} markets with details`);

  // Get all reward markets from database
  const rewardMarkets = await prisma.market.findMany({
    where: {
      active: true,
      rewardPool: { gt: 0 },
      conditionId: { not: null },
    },
  });

  const rewardMarketMap = new Map(
    rewardMarkets.map(m => [m.conditionId!, m])
  );
  console.log(`📊 Found ${rewardMarketMap.size} reward markets in database`);

  // Calculate Q-scores for each market with orders
  const positionsFound: any[] = [];
  let processed = 0;
  let skippedNoRewards = 0;
  let createdMarkets = 0;

  for (const [marketId, orders] of ordersByMarket) {
    try {
      console.log(`\n🔍 Processing market ${marketId.substring(0, 20)}... with ${orders.length} orders`);

      // Get the condition_id for this market
      const marketDetails = marketDetailsMap.get(marketId);
      if (!marketDetails || !marketDetails.condition_id) {
        console.log(`   ⚠️  No condition_id found for this market, skipping`);
        skippedNoRewards++;
        processed++;
        continue;
      }

      const conditionId = marketDetails.condition_id;
      console.log(`   ℹ️  Condition ID: ${conditionId.substring(0, 20)}...`);

      let market = rewardMarketMap.get(conditionId);

      // If market doesn't exist in database but has rewards, create it
      if (!market) {
        console.log(`   Market not in database, checking for rewards...`);

        // Check if this market has rewards (from the market details we fetched)
        if (!marketDetails.rewards) {
          // User has orders in a non-reward market, skip
          console.log(`   ❌ No rewards configured, skipping`);
          skippedNoRewards++;
          processed++;
          continue;
        }

        console.log(`   ✅ Rewards found!`);

        // Calculate daily reward pool
        let dailyRewardPool = 0;
        if (marketDetails.rewards.rates) {
          dailyRewardPool = marketDetails.rewards.rates.reduce((sum: number, rate: any) => {
            return sum + parseFloat(rate.rewards_daily_rate || '0');
          }, 0);
        }

        if (dailyRewardPool === 0) {
          console.log(`   ⚠️  Reward pool is $0, skipping`);
          skippedNoRewards++;
          processed++;
          continue;
        }

        console.log(`   📝 Creating market record (Daily reward: $${dailyRewardPool})`);

        // Calculate midpoint from token prices if available
        let midpoint = 0.5;
        if (marketDetails.tokens && marketDetails.tokens.length >= 2) {
          const yesToken = marketDetails.tokens.find((t: any) => t.outcome === 'Yes');
          const noToken = marketDetails.tokens.find((t: any) => t.outcome === 'No');
          if (yesToken && yesToken.price !== undefined) {
            midpoint = parseFloat(yesToken.price);
            console.log(`   📊 Using market midpoint: ${midpoint} (from Yes token price)`);
          }
        }

        // Create market record with details from CLOB API
        market = await prisma.market.create({
          data: {
            id: conditionId.substring(0, 32),
            question: marketDetails.question || `Market ${conditionId.substring(0, 10)}...`,
            description: marketDetails.description || 'Automatically created from user orders',
            conditionId,
            maxSpread: parseFloat(marketDetails.rewards.max_spread || '0.05'),
            minSize: parseFloat(marketDetails.rewards.min_size || '100'),
            rewardPool: dailyRewardPool,
            midpoint,
            volume: 0,
            liquidity: 0,
            endDate: marketDetails.end_date_iso ? new Date(marketDetails.end_date_iso) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            active: marketDetails.active !== false,
            resolved: marketDetails.closed || false,
          },
        });

        rewardMarketMap.set(conditionId, market);
        createdMarkets++;
        console.log(`   ✅ Market created successfully`);
      }

      console.log(`   💯 Calculating Q-score for: ${market.question}`);

      // Transform orders to our format
      const transformedOrders = orders.map((order: any) => ({
        price: parseFloat(order.price),
        size: parseFloat(order.original_size || order.size),
        side: order.outcome.toUpperCase() as 'YES' | 'NO',  // Fix: uppercase the outcome
        type: order.side === 'BUY' ? 'BID' as const : 'ASK' as const,
      }));

      console.log(`   📋 Transformed orders:`, transformedOrders);

      // Calculate Q-score
      const userQScore = calculateQScore(transformedOrders, {
        id: market.id,
        question: market.question,
        midpoint: market.midpoint,
        maxSpread: market.maxSpread,
        minSize: market.minSize,
        rewardPool: market.rewardPool,
      });

      // Calculate capital deployed
      const capitalDeployed = transformedOrders.reduce((sum, order) => {
        return sum + (order.size * order.price);
      }, 0);

      // We can't accurately calculate market share without all users' orders
      // Show potential reward as if user had 100% share (upper bound estimate)
      const expectedReward = calculateExpectedReward(
        userQScore.qMin,
        userQScore.qMin, // This calculates max potential (100% share)
        market.rewardPool,
        capitalDeployed
      );

      console.log(`   📊 Q-Score: ${userQScore.qMin.toFixed(2)}, Capital: $${capitalDeployed.toFixed(2)}, Max Potential Daily: $${expectedReward.dailyReward.toFixed(2)}`);
      console.log(`   ⚠️  Note: Actual rewards will be lower based on competition`);

      // Save position to database
      console.log(`   💾 Saving position to database...`);
      console.log(`   📊 Position data:`, {
        userId: user.id.substring(0, 10) + '...',
        marketId: market.id.substring(0, 10) + '...',
        qMin: userQScore.qMin,
        orderCount: orders.length,
      });

      const savedPosition = await prisma.position.upsert({
        where: {
          userId_marketId: {
            userId: user.id,
            marketId: market.id,
          },
        },
        create: {
          userId: user.id,
          marketId: market.id,
          qOne: userQScore.qOne,
          qTwo: userQScore.qTwo,
          qMin: userQScore.qMin,
          estimatedDaily: expectedReward.dailyReward,
          userShare: expectedReward.userShare,
          competitionQMin: 0, // Will be updated later
          capitalDeployed,
          orderCount: orders.length,
        },
        update: {
          qOne: userQScore.qOne,
          qTwo: userQScore.qTwo,
          qMin: userQScore.qMin,
          estimatedDaily: expectedReward.dailyReward,
          userShare: expectedReward.userShare,
          capitalDeployed,
          orderCount: orders.length,
          calculatedAt: new Date(),
        },
      });

      console.log(`   ✅ Position saved successfully with ID: ${savedPosition.id}`);

      positionsFound.push({
        id: market.id,
        conditionId: market.conditionId,
        question: market.question,
        orderCount: orders.length,
        qMin: userQScore.qMin,
        estimatedDaily: expectedReward.dailyReward,
        rewardPool: market.rewardPool,
        capitalDeployed,
      });

      processed++;
    } catch (error) {
      console.error(`❌ Error processing market ${marketId}:`, error);
      processed++;
    }
  }

  // Clean up old positions - set orderCount to 0 for markets where user no longer has orders
  console.log(`\n🧹 Cleaning up old positions...`);

  // Build list of Market.id values (not CLOB market IDs) that have orders
  const marketIdsWithOrders: string[] = [];
  for (const [clobMarketId] of ordersByMarket) {
    const marketDetails = marketDetailsMap.get(clobMarketId);
    if (marketDetails?.condition_id) {
      // Use the same ID format as when we create markets
      marketIdsWithOrders.push(marketDetails.condition_id.substring(0, 32));
    }
  }

  console.log(`   📋 Active market IDs: ${marketIdsWithOrders.length > 0 ? marketIdsWithOrders.map(id => id.substring(0, 10) + '...').join(', ') : 'none'}`);

  const { count: clearedCount } = await prisma.position.updateMany({
    where: {
      userId: user.id,
      marketId: {
        notIn: marketIdsWithOrders.length > 0 ? marketIdsWithOrders : ['__none__'], // Avoid empty array
      },
      orderCount: {
        gt: 0,
      },
    },
    data: {
      orderCount: 0,
      calculatedAt: new Date(),
    },
  });
  console.log(`   ✅ Cleared ${clearedCount} old positions (no active orders)`);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Scan Summary:`);
  console.log(`   Total orders: ${allOrders.length}`);
  console.log(`   Markets with orders: ${ordersByMarket.size}`);
  console.log(`   Markets with rewards: ${rewardConfigMap.size}`);
  console.log(`   Markets skipped (no rewards): ${skippedNoRewards}`);
  console.log(`   Markets created: ${createdMarkets}`);
  console.log(`   Positions calculated: ${positionsFound.length}`);
  console.log(`   Old positions cleared: ${clearedCount}`);
  console.log(`${'='.repeat(60)}\n`);
  console.log(`✅ Scan complete: Found and calculated ${positionsFound.length} positions`);

  return NextResponse.json({
    success: true,
    marketsWithPositions: positionsFound,
    totalOrders: allOrders.length,
    totalMarkets: ordersByMarket.size,
    positionsCalculated: positionsFound.length,
    walletAddress,
    message: positionsFound.length > 0
      ? `Successfully calculated Q-scores for ${positionsFound.length} markets with your open orders!`
      : 'No positions found in reward markets. Your orders may be in non-reward markets.',
  });
});
