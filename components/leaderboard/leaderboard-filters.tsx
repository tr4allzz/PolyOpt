'use client'

import { Search, Filter, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState, useEffect, useCallback } from 'react'

export interface FilterValues {
  search: string
  minRewards: string
  maxRewards: string
  minPayouts: string
  rankRange: string
  sortBy: string
  sortOrder: string
}

interface LeaderboardFiltersProps {
  filters: FilterValues
  onFilterChange: (filters: FilterValues) => void
  onReset: () => void
}

export function LeaderboardFilters({
  filters,
  onFilterChange,
  onReset
}: LeaderboardFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [searchInput, setSearchInput] = useState(filters.search)

  const hasActiveFilters = filters.search || filters.minRewards || filters.maxRewards || filters.minPayouts || filters.rankRange || filters.sortBy || filters.sortOrder

  // Sync searchInput when filters.search changes externally (e.g., reset)
  useEffect(() => {
    if (filters.search !== searchInput) {
      setSearchInput(filters.search)
    }
  }, [filters.search])

  // Debounce search input - only trigger when searchInput changes
  useEffect(() => {
    // Don't trigger if already synced
    if (searchInput === filters.search) return

    const timer = setTimeout(() => {
      onFilterChange({ ...filters, search: searchInput })
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
  }

  const handleMinRewardsChange = (value: string) => {
    onFilterChange({ ...filters, minRewards: value === 'all' ? '' : value })
  }

  const handleMinPayoutsChange = (value: string) => {
    onFilterChange({ ...filters, minPayouts: value === 'all' ? '' : value })
  }

  const handleMaxRewardsChange = (value: string) => {
    onFilterChange({ ...filters, maxRewards: value === 'all' ? '' : value })
  }

  const handleRankRangeChange = (value: string) => {
    onFilterChange({ ...filters, rankRange: value === 'all' ? '' : value })
  }

  const handleSortByChange = (value: string) => {
    onFilterChange({ ...filters, sortBy: value === 'default' ? '' : value })
  }

  const handleSortOrderChange = (value: string) => {
    onFilterChange({ ...filters, sortOrder: value === 'default' ? '' : value })
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by wallet address..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showFilters ? "secondary" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {[filters.minRewards, filters.maxRewards, filters.minPayouts, filters.rankRange, filters.sortBy, filters.sortOrder].filter(Boolean).length}
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={onReset}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
          {/* Rank Range */}
          <div className="space-y-2">
            <Label htmlFor="rankRange">Rank Range</Label>
            <Select
              value={filters.rankRange || 'all'}
              onValueChange={handleRankRangeChange}
            >
              <SelectTrigger id="rankRange">
                <SelectValue placeholder="All ranks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ranks</SelectItem>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="50">Top 50</SelectItem>
                <SelectItem value="100">Top 100</SelectItem>
                <SelectItem value="500">Top 500</SelectItem>
                <SelectItem value="1000">Top 1,000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Min Rewards */}
          <div className="space-y-2">
            <Label htmlFor="minRewards">Minimum Rewards ($)</Label>
            <Select
              value={filters.minRewards || 'all'}
              onValueChange={handleMinRewardsChange}
            >
              <SelectTrigger id="minRewards">
                <SelectValue placeholder="Any amount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any amount</SelectItem>
                <SelectItem value="100">$100+</SelectItem>
                <SelectItem value="500">$500+</SelectItem>
                <SelectItem value="1000">$1,000+</SelectItem>
                <SelectItem value="5000">$5,000+</SelectItem>
                <SelectItem value="10000">$10,000+</SelectItem>
                <SelectItem value="50000">$50,000+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Max Rewards */}
          <div className="space-y-2">
            <Label htmlFor="maxRewards">Maximum Rewards ($)</Label>
            <Select
              value={filters.maxRewards || 'all'}
              onValueChange={handleMaxRewardsChange}
            >
              <SelectTrigger id="maxRewards">
                <SelectValue placeholder="No limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">No limit</SelectItem>
                <SelectItem value="1000">Under $1,000</SelectItem>
                <SelectItem value="5000">Under $5,000</SelectItem>
                <SelectItem value="10000">Under $10,000</SelectItem>
                <SelectItem value="50000">Under $50,000</SelectItem>
                <SelectItem value="100000">Under $100,000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Min Payouts */}
          <div className="space-y-2">
            <Label htmlFor="minPayouts">Minimum Payouts</Label>
            <Select
              value={filters.minPayouts || 'all'}
              onValueChange={handleMinPayoutsChange}
            >
              <SelectTrigger id="minPayouts">
                <SelectValue placeholder="Any number" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any number</SelectItem>
                <SelectItem value="5">5+ payouts</SelectItem>
                <SelectItem value="10">10+ payouts</SelectItem>
                <SelectItem value="20">20+ payouts</SelectItem>
                <SelectItem value="50">50+ payouts</SelectItem>
                <SelectItem value="100">100+ payouts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <Label htmlFor="sortBy">Sort By</Label>
            <Select
              value={filters.sortBy || 'default'}
              onValueChange={handleSortByChange}
            >
              <SelectTrigger id="sortBy">
                <SelectValue placeholder="Default (Rank)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (Rank)</SelectItem>
                <SelectItem value="rewards">Total Rewards</SelectItem>
                <SelectItem value="payouts">Payout Count</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <div className="space-y-2">
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Select
              value={filters.sortOrder || 'default'}
              onValueChange={handleSortOrderChange}
            >
              <SelectTrigger id="sortOrder">
                <SelectValue placeholder="High to Low" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">High to Low</SelectItem>
                <SelectItem value="asc">Low to High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}
