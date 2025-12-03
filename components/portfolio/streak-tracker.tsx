'use client'

import { memo, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatUSD } from '@/lib/polymarket/utils'
import { format, subDays, startOfDay, differenceInDays, parseISO } from 'date-fns'
import { Share } from 'lucide-react'

interface Reward {
  timestamp?: number
  date?: string
  cash_amount?: string | number
  usdcSize?: string | number
}

interface StreakTrackerProps {
  rewards: Reward[]
}

const MILESTONES = [7, 14, 30, 60, 90]

function parseRewardDate(reward: Reward): Date {
  if (reward.timestamp) {
    return startOfDay(new Date(reward.timestamp * 1000))
  }
  if (reward.date) {
    return startOfDay(parseISO(reward.date))
  }
  return startOfDay(new Date())
}

function getRewardAmount(reward: Reward): number {
  const amount = reward.usdcSize || reward.cash_amount || 0
  return parseFloat(String(amount))
}

export const StreakTracker = memo(function StreakTracker({ rewards }: StreakTrackerProps) {
  const shareToTwitter = (streak: number, total: string, days: number) => {
    const text = streak > 0
      ? `${streak} day streak on @Polymarket! Earned ${total} in the last ${days} days providing liquidity.\n\nThanks to @optmarkets opt-markets.com`
      : `Earned ${total} in the last ${days} days providing liquidity on @Polymarket!\n\nThanks to @optmarkets opt-markets.com`

    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'width=550,height=420')
  }

  const stats = useMemo(() => {
    const today = startOfDay(new Date())
    const daysMap = new Map<string, number>()

    let last7Total = 0
    let last30Total = 0

    if (rewards && Array.isArray(rewards)) {
      for (const reward of rewards) {
        const rewardDate = parseRewardDate(reward)
        const key = format(rewardDate, 'yyyy-MM-dd')
        const amount = getRewardAmount(reward)

        daysMap.set(key, (daysMap.get(key) || 0) + amount)

        const daysDiff = differenceInDays(today, rewardDate)
        if (daysDiff < 7) last7Total += amount
        if (daysDiff < 30) last30Total += amount
      }
    }

    let currentStreak = 0
    let checkDate = today

    const todayKey = format(today, 'yyyy-MM-dd')
    if (!daysMap.has(todayKey)) {
      checkDate = subDays(today, 1)
    }

    while (true) {
      const key = format(checkDate, 'yyyy-MM-dd')
      if (daysMap.has(key)) {
        currentStreak++
        checkDate = subDays(checkDate, 1)
      } else {
        break
      }
    }

    let bestStreak = 0
    let tempStreak = 0
    const sortedDates = Array.from(daysMap.keys()).sort()

    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1
      } else {
        const prevDate = new Date(sortedDates[i - 1])
        const currDate = new Date(sortedDates[i])
        const diff = differenceInDays(currDate, prevDate)

        if (diff === 1) {
          tempStreak++
        } else {
          tempStreak = 1
        }
      }
      bestStreak = Math.max(bestStreak, tempStreak)
    }

    const totalDaysWithRewards = daysMap.size
    const totalRewards = Array.from(daysMap.values()).reduce((sum, val) => sum + val, 0)
    const averageDailyReward = totalDaysWithRewards > 0 ? totalRewards / totalDaysWithRewards : 0

    const nextMilestone = MILESTONES.find(m => m > currentStreak) || MILESTONES[MILESTONES.length - 1]
    const prevMilestone = MILESTONES.filter(m => m <= currentStreak).pop() || 0
    const progressToMilestone = ((currentStreak - prevMilestone) / (nextMilestone - prevMilestone)) * 100

    return {
      currentStreak,
      bestStreak,
      totalDaysWithRewards,
      averageDailyReward,
      last7DaysTotal: last7Total,
      last30DaysTotal: last30Total,
      nextMilestone,
      progressToMilestone: Math.min(progressToMilestone, 100),
    }
  }, [rewards])

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Streak</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground"
            onClick={() => shareToTwitter(stats.currentStreak, formatUSD(stats.last30DaysTotal), 30)}
          >
            <Share className="h-4 w-4 mr-1" />
            Share
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current streak */}
        <div className="text-center py-2">
          <span className="text-4xl font-bold">{stats.currentStreak}</span>
          <span className="text-muted-foreground ml-2">days</span>
          {stats.currentStreak > 0 && stats.currentStreak >= stats.bestStreak && (
            <p className="text-xs text-muted-foreground mt-1">Personal best</p>
          )}
        </div>

        {/* Progress to next milestone */}
        {stats.currentStreak > 0 && stats.currentStreak < stats.nextMilestone && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Next: {stats.nextMilestone} days</span>
              <span>{stats.nextMilestone - stats.currentStreak} to go</span>
            </div>
            <Progress value={stats.progressToMilestone} className="h-1.5" />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-2 bg-muted/30 rounded">
            <p className="text-muted-foreground text-xs">Best streak</p>
            <p className="font-medium">{stats.bestStreak} days</p>
          </div>
          <div className="p-2 bg-muted/30 rounded">
            <p className="text-muted-foreground text-xs">Avg per day</p>
            <p className="font-medium">{formatUSD(stats.averageDailyReward)}</p>
          </div>
          <div className="p-2 bg-muted/30 rounded">
            <p className="text-muted-foreground text-xs">Last 7 days</p>
            <p className="font-medium">{formatUSD(stats.last7DaysTotal)}</p>
          </div>
          <div className="p-2 bg-muted/30 rounded">
            <p className="text-muted-foreground text-xs">Last 30 days</p>
            <p className="font-medium">{formatUSD(stats.last30DaysTotal)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
