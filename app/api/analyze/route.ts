// app/api/analyze/route.ts
// API endpoint to analyze best markets for given capital

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeBestMarketsForCapital, analyzeMarketOpportunity } from '@/lib/rewards/market-analyzer';

const AnalyzeSchema = z.object({
  capital: z.number().positive().min(10).max(1000000),
  limit: z.number().int().positive().optional().default(10),
  marketId: z.string().optional(), // For analyzing specific market
  useRealCompetition: z.boolean().optional().default(false), // Slower but more accurate
  useDynamicOptimization: z.boolean().optional().default(true), // NEW: Use dynamic spreads
  timeHorizon: z.number().int().positive().optional().default(30), // Days to optimize for
  riskTolerance: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  filters: z.object({
    maxCapital: z.number().positive().optional(), // Only markets needing <= this capital
    minROI: z.number().optional(), // Minimum ROI % APY
    competitionLevel: z.enum(['Low', 'Medium', 'High']).optional(),
    minRewardPool: z.number().optional(), // Minimum daily reward pool
    maxFillRisk: z.number().optional(), // NEW: Max fill probability (e.g., 0.25 = 25%)
    minVolatilityScore: z.number().optional(), // NEW: Min volatility score (filter stable markets)
    maxVolatilityScore: z.number().optional(), // NEW: Max volatility score (filter volatile markets)
  }).optional(),
});

/**
 * POST /api/analyze
 * Find best markets for given capital amount
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      capital,
      limit,
      marketId,
      useRealCompetition,
      useDynamicOptimization,
      timeHorizon,
      riskTolerance,
      filters
    } = AnalyzeSchema.parse(body);

    // If analyzing specific market
    if (marketId) {
      const opportunity = await analyzeMarketOpportunity(marketId, capital);

      if (!opportunity) {
        return NextResponse.json(
          { error: 'Market not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        opportunity,
        capital,
      });
    }

    // Analyze all markets
    let opportunities = await analyzeBestMarketsForCapital(capital, 1000, useRealCompetition); // Get all first

    // Apply traditional filters
    if (filters) {
      if (filters.maxCapital !== undefined) {
        const maxCapital = filters.maxCapital;
        opportunities = opportunities.filter(o => o.recommendedCapital <= maxCapital);
      }
      if (filters.minROI !== undefined) {
        const minROI = filters.minROI;
        opportunities = opportunities.filter(o => o.roi >= minROI);
      }
      if (filters.competitionLevel) {
        const competitionLevel = filters.competitionLevel;
        opportunities = opportunities.filter(o => o.competitionLevel === competitionLevel);
      }
      if (filters.minRewardPool !== undefined) {
        const minRewardPool = filters.minRewardPool;
        opportunities = opportunities.filter(o => o.rewardPool >= minRewardPool);
      }
    }

    // Take top opportunities before applying dynamic optimization (to save computation)
    const topOpportunities = opportunities.slice(0, Math.min(limit * 3, 30)); // Get 3x limit or max 30

    // Apply dynamic optimization if requested
    let enhancedOpportunities = topOpportunities;
    if (useDynamicOptimization) {
      console.log('🔬 Applying dynamic optimization to top opportunities...');

      // Helper function to process markets in batches to avoid rate limiting
      const processBatch = async (batch: typeof topOpportunities) => {
        return Promise.all(
          batch.map(async (opp) => {
            try {
              // Import here to avoid circular dependencies
              const { optimizeOrderPlacementDynamic } = await import('@/lib/rewards/optimizer');
              const { prisma } = await import('@/lib/prisma');

              // Get full market data
              const market = await prisma.market.findUnique({
                where: { id: opp.marketId },
              });

              if (!market) return { ...opp, dynamicMetrics: null };

              const conditionId = market.conditionId || market.id;
              const marketData = {
                id: market.id,
                question: market.question,
                midpoint: market.midpoint,
                maxSpread: market.maxSpread,
                minSize: market.minSize,
                rewardPool: market.rewardPool,
              };

              // Set spread range based on risk tolerance
              const spreadRanges = {
                low: { minSpreadRatio: 0.40, maxSpreadRatio: 0.80 },
                medium: { minSpreadRatio: 0.25, maxSpreadRatio: 0.70 },
                high: { minSpreadRatio: 0.20, maxSpreadRatio: 0.50 },
              };

              const placement = await optimizeOrderPlacementDynamic(
                capital,
                marketData,
                conditionId,
                opp.estimatedCompetition,
                {
                  timeHorizon,
                  ...spreadRanges[riskTolerance],
                }
              );

              return {
                ...opp,
                dynamicMetrics: {
                  fillProbability: placement.fillProbability,
                  fillRiskLevel: (placement.fillProbability < 0.10 ? 'Low'
                    : placement.fillProbability < 0.25 ? 'Medium'
                    : placement.fillProbability < 0.50 ? 'High' : 'Very High') as 'Low' | 'Medium' | 'High' | 'Very High',
                  volatilityScore: placement.volatilityScore,
                  volatilityLevel: placement.volatilityScore < 20 ? 'Very Stable'
                    : placement.volatilityScore < 40 ? 'Stable'
                    : placement.volatilityScore < 60 ? 'Moderate'
                    : placement.volatilityScore < 80 ? 'Volatile' : 'Extremely Volatile',
                  expectedValue: placement.expectedValue,
                  riskAdjustedReturn: placement.riskAdjustedReturn,
                  optimalSpreadRatio: placement.optimalSpreadRatio,
                },
              };
            } catch (error) {
              console.error(`Error optimizing market ${opp.marketId}:`, error);
              return { ...opp, dynamicMetrics: null };
            }
          })
        );
      };

      // Process markets in batches of 5 to avoid overwhelming the API
      const BATCH_SIZE = 5;
      const BATCH_DELAY_MS = 500; // 500ms delay between batches
      const allResults = [];

      for (let i = 0; i < topOpportunities.length; i += BATCH_SIZE) {
        const batch = topOpportunities.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(topOpportunities.length / BATCH_SIZE)} (${batch.length} markets)...`);

        const batchResults = await processBatch(batch);
        allResults.push(...batchResults);

        // Add delay between batches (except for the last batch)
        if (i + BATCH_SIZE < topOpportunities.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }

      enhancedOpportunities = allResults.filter(opp => opp.dynamicMetrics !== null); // Remove failed ones

      // Apply dynamic filters
      if (filters) {
        if (filters.maxFillRisk !== undefined) {
          const maxFillRisk = filters.maxFillRisk;
          enhancedOpportunities = enhancedOpportunities.filter(
            o => o.dynamicMetrics && o.dynamicMetrics.fillProbability <= maxFillRisk
          );
        }
        if (filters.minVolatilityScore !== undefined) {
          const minVol = filters.minVolatilityScore;
          enhancedOpportunities = enhancedOpportunities.filter(
            o => o.dynamicMetrics && o.dynamicMetrics.volatilityScore >= minVol
          );
        }
        if (filters.maxVolatilityScore !== undefined) {
          const maxVol = filters.maxVolatilityScore;
          enhancedOpportunities = enhancedOpportunities.filter(
            o => o.dynamicMetrics && o.dynamicMetrics.volatilityScore <= maxVol
          );
        }
      }

      // Re-sort by risk-adjusted return if available
      enhancedOpportunities.sort((a, b) => {
        const scoreA = a.dynamicMetrics?.riskAdjustedReturn || a.capitalEfficiency;
        const scoreB = b.dynamicMetrics?.riskAdjustedReturn || b.capitalEfficiency;
        return scoreB - scoreA;
      });
    }

    // Take final limit
    const finalOpportunities = enhancedOpportunities.slice(0, limit);

    return NextResponse.json({
      opportunities: finalOpportunities,
      capital,
      count: finalOpportunities.length,
      filters: filters || {},
      useDynamicOptimization,
      summary: {
        bestROI: finalOpportunities[0]?.roi || 0,
        bestDailyReward: finalOpportunities[0]?.estimatedDailyReward || 0,
        averageCompetition: finalOpportunities.length > 0
          ? finalOpportunities.reduce((sum, o) => sum + o.estimatedCompetition, 0) / finalOpportunities.length
          : 0,
        averageFillRisk: useDynamicOptimization && finalOpportunities.length > 0
          ? finalOpportunities.reduce((sum, o) => sum + (o.dynamicMetrics?.fillProbability || 0), 0) / finalOpportunities.length
          : undefined,
        averageVolatility: useDynamicOptimization && finalOpportunities.length > 0
          ? finalOpportunities.reduce((sum, o) => sum + (o.dynamicMetrics?.volatilityScore || 0), 0) / finalOpportunities.length
          : undefined,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error analyzing markets:', error);
    return NextResponse.json(
      { error: 'Failed to analyze markets' },
      { status: 500 }
    );
  }
}
