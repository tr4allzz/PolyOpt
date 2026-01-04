'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Target, Trash2, Trophy, Flame, TrendingUp, Calendar, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Confetti } from './confetti';

interface Goal {
  id: string;
  type: 'EARNINGS' | 'STREAK' | 'RANK';
  targetAmount: number;
  currentAmount: number;
  period: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  completedAt: string | null;
  celebratedAt: string | null;
}

interface GoalCardProps {
  goal: Goal;
  walletAddress: string;
  onDelete?: () => void;
  onCelebrate?: () => void;
}

const goalTypeConfig = {
  EARNINGS: {
    icon: Target,
    label: 'Earnings Goal',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    progressColor: 'bg-green-500',
    format: (v: number) => `$${v.toLocaleString()}`,
  },
  STREAK: {
    icon: Flame,
    label: 'Streak Goal',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    progressColor: 'bg-orange-500',
    format: (v: number) => `${v} days`,
  },
  RANK: {
    icon: Trophy,
    label: 'Rank Goal',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    progressColor: 'bg-yellow-500',
    format: (v: number) => `#${v}`,
  },
};

const periodLabels = {
  WEEKLY: 'This Week',
  MONTHLY: 'This Month',
  QUARTERLY: 'This Quarter',
  YEARLY: 'This Year',
  CUSTOM: 'Custom',
};

export function GoalCard({ goal, walletAddress, onDelete, onCelebrate }: GoalCardProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const config = goalTypeConfig[goal.type];
  const Icon = config.icon;

  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  const isCompleted = goal.status === 'COMPLETED';
  const isFailed = goal.status === 'FAILED';
  const needsCelebration = isCompleted && !goal.celebratedAt;

  // Calculate days remaining
  const endDate = new Date(goal.endDate);
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Trigger celebration for newly completed goals
  useEffect(() => {
    if (needsCelebration) {
      setShowConfetti(true);
      // Mark as celebrated
      handleCelebrate();
    }
  }, [needsCelebration]);

  const handleCelebrate = async () => {
    try {
      await fetch(`/api/user/goals/${goal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, celebrate: true }),
      });
      onCelebrate?.();
    } catch (error) {
      console.error('Error marking celebration:', error);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);

    try {
      await fetch(`/api/user/goals/${goal.id}?walletAddress=${walletAddress}`, {
        method: 'DELETE',
      });
      onDelete?.();
    } catch (error) {
      console.error('Error deleting goal:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {showConfetti && (
        <Confetti
          onComplete={() => setShowConfetti(false)}
        />
      )}

      <Card className={cn(
        'relative overflow-hidden transition-all',
        isCompleted && 'ring-2 ring-green-500/50 bg-green-500/5',
        isFailed && 'opacity-60'
      )}>
        {/* Status badge */}
        {isCompleted && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-medium">
            <Trophy className="h-3 w-3" />
            Completed!
          </div>
        )}
        {isFailed && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-500 text-xs font-medium">
            <X className="h-3 w-3" />
            Missed
          </div>
        )}

        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={cn('p-2 rounded-lg', config.bgColor)}>
              <Icon className={cn('h-5 w-5', config.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-muted-foreground">
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {periodLabels[goal.period]}
                </span>
              </div>

              {/* Target */}
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold">
                  {config.format(goal.currentAmount)}
                </span>
                <span className="text-muted-foreground">
                  / {config.format(goal.targetAmount)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <Progress
                  value={progress}
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{progress.toFixed(0)}% complete</span>
                  {goal.status === 'ACTIVE' && (
                    <span>{daysRemaining} days left</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              {goal.status === 'ACTIVE' && (
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
