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
  minPayouts: string
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

  const hasActiveFilters = filters.search || filters.minRewards || filters.minPayouts

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFilterChange({ ...filters, search: searchInput })
      }
    }, 300) // 300ms delay

    return () => clearTimeout(timer)
  }, [searchInput])

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
  }

  const handleMinRewardsChange = (value: string) => {
    onFilterChange({ ...filters, minRewards: value })
  }

  const handleMinPayoutsChange = (value: string) => {
    onFilterChange({ ...filters, minPayouts: value })
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
              {[filters.minRewards, filters.minPayouts].filter(Boolean).length}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
          <div className="space-y-2">
            <Label htmlFor="minRewards">Minimum Total Rewards ($)</Label>
            <Select
              value={filters.minRewards}
              onValueChange={handleMinRewardsChange}
            >
              <SelectTrigger id="minRewards">
                <SelectValue placeholder="Any amount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any amount</SelectItem>
                <SelectItem value="100">$100+</SelectItem>
                <SelectItem value="500">$500+</SelectItem>
                <SelectItem value="1000">$1,000+</SelectItem>
                <SelectItem value="5000">$5,000+</SelectItem>
                <SelectItem value="10000">$10,000+</SelectItem>
                <SelectItem value="50000">$50,000+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minPayouts">Minimum Number of Payouts</Label>
            <Select
              value={filters.minPayouts}
              onValueChange={handleMinPayoutsChange}
            >
              <SelectTrigger id="minPayouts">
                <SelectValue placeholder="Any number" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any number</SelectItem>
                <SelectItem value="5">5+ payouts</SelectItem>
                <SelectItem value="10">10+ payouts</SelectItem>
                <SelectItem value="20">20+ payouts</SelectItem>
                <SelectItem value="50">50+ payouts</SelectItem>
                <SelectItem value="100">100+ payouts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}
