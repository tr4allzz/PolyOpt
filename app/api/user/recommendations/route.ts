// app/api/user/recommendations/route.ts
// Generate personalized recommendations to maximize rewards

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Recommendation {
  type: 'rebalance' | 'increase' | 'exit' | 'opportunity' | 'diversify';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  impact: string;
  marketId?: string;
  marketQuestion?: string;
  currentValue?: number;
  suggestedValue?: number;
  expectedGain?: number;
}

/**
 * GET /api/user/recommendations?walletAddress=0x...
 * Generate personalized recommendations to optimize portfolio for maximum rewards
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress parameter is required' },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    console.log(`🎯 Generating recommendations for ${walletAddress}...`);

    // Fetch user with positions and historical data
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: {
        positions: {
          where: {
            orderCount: {
              gt: 0,
            },
          },
          include: {
            market: true,
          },
          orderBy: {
            estimatedDaily: 'desc',
          },
        },
        payouts: true,
      },
    });

    if (!user || user.positions.length === 0) {
      return NextResponse.json({
        recommendations: [],
        summary: {
          totalPositions: 0,
          message: 'No positions found. Start by scanning for positions or visiting market pages.',
        },
      });
    }

    // Fetch market share data
    let marketShare = 0.5; // Default
    try {
      const marketShareResponse = await fetch(
        `${request.url.split('/api/')[0]}/api/user/market-share?walletAddress=${walletAddress}`
      );
      if (marketShareResponse.ok) {
        const marketShareData = await marketShareResponse.json();
        if (marketShareData.marketShare !== null) {
          marketShare = marketShareData.marketShare;
        }
      }
    } catch (error) {
      console.log('   Could not fetch market share, using default');
    }

    console.log(`   Market share: ${(marketShare * 100).toFixed(1)}%`);
    console.log(`   Active positions: ${user.positions.length}`);

    const recommendations: Recommendation[] = [];

    // Calculate metrics for each position
    const positionMetrics = user.positions.map(position => {
      const realisticDaily = position.estimatedDaily * marketShare;
      const roi = position.capitalDeployed > 0
        ? (realisticDaily / position.capitalDeployed) * 100
        : 0;
      const dailyReturn = position.capitalDeployed > 0
        ? (realisticDaily / position.capitalDeployed) * 365 * 100
        : 0;

      return {
        ...position,
        realisticDaily,
        roi: dailyReturn, // Annualized ROI
        efficiencyScore: roi, // Daily ROI as efficiency
      };
    });

    // Sort by efficiency
    const sortedByEfficiency = [...positionMetrics].sort((a, b) => b.efficiencyScore - a.efficiencyScore);
    const avgEfficiency = positionMetrics.reduce((sum, p) => sum + p.efficiencyScore, 0) / positionMetrics.length;

    console.log(`   Average efficiency: ${avgEfficiency.toFixed(2)}%/day`);

    // 1. IDENTIFY UNDERPERFORMERS
    const underperformers = sortedByEfficiency.filter(p => p.efficiencyScore < avgEfficiency * 0.5);

    if (underperformers.length > 0) {
      const worst = underperformers[0];
      const best = sortedByEfficiency[0];

      if (worst.capitalDeployed > 100) {
        const reallocationAmount = Math.min(worst.capitalDeployed * 0.5, 500); // Suggest moving up to 50% or $500
        const currentDailyFromWorse = worst.realisticDaily;
        const projectedDailyInBest = (best.realisticDaily / best.capitalDeployed) * reallocationAmount;
        const dailyGain = projectedDailyInBest - (currentDailyFromWorse * (reallocationAmount / worst.capitalDeployed));

        recommendations.push({
          type: 'rebalance',
          priority: dailyGain > 1 ? 'high' : 'medium',
          title: 'Reallocate from Low-Performing Position',
          description: `${worst.market.question.substring(0, 60)}... has low ROI (${worst.roi.toFixed(1)}% APY) compared to your best position (${best.roi.toFixed(1)}% APY).`,
          action: `Move $${reallocationAmount.toFixed(0)} from this market to ${best.market.question.substring(0, 40)}...`,
          impact: `+$${dailyGain.toFixed(2)}/day (+$${(dailyGain * 30).toFixed(0)}/month)`,
          marketId: worst.marketId,
          marketQuestion: worst.market.question,
          currentValue: worst.capitalDeployed,
          suggestedValue: worst.capitalDeployed - reallocationAmount,
          expectedGain: dailyGain,
        });
      }
    }

    // 2. Q-SCORE IMPROVEMENTS
    for (const position of positionMetrics) {
      // If Q-score is low, suggest increasing capital
      if (position.qMin < 50 && position.capitalDeployed < 1000) {
        const targetQScore = Math.ceil(position.qMin / 50) * 50 + 50; // Next threshold (50, 100, 150, etc.)
        const estimatedCapitalNeeded = position.capitalDeployed * (targetQScore / position.qMin - 1);
        const capitalToAdd = Math.min(estimatedCapitalNeeded, 500); // Cap suggestion at $500

        const projectedQScore = position.qMin * (1 + capitalToAdd / position.capitalDeployed);
        const rewardIncrease = (position.realisticDaily / position.qMin) * (projectedQScore - position.qMin);

        if (rewardIncrease > 0.5) { // Only suggest if meaningful increase
          recommendations.push({
            type: 'increase',
            priority: rewardIncrease > 2 ? 'high' : 'medium',
            title: 'Boost Low Q-Score Position',
            description: `${position.market.question.substring(0, 60)}... has Q-score of ${position.qMin.toFixed(0)}. Increasing capital could improve rewards.`,
            action: `Add ~$${capitalToAdd.toFixed(0)} to reach Q-score ~${projectedQScore.toFixed(0)}`,
            impact: `+$${rewardIncrease.toFixed(2)}/day (+$${(rewardIncrease * 30).toFixed(0)}/month)`,
            marketId: position.marketId,
            marketQuestion: position.market.question,
            currentValue: position.capitalDeployed,
            suggestedValue: position.capitalDeployed + capitalToAdd,
            expectedGain: rewardIncrease,
          });
        }
      }
    }

    // 3. EXIT RECOMMENDATIONS (very low performers)
    const veryLowPerformers = sortedByEfficiency.filter(p =>
      p.efficiencyScore < avgEfficiency * 0.25 && p.capitalDeployed > 50
    );

    for (const position of veryLowPerformers.slice(0, 2)) { // Max 2 exit suggestions
      recommendations.push({
        type: 'exit',
        priority: 'medium',
        title: 'Consider Exiting Low-ROI Position',
        description: `${position.market.question.substring(0, 60)}... has very low ROI (${position.roi.toFixed(1)}% APY). This capital could earn more elsewhere.`,
        action: `Remove orders and redeploy $${position.capitalDeployed.toFixed(0)} to higher-performing markets`,
        impact: `Free up capital for better opportunities`,
        marketId: position.marketId,
        marketQuestion: position.market.question,
        currentValue: position.capitalDeployed,
        suggestedValue: 0,
      });
    }

    // 4. DIVERSIFICATION CHECK
    const totalCapital = positionMetrics.reduce((sum, p) => sum + p.capitalDeployed, 0);
    const largestPosition = sortedByEfficiency[0];
    const concentrationRatio = largestPosition.capitalDeployed / totalCapital;

    if (concentrationRatio > 0.5 && user.positions.length < 5) {
      recommendations.push({
        type: 'diversify',
        priority: 'low',
        title: 'Diversify Your Portfolio',
        description: `${(concentrationRatio * 100).toFixed(0)}% of your capital is in one market. Diversifying reduces risk and can capture more opportunities.`,
        action: `Consider spreading capital across ${Math.min(5, user.positions.length + 2)} markets instead of ${user.positions.length}`,
        impact: 'Reduced concentration risk',
        marketId: largestPosition.marketId,
        marketQuestion: largestPosition.market.question,
      });
    }

    // 5. FIND NEW OPPORTUNITIES
    // Get markets with rewards that user is NOT in
    const userMarketIds = user.positions.map(p => p.marketId);
    const opportunities = await prisma.market.findMany({
      where: {
        active: true,
        rewardPool: { gt: 50 }, // At least $50/day
        id: {
          notIn: userMarketIds,
        },
      },
      orderBy: {
        rewardPool: 'desc',
      },
      take: 3,
    });

    for (const market of opportunities) {
      // Estimate potential reward with user's typical capital and market share
      const typicalCapital = totalCapital / user.positions.length;
      const estimatedQScore = 50; // Conservative estimate for new position
      const potentialDaily = (market.rewardPool * marketShare * estimatedQScore) / 100; // Rough estimate

      if (potentialDaily > 1) {
        recommendations.push({
          type: 'opportunity',
          priority: potentialDaily > 5 ? 'high' : 'medium',
          title: 'New Market Opportunity',
          description: `${market.question.substring(0, 60)}... has $${market.rewardPool.toFixed(0)}/day in rewards and you're not participating yet.`,
          action: `Consider entering this market with ~$${typicalCapital.toFixed(0)}`,
          impact: `Potential +$${potentialDaily.toFixed(2)}/day with typical capital`,
          marketId: market.id,
          marketQuestion: market.question,
          suggestedValue: typicalCapital,
          expectedGain: potentialDaily,
        });
      }
    }

    // Sort recommendations by priority and expected gain
    recommendations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      return (b.expectedGain || 0) - (a.expectedGain || 0);
    });

    // Calculate potential total improvement
    const totalPotentialGain = recommendations
      .filter(r => r.expectedGain)
      .reduce((sum, r) => sum + (r.expectedGain || 0), 0);

    console.log(`   ✅ Generated ${recommendations.length} recommendations`);
    console.log(`   Potential daily gain: +$${totalPotentialGain.toFixed(2)}`);

    return NextResponse.json({
      recommendations: recommendations.slice(0, 10), // Top 10 recommendations
      summary: {
        totalPositions: user.positions.length,
        totalCapital,
        avgEfficiency: avgEfficiency.toFixed(2),
        marketShare: marketShare * 100,
        totalPotentialGain,
        potentialMonthlyGain: totalPotentialGain * 30,
      },
      metrics: {
        bestPerformer: {
          marketId: sortedByEfficiency[0]?.marketId,
          question: sortedByEfficiency[0]?.market.question,
          roi: sortedByEfficiency[0]?.roi.toFixed(1),
        },
        worstPerformer: sortedByEfficiency.length > 1 ? {
          marketId: sortedByEfficiency[sortedByEfficiency.length - 1]?.marketId,
          question: sortedByEfficiency[sortedByEfficiency.length - 1]?.market.question,
          roi: sortedByEfficiency[sortedByEfficiency.length - 1]?.roi.toFixed(1),
        } : null,
      },
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
