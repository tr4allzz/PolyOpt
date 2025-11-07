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
  filters: z.object({
    maxCapital: z.number().positive().optional(), // Only markets needing <= this capital
    minROI: z.number().optional(), // Minimum ROI % APY
    competitionLevel: z.enum(['Low', 'Medium', 'High']).optional(),
    minRewardPool: z.number().optional(), // Minimum daily reward pool
  }).optional(),
});

/**
 * POST /api/analyze
 * Find best markets for given capital amount
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { capital, limit, marketId, useRealCompetition, filters } = AnalyzeSchema.parse(body);

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

    // Apply filters
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

    // Take only requested limit
    opportunities = opportunities.slice(0, limit);

    return NextResponse.json({
      opportunities,
      capital,
      count: opportunities.length,
      filters: filters || {},
      summary: {
        bestROI: opportunities[0]?.roi || 0,
        bestDailyReward: opportunities[0]?.estimatedDailyReward || 0,
        averageCompetition: opportunities.length > 0
          ? opportunities.reduce((sum, o) => sum + o.estimatedCompetition, 0) / opportunities.length
          : 0,
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
