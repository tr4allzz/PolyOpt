'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GoalCard } from './goal-card';
import { CreateGoalModal } from './create-goal-modal';
import { Target, Plus, Loader2 } from 'lucide-react';

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

interface GoalsSectionProps {
  walletAddress: string;
}

export function GoalsSection({ walletAddress }: GoalsSectionProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchGoals = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/user/goals?walletAddress=${walletAddress}`
      );
      const data = await response.json();

      if (data.success) {
        setGoals(data.goals);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) {
      fetchGoals();
    }
  }, [walletAddress, fetchGoals]);

  // Filter goals by status
  const activeGoals = goals.filter((g) => g.status === 'ACTIVE');
  const completedGoals = goals.filter((g) => g.status === 'COMPLETED');
  const hasActiveGoal = activeGoals.length > 0;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-green-500" />
            Goals & Milestones
          </CardTitle>
          {!hasActiveGoal && (
            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Set Goal
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeGoals.length === 0 && completedGoals.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <Target className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">
                No goals set yet. Set a target to track your progress!
              </p>
              <Button onClick={() => setShowCreateModal(true)} className="gap-1">
                <Plus className="h-4 w-4" />
                Set Your First Goal
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Active Goals */}
              {activeGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  walletAddress={walletAddress}
                  onDelete={fetchGoals}
                  onCelebrate={fetchGoals}
                />
              ))}

              {/* Completed Goals (show last 2) */}
              {completedGoals.length > 0 && (
                <>
                  {activeGoals.length > 0 && (
                    <div className="text-xs text-muted-foreground uppercase tracking-wide pt-2">
                      Recently Completed
                    </div>
                  )}
                  {completedGoals.slice(0, 2).map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      walletAddress={walletAddress}
                    />
                  ))}
                </>
              )}

              {/* Add new goal button if no active goal */}
              {!hasActiveGoal && completedGoals.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full gap-1"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="h-4 w-4" />
                  Set New Goal
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateGoalModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        walletAddress={walletAddress}
        onGoalCreated={fetchGoals}
      />
    </>
  );
}
