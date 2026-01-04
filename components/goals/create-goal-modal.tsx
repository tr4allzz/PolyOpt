'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
  onGoalCreated?: () => void;
}

const goalTypes = [
  {
    type: 'EARNINGS',
    label: 'Earnings',
    description: 'Reach a $ target',
    icon: Target,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500',
    placeholder: '500',
    prefix: '$',
  },
];

const periods = [
  { value: 'WEEKLY', label: 'This Week', days: 7 },
  { value: 'MONTHLY', label: 'This Month', days: 30 },
  { value: 'QUARTERLY', label: 'This Quarter', days: 90 },
];

export function CreateGoalModal({
  open,
  onOpenChange,
  walletAddress,
  onGoalCreated,
}: CreateGoalModalProps) {
  const [selectedType, setSelectedType] = useState<string>('EARNINGS');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('MONTHLY');
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedGoalType = goalTypes.find((g) => g.type === selectedType);

  const handleCreate = async () => {
    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      setError('Please enter a valid target amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          type: selectedType,
          targetAmount: parseFloat(targetAmount),
          period: selectedPeriod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create goal');
      }

      // Reset form and close
      setTargetAmount('');
      setSelectedType('EARNINGS');
      setSelectedPeriod('MONTHLY');
      onOpenChange(false);
      onGoalCreated?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-500" />
            Set a New Goal
          </DialogTitle>
          <DialogDescription>
            Set a target and track your progress. Get celebrated when you hit it!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Goal Type Selection */}
          <div className="space-y-2">
            <Label>Goal Type</Label>
            <div className="grid grid-cols-1 gap-2">
              {goalTypes.map((goal) => {
                const Icon = goal.icon;
                const isSelected = selectedType === goal.type;

                return (
                  <button
                    key={goal.type}
                    onClick={() => setSelectedType(goal.type)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
                      isSelected
                        ? `${goal.borderColor} ${goal.bgColor}`
                        : 'border-border hover:border-muted-foreground/50'
                    )}
                  >
                    <div className={cn('p-2 rounded-lg', goal.bgColor)}>
                      <Icon className={cn('h-5 w-5', goal.color)} />
                    </div>
                    <div>
                      <div className="font-medium">{goal.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {goal.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Amount */}
          <div className="space-y-2">
            <Label>Target Amount</Label>
            <div className="relative">
              {selectedGoalType?.prefix && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {selectedGoalType.prefix}
                </span>
              )}
              <Input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder={selectedGoalType?.placeholder}
                className={cn(selectedGoalType?.prefix && 'pl-7')}
              />
            </div>
          </div>

          {/* Period Selection */}
          <div className="space-y-2">
            <Label>Time Period</Label>
            <div className="grid grid-cols-3 gap-2">
              {periods.map((period) => (
                <button
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all',
                    selectedPeriod === period.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{period.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {period.days} days
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-500 text-center">{error}</div>
          )}

          {/* Create Button */}
          <Button
            onClick={handleCreate}
            disabled={loading || !targetAmount}
            className="w-full"
          >
            {loading ? 'Creating...' : 'Create Goal'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
