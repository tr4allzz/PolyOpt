'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Loader2, TrendingUp, DollarSign, Users, Target, Filter, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface MarketOpportunity {
  marketId: string;
  question: string;
  rewardPool: number;
  estimatedCompetition: number;
  estimatedDailyReward: number;
  capitalEfficiency: number;
  roi: number;
  competitionLevel: 'Low' | 'Medium' | 'High';
  recommendedCapital: number;
}

export default function RecommendedMarketsPage() {
  const [capital, setCapital] = useState(100);
  const [opportunities, setOpportunities] = useState<MarketOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [maxCapital, setMaxCapital] = useState<number>(1000);
  const [minROI, setMinROI] = useState<number>(0);
  const [competitionLevel, setCompetitionLevel] = useState<string>('all');
  const [minRewardPool, setMinRewardPool] = useState<number>(0);
  const [useRealCompetition, setUseRealCompetition] = useState(false);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (maxCapital > 0) filters.maxCapital = maxCapital;
      if (minROI > 0) filters.minROI = minROI;
      if (competitionLevel !== 'all') filters.competitionLevel = competitionLevel;
      if (minRewardPool > 0) filters.minRewardPool = minRewardPool;

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capital,
          limit: 20,
          useRealCompetition,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
        }),
      });

      const data = await response.json();
      setOpportunities(data.opportunities || []);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const getCompetitionColor = (level: string) => {
    switch (level) {
      case 'Low': return 'bg-green-500';
      case 'Medium': return 'bg-yellow-500';
      case 'High': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Recommended Markets</h1>
        <p className="text-gray-600">
          Find the best opportunities for your capital. We analyze competition and ROI to help you maximize rewards.
        </p>
      </div>

      {/* Capital Input & Filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Capital & Filters</CardTitle>
          <CardDescription>
            Enter your available capital and set filters to find the best markets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Capital Input */}
          <div>
            <Label htmlFor="capital">Available Capital ($)</Label>
            <div className="flex gap-4 mt-2">
              <Input
                id="capital"
                type="number"
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value))}
                min={10}
                max={1000000}
                className="flex-1"
              />
              <Button onClick={fetchOpportunities} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Find Opportunities
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              We'll find markets where ${capital} can earn meaningful rewards
            </p>
          </div>

          {/* Filter Toggle */}
          <div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full"
            >
              <Filter className="mr-2 h-4 w-4" />
              {showFilters ? 'Hide' : 'Show'} Advanced Filters
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <div>
                <Label htmlFor="maxCapital">Max Recommended Capital (${maxCapital})</Label>
                <Slider
                  id="maxCapital"
                  min={10}
                  max={5000}
                  step={10}
                  value={[maxCapital]}
                  onValueChange={([value]) => setMaxCapital(value)}
                  className="mt-2"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Only show markets where you need ≤ ${maxCapital} to be competitive
                </p>
              </div>

              <div>
                <Label htmlFor="minROI">Minimum ROI (% APY) ({minROI}%)</Label>
                <Slider
                  id="minROI"
                  min={0}
                  max={10000}
                  step={100}
                  value={[minROI]}
                  onValueChange={([value]) => setMinROI(value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="competitionLevel">Competition Level</Label>
                <Select value={competitionLevel} onValueChange={setCompetitionLevel}>
                  <SelectTrigger id="competitionLevel" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="Low">Low Competition</SelectItem>
                    <SelectItem value="Medium">Medium Competition</SelectItem>
                    <SelectItem value="High">High Competition</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="minRewardPool">Min Reward Pool ($/day) ({minRewardPool})</Label>
                <Slider
                  id="minRewardPool"
                  min={0}
                  max={100}
                  step={5}
                  value={[minRewardPool]}
                  onValueChange={([value]) => setMinRewardPool(value)}
                  className="mt-2"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useRealCompetition"
                  checked={useRealCompetition}
                  onChange={(e) => setUseRealCompetition(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="useRealCompetition" className="font-normal">
                  Use real competition data (slower but more accurate)
                </Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : opportunities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No opportunities found. Try adjusting your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              {opportunities.length} Opportunities Found
            </h2>
            <p className="text-sm text-gray-500">
              Best ROI: {opportunities[0]?.roi.toFixed(0)}% APY
            </p>
          </div>

          {opportunities.map((opp, index) => (
            <Card key={opp.marketId} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono">
                        #{index + 1}
                      </Badge>
                      <Badge className={getCompetitionColor(opp.competitionLevel)}>
                        {opp.competitionLevel} Competition
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{opp.question}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="flex items-center text-sm text-gray-500 mb-1">
                      <DollarSign className="h-4 w-4 mr-1" />
                      Your Daily
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      ${opp.estimatedDailyReward.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      ${(opp.estimatedDailyReward * 30).toFixed(0)}/mo
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center text-sm text-gray-500 mb-1">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      ROI
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {opp.roi.toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500">APY</div>
                  </div>

                  <div>
                    <div className="flex items-center text-sm text-gray-500 mb-1">
                      <Users className="h-4 w-4 mr-1" />
                      Competition
                    </div>
                    <div className="text-2xl font-bold">
                      {opp.estimatedCompetition.toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-500">Q_min total</div>
                  </div>

                  <div>
                    <div className="flex items-center text-sm text-gray-500 mb-1">
                      <Target className="h-4 w-4 mr-1" />
                      Pool
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${opp.rewardPool}
                    </div>
                    <div className="text-xs text-gray-500">/day</div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    {capital >= opp.recommendedCapital ? (
                      <span className="text-green-600">
                        ✓ Your ${capital} is sufficient
                      </span>
                    ) : (
                      <span className="text-yellow-600">
                        ⚠ Recommended: ${opp.recommendedCapital.toFixed(0)}
                      </span>
                    )}
                  </div>
                  <Link href={`/markets/${opp.marketId}`}>
                    <Button>View Market</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
