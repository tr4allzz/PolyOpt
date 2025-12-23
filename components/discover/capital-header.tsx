'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  DollarSign,
  SlidersHorizontal,
  Loader2,
  TrendingUp,
} from 'lucide-react';

interface CapitalHeaderProps {
  capital: string;
  onCapitalChange: (capital: string) => void;
  onSearch: () => void;
  loading: boolean;
  resultsCount?: number;
  sortBy: string;
  onSortChange: (sort: string) => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
}

const PRESET_AMOUNTS = [100, 500, 1000, 5000];

const SORT_OPTIONS = [
  { value: 'reward', label: 'Daily Reward' },
  { value: 'apy', label: 'APY' },
  { value: 'pool', label: 'Reward Pool' },
  { value: 'competition', label: 'Low Competition' },
];

export function CapitalHeader({
  capital,
  onCapitalChange,
  onSearch,
  loading,
  resultsCount,
  sortBy,
  onSortChange,
  showFilters,
  onToggleFilters,
}: CapitalHeaderProps) {
  const handlePresetClick = (amount: number) => {
    onCapitalChange(amount.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      {/* Main Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Capital Input */}
        <div className="flex-1 space-y-2">
          <Label htmlFor="capital" className="text-sm font-medium">
            Capital to Deploy
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="capital"
                type="number"
                placeholder="Enter amount..."
                value={capital}
                onChange={(e) => onCapitalChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
              />
            </div>
            <Button
              onClick={onSearch}
              disabled={loading || !capital || parseFloat(capital) <= 0}
              className="px-6"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Find
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Sort & Filter */}
        <div className="flex gap-2 items-end">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Sort By</Label>
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {onToggleFilters && (
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              onClick={onToggleFilters}
              className="h-10"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Quick select:</span>
        {PRESET_AMOUNTS.map((amount) => (
          <Button
            key={amount}
            variant={capital === amount.toString() ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => handlePresetClick(amount)}
            className="h-7 text-xs"
          >
            ${amount.toLocaleString()}
          </Button>
        ))}
      </div>

      {/* Results Count */}
      {resultsCount !== undefined && resultsCount > 0 && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <span className="text-sm">
            Found <Badge variant="secondary">{resultsCount}</Badge> opportunities
          </span>
        </div>
      )}
    </div>
  );
}
