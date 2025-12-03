'use client'

import { memo, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatUSD } from '@/lib/polymarket/utils'
import { format, subDays, startOfDay, isSameDay, parseISO, isToday } from 'date-fns'

interface Reward {
  timestamp?: number
  date?: string
  cash_amount?: string | number
  usdcSize?: string | number
}

interface RewardsCalendarProps {
  rewards: Reward[]
  days?: number
}

interface DayData {
  date: Date
  amount: number
  count: number
  hasReward: boolean
}

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

export const RewardsCalendar = memo(function RewardsCalendar({
  rewards,
  days = 30
}: RewardsCalendarProps) {
  const { dailyData, maxAmount, totalEarned, streakInfo } = useMemo(() => {
    const today = startOfDay(new Date())
    const dailyMap = new Map<string, DayData>()

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i)
      const key = format(date, 'yyyy-MM-dd')
      dailyMap.set(key, {
        date,
        amount: 0,
        count: 0,
        hasReward: false,
      })
    }

    let total = 0
    if (rewards && Array.isArray(rewards)) {
      for (const reward of rewards) {
        const rewardDate = parseRewardDate(reward)
        const key = format(rewardDate, 'yyyy-MM-dd')
        const amount = getRewardAmount(reward)

        if (dailyMap.has(key)) {
          const existing = dailyMap.get(key)!
          dailyMap.set(key, {
            ...existing,
            amount: existing.amount + amount,
            count: existing.count + 1,
            hasReward: true,
          })
          total += amount
        }
      }
    }

    const dayValues = Array.from(dailyMap.values())
    const max = Math.max(...dayValues.map(d => d.amount), 1)

    let currentStreak = 0
    let bestStreak = 0
    let tempStreak = 0

    const sortedDays = [...dayValues].sort((a, b) => b.date.getTime() - a.date.getTime())

    for (let i = 0; i < sortedDays.length; i++) {
      const day = sortedDays[i]
      if (i === 0 && !day.hasReward && isSameDay(day.date, today)) {
        continue
      }
      if (day.hasReward) {
        currentStreak++
      } else {
        break
      }
    }

    const chronological = [...sortedDays].reverse()
    for (const day of chronological) {
      if (day.hasReward) {
        tempStreak++
        bestStreak = Math.max(bestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }

    return {
      dailyData: Array.from(dailyMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime()),
      maxAmount: max,
      totalEarned: total,
      streakInfo: { current: currentStreak, best: bestStreak },
    }
  }, [rewards, days])

  const getIntensityClasses = (amount: number, hasReward: boolean): string => {
    if (!hasReward) return 'bg-muted/30'
    const ratio = amount / maxAmount
    if (ratio < 0.33) return 'bg-green-100'
    if (ratio < 0.66) return 'bg-green-200'
    return 'bg-green-300'
  }

  const daysWithRewards = dailyData.filter(d => d.hasReward).length

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Rewards</CardTitle>
          <span className="text-sm text-muted-foreground">Last {days} days</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Total: </span>
            <span className="font-medium">{formatUSD(totalEarned)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Active: </span>
            <span className="font-medium">{daysWithRewards} days</span>
          </div>
          {streakInfo.current > 0 && (
            <div>
              <span className="text-muted-foreground">Streak: </span>
              <span className="font-medium">{streakInfo.current} days</span>
            </div>
          )}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-center text-xs text-muted-foreground py-1">
              {day}
            </div>
          ))}

          {(() => {
            const firstDay = dailyData[0]?.date
            const startPadding = firstDay ? firstDay.getDay() : 0
            const paddedDays: (DayData | null)[] = [
              ...Array(startPadding).fill(null),
              ...dailyData
            ]

            return paddedDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="aspect-square" />
              }

              const isTodayCell = isToday(day.date)

              return (
                <div
                  key={format(day.date, 'yyyy-MM-dd')}
                  className={`
                    aspect-square rounded p-0.5 flex flex-col items-center justify-center text-center
                    ${getIntensityClasses(day.amount, day.hasReward)}
                    ${isTodayCell ? 'ring-1 ring-foreground' : ''}
                  `}
                >
                  <span className="text-[11px] text-muted-foreground">
                    {format(day.date, 'd')}
                  </span>
                  {day.hasReward && (
                    <span className="text-[9px] font-medium text-green-700">
                      ${day.amount.toFixed(2)}
                    </span>
                  )}
                </div>
              )
            })
          })()}
        </div>
      </CardContent>
    </Card>
  )
})
