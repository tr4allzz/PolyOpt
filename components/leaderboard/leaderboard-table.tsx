import { Trophy, Medal, Award, ExternalLink } from 'lucide-react'
import { memo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

export const LeaderboardTable = memo(function LeaderboardTable({ entries }: LeaderboardTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Rank</TableHead>
          <TableHead>Wallet Address</TableHead>
          <TableHead className="text-right">Total Rewards</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.rank} className={entry.rank <= 3 ? 'bg-muted/30' : ''}>
            <TableCell>
              <div className="flex items-center gap-2">
                {getRankIcon(entry.rank)}
                <span className="font-bold">#{entry.rank}</span>
              </div>
            </TableCell>
            <TableCell>
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
            </TableCell>
            <TableCell className="text-right">
              <span className="font-bold text-green-600">
                ${entry.totalRewards.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
})
