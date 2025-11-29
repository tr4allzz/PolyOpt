'use client'

import { Trophy, Medal, Award, ExternalLink } from 'lucide-react'
import { memo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Badge } from '@/components/ui/badge'

interface LeaderboardEntry {
  rank: number
  walletAddress: string
  totalRewards: number
  payoutCount: number
  memberSince: string | null
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
}

const ROW_HEIGHT = 52 // Height of each row in pixels
const VIRTUALIZATION_THRESHOLD = 50 // Only virtualize if more than 50 entries

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />
    default:
      return null
  }
}

function formatWalletAddress(address: string): string {
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Memoized row component for better performance
const TableRowComponent = memo(function TableRowComponent({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div
      className={`flex items-center border-b ${entry.rank <= 3 ? 'bg-muted/30' : ''}`}
      style={{ height: ROW_HEIGHT }}
    >
      {/* Rank */}
      <div className="w-[80px] px-4 flex items-center gap-2">
        {getRankIcon(entry.rank)}
        <span className="font-bold">#{entry.rank}</span>
      </div>

      {/* Wallet Address */}
      <div className="flex-1 px-4">
        <div className="flex items-center gap-2">
          <a
            href={`https://polymarket.com/profile/${entry.walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity group"
          >
            <code className="text-xs bg-muted px-2 py-1 rounded group-hover:bg-muted/70">
              {formatWalletAddress(entry.walletAddress)}
            </code>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>
          {entry.rank === 1 && (
            <Badge variant="default" className="text-xs">
              Top Trader
            </Badge>
          )}
        </div>
      </div>

      {/* Payouts */}
      <div className="w-[100px] px-4 text-right">
        <span className="text-muted-foreground">
          {entry.payoutCount.toLocaleString()}
        </span>
      </div>

      {/* Total Rewards */}
      <div className="w-[150px] px-4 text-right">
        <span className="font-bold text-green-600">
          ${entry.totalRewards.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>
    </div>
  )
})

// Virtualized table for large datasets
function VirtualizedTable({ entries }: LeaderboardTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10, // Render 10 extra items above and below viewport
  })

  return (
    <div className="border rounded-md">
      {/* Header */}
      <div className="flex items-center border-b bg-muted/50 font-medium text-sm" style={{ height: ROW_HEIGHT }}>
        <div className="w-[80px] px-4">Rank</div>
        <div className="flex-1 px-4">Wallet Address</div>
        <div className="w-[100px] px-4 text-right">Payouts</div>
        <div className="w-[150px] px-4 text-right">Total Rewards</div>
      </div>

      {/* Virtualized Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: Math.min(entries.length * ROW_HEIGHT, 600) }} // Max height 600px
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const entry = entries[virtualRow.index]
            return (
              <div
                key={entry.rank}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <TableRowComponent entry={entry} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Regular table for small datasets
function RegularTable({ entries }: LeaderboardTableProps) {
  return (
    <div className="border rounded-md">
      {/* Header */}
      <div className="flex items-center border-b bg-muted/50 font-medium text-sm" style={{ height: ROW_HEIGHT }}>
        <div className="w-[80px] px-4">Rank</div>
        <div className="flex-1 px-4">Wallet Address</div>
        <div className="w-[100px] px-4 text-right">Payouts</div>
        <div className="w-[150px] px-4 text-right">Total Rewards</div>
      </div>

      {/* Body */}
      <div>
        {entries.map((entry) => (
          <TableRowComponent key={entry.rank} entry={entry} />
        ))}
      </div>
    </div>
  )
}

export const LeaderboardTable = memo(function LeaderboardTable({ entries }: LeaderboardTableProps) {
  // Use virtualization only for large datasets
  if (entries.length > VIRTUALIZATION_THRESHOLD) {
    return <VirtualizedTable entries={entries} />
  }

  return <RegularTable entries={entries} />
})
