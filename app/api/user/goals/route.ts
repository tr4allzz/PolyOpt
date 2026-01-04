// app/api/user/goals/route.ts
// Goals CRUD API

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoalType, GoalPeriod, GoalStatus } from '@prisma/client';

// Helper to calculate end date based on period
function calculateEndDate(period: GoalPeriod, startDate: Date = new Date()): Date {
  const end = new Date(startDate);

  switch (period) {
    case 'WEEKLY':
      end.setDate(end.getDate() + 7);
      break;
    case 'MONTHLY':
      end.setMonth(end.getMonth() + 1);
      break;
    case 'QUARTERLY':
      end.setMonth(end.getMonth() + 3);
      break;
    case 'YEARLY':
      end.setFullYear(end.getFullYear() + 1);
      break;
    default:
      end.setMonth(end.getMonth() + 1); // Default to monthly
  }

  return end;
}

// Helper to get current progress for a goal
async function getCurrentProgress(
  walletAddress: string,
  goalType: GoalType,
  startDate: Date,
  endDate: Date
): Promise<number> {
  if (goalType === 'EARNINGS') {
    // Fetch rewards from Polymarket API for the period
    try {
      const user = await prisma.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
        select: { funderAddress: true },
      });

      const walletsToTry = [walletAddress.toLowerCase()];
      if (user?.funderAddress) {
        walletsToTry.push(user.funderAddress.toLowerCase());
      }

      let totalEarned = 0;
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);

      for (const wallet of walletsToTry) {
        const url = `https://data-api.polymarket.com/activity?user=${wallet}&type=REWARD&limit=1000&sortBy=TIMESTAMP&sortDirection=DESC`;
        const response = await fetch(url);

        if (response.ok) {
          const rewards = await response.json();
          if (Array.isArray(rewards)) {
            for (const reward of rewards) {
              const ts = reward.timestamp || 0;
              if (ts >= startTimestamp && ts <= endTimestamp) {
                totalEarned += parseFloat(reward.usdcSize || reward.size || 0);
              }
            }
          }
        }
      }

      return Math.round(totalEarned * 100) / 100;
    } catch (error) {
      console.error('Error fetching progress:', error);
      return 0;
    }
  }

  // For other goal types, return 0 for now
  return 0;
}

/**
 * GET /api/user/goals?walletAddress=0x...
 * Get all goals for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: {
        goals: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ goals: [] });
    }

    // Update current progress for active goals
    const goalsWithProgress = await Promise.all(
      user.goals.map(async (goal) => {
        if (goal.status === 'ACTIVE') {
          const currentAmount = await getCurrentProgress(
            walletAddress,
            goal.type,
            goal.startDate,
            goal.endDate
          );

          // Check if goal is completed
          const isCompleted = currentAmount >= goal.targetAmount;
          const now = new Date();
          const isExpired = now > goal.endDate;

          // Update goal status if needed
          if (isCompleted && goal.status === 'ACTIVE') {
            await prisma.goal.update({
              where: { id: goal.id },
              data: {
                status: 'COMPLETED',
                currentAmount,
                completedAt: new Date(),
              },
            });
            return { ...goal, currentAmount, status: 'COMPLETED' as GoalStatus, completedAt: new Date() };
          } else if (isExpired && !isCompleted && goal.status === 'ACTIVE') {
            await prisma.goal.update({
              where: { id: goal.id },
              data: {
                status: 'FAILED',
                currentAmount,
              },
            });
            return { ...goal, currentAmount, status: 'FAILED' as GoalStatus };
          } else {
            // Just update current amount
            await prisma.goal.update({
              where: { id: goal.id },
              data: { currentAmount },
            });
            return { ...goal, currentAmount };
          }
        }
        return goal;
      })
    );

    return NextResponse.json({
      success: true,
      goals: goalsWithProgress,
    });
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/goals
 * Create a new goal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, type, targetAmount, period } = body;

    if (!walletAddress || !type || !targetAmount || !period) {
      return NextResponse.json(
        { error: 'walletAddress, type, targetAmount, and period are required' },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress: walletAddress.toLowerCase() },
      });
    }

    // Check if user already has an active goal of this type
    const existingActiveGoal = await prisma.goal.findFirst({
      where: {
        userId: user.id,
        type: type as GoalType,
        status: 'ACTIVE',
      },
    });

    if (existingActiveGoal) {
      return NextResponse.json(
        { error: 'You already have an active goal of this type' },
        { status: 400 }
      );
    }

    const startDate = new Date();
    const endDate = calculateEndDate(period as GoalPeriod, startDate);

    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        type: type as GoalType,
        targetAmount: parseFloat(targetAmount),
        period: period as GoalPeriod,
        startDate,
        endDate,
      },
    });

    return NextResponse.json({
      success: true,
      goal,
    });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      { error: 'Failed to create goal' },
      { status: 500 }
    );
  }
}
