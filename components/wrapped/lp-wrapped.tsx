'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, Calendar, Flame, DollarSign, Sparkles, ChevronLeft, ChevronRight, Star, Gift, Twitter } from 'lucide-react';

// Snowflake component
function Snowflake({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute text-white/80 pointer-events-none animate-snowfall select-none"
      style={style}
    >
      ❄
    </div>
  );
}

// Animated counter component
function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <>{prefix}{displayValue.toLocaleString()}{suffix}</>;
}

interface RecentReward {
  date: string;
  amount: number;
  timestamp: number;
}

interface WrappedStats {
  year: number;
  totalEarned: number;
  rewardCount: number;
  activeDays: number;
  bestDay: {
    date: string;
    earned: number;
  } | null;
  rank: number | null;
  totalLPs: number;
  percentile: number | null;
  streakDays: number;
  avgPerDay: number;
  avgPerReward: number;
  recentRewards: RecentReward[];
}

interface LPWrappedProps {
  walletAddress: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LPWrapped({ walletAddress, open, onOpenChange }: LPWrappedProps) {
  const [stats, setStats] = useState<WrappedStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  // Generate snowflakes only once
  const snowflakes = useMemo(() => {
    return Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 4 + Math.random() * 6,
      size: 0.5 + Math.random() * 0.7,
      opacity: 0.3 + Math.random() * 0.5,
    }));
  }, []);

  useEffect(() => {
    if (open && walletAddress) {
      fetchWrappedStats();
    }
  }, [open, walletAddress]);

  const fetchWrappedStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/user/wrapped?walletAddress=${walletAddress}&year=2025`);
      const data = await res.json();

      if (data.success) {
        setStats(data.stats);
        setCurrentSlide(0);
      } else {
        setError(data.error || 'Failed to load stats');
      }
    } catch (err) {
      setError('Failed to load your wrapped stats');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const slides = stats ? [
    // Slide 1: Total Earned
    {
      icon: <DollarSign className="h-8 w-8" />,
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-400',
      title: 'Total Earned',
      value: <AnimatedNumber value={stats.totalEarned} prefix="$" />,
      subtitle: `from ${stats.rewardCount} reward${stats.rewardCount !== 1 ? 's' : ''}`,
      bg: 'from-green-950 via-emerald-900 to-teal-950',
      glow: 'shadow-green-500/20',
    },
    // Slide 2: Active Days
    {
      icon: <Calendar className="h-8 w-8" />,
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
      title: 'Active Days',
      value: <AnimatedNumber value={stats.activeDays} />,
      subtitle: `$${stats.avgPerDay.toLocaleString()} avg per day`,
      bg: 'from-blue-950 via-indigo-900 to-violet-950',
      glow: 'shadow-blue-500/20',
    },
    // Slide 3: Rank
    {
      icon: <Trophy className="h-8 w-8" />,
      iconBg: 'bg-yellow-500/20',
      iconColor: 'text-yellow-400',
      title: 'Your Rank',
      value: stats.rank ? `#${stats.rank}` : 'Unranked',
      subtitle: stats.percentile
        ? `Top ${100 - stats.percentile}% of ${stats.totalLPs.toLocaleString()} LPs`
        : `${stats.totalLPs.toLocaleString()} total LPs`,
      bg: 'from-yellow-950 via-amber-900 to-orange-950',
      glow: 'shadow-yellow-500/20',
      special: stats.rank && stats.rank <= 10,
    },
    // Slide 4: Streak
    {
      icon: <Flame className="h-8 w-8" />,
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-400',
      title: 'Longest Streak',
      value: <><AnimatedNumber value={stats.streakDays} /> days</>,
      subtitle: 'consecutive days earning',
      bg: 'from-orange-950 via-red-900 to-rose-950',
      glow: 'shadow-orange-500/20',
    },
    // Slide 5: Best Day
    {
      icon: <Star className="h-8 w-8" />,
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
      title: 'Best Day',
      value: stats.bestDay ? <AnimatedNumber value={stats.bestDay.earned} prefix="$" /> : 'N/A',
      subtitle: stats.bestDay ? formatDate(stats.bestDay.date) : 'No rewards yet',
      bg: 'from-purple-950 via-fuchsia-900 to-pink-950',
      glow: 'shadow-purple-500/20',
    },
    // Slide 6: Average
    {
      icon: <TrendingUp className="h-8 w-8" />,
      iconBg: 'bg-teal-500/20',
      iconColor: 'text-teal-400',
      title: 'Avg Per Reward',
      value: `$${stats.avgPerReward.toFixed(2)}`,
      subtitle: 'keep stacking!',
      bg: 'from-teal-950 via-cyan-900 to-sky-950',
      glow: 'shadow-teal-500/20',
    },
    // Slide 7: Recent Rewards
    {
      icon: <Gift className="h-8 w-8" />,
      iconBg: 'bg-pink-500/20',
      iconColor: 'text-pink-400',
      title: 'Latest Rewards',
      isRecentRewards: true,
      bg: 'from-pink-950 via-rose-900 to-red-950',
      glow: 'shadow-pink-500/20',
    },
  ] : [];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setSlideDirection('right');
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setSlideDirection('left');
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToSlide = (index: number) => {
    setSlideDirection(index > currentSlide ? 'right' : 'left');
    setCurrentSlide(index);
  };

  const shareToTwitter = () => {
    const text = `🎁 My Polymarket Rewards Wrapped 2025

💰 $${stats?.totalEarned.toLocaleString()} earned
🏆 Rank #${stats?.rank || 'Unranked'}
🔥 ${stats?.streakDays} day streak
📅 ${stats?.activeDays} active days

Check yours at opt.markets 👀

@Polymarket @optmarkets`;

    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const copyToClipboard = async () => {
    const text = `My Polymarket Rewards Wrapped 2025:\n💰 $${stats?.totalEarned.toLocaleString()} earned\n🏆 Rank #${stats?.rank || 'Unranked'}\n🔥 ${stats?.streakDays} day streak\n\nCheck yours at opt.markets`;
    await navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden bg-transparent border-0 shadow-none">
        <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${slides[currentSlide]?.bg || 'from-gray-900 to-gray-800'} transition-all duration-700 ease-out shadow-2xl ${slides[currentSlide]?.glow || ''}`}>
          {/* Animated background overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent" />

          {/* Snowflakes */}
          {open && snowflakes.map((flake) => (
            <Snowflake
              key={flake.id}
              style={{
                left: `${flake.left}%`,
                animationDelay: `${flake.delay}s`,
                animationDuration: `${flake.duration}s`,
                fontSize: `${flake.size}rem`,
                opacity: flake.opacity,
              }}
            />
          ))}

          {/* Content */}
          <div className="relative z-10 p-6">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm mb-3">
                <span className="text-lg">🎄</span>
                <span className="text-xs font-medium text-white/90 uppercase tracking-wider">Year in Review</span>
                <span className="text-lg">🎄</span>
              </div>
              <h2 className="text-2xl font-bold text-white">
                Polymarket Wrapped Rewards
              </h2>
              <p className="text-white/50 text-sm mt-1">2025</p>
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-white"></div>
                  <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-white animate-pulse" />
                </div>
                <p className="mt-6 text-white/70 text-sm">Calculating your year...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-16">
                <p className="text-red-400 mb-4">{error}</p>
                <Button
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={fetchWrappedStats}
                >
                  Try Again
                </Button>
              </div>
            )}

            {stats && !loading && stats.totalEarned > 0 && (
              <>
                {/* Floating Twitter Share Button - Always visible like Spotify */}
                <button
                  onClick={shareToTwitter}
                  className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-2 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 text-white/90 hover:text-white transition-all text-sm font-medium backdrop-blur-sm"
                >
                  <Twitter className="h-4 w-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>

                {/* Stats Card */}
                <div
                  key={currentSlide}
                  className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/10 animate-fade-in"
                >
                  {/* Icon */}
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${slides[currentSlide]?.iconBg} ${slides[currentSlide]?.iconColor} mb-5`}>
                    {slides[currentSlide]?.icon}
                  </div>

                  {/* Title */}
                  <p className="text-white/60 text-xs uppercase tracking-[0.2em] mb-3">
                    {slides[currentSlide]?.title}
                  </p>

                  {/* Conditional rendering for recent rewards slide */}
                  {slides[currentSlide]?.isRecentRewards ? (
                    <div className="space-y-2">
                      {stats.recentRewards && stats.recentRewards.length > 0 ? (
                        stats.recentRewards.map((reward, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/5 border border-white/10"
                          >
                            <span className="text-white/70 text-sm">{formatDate(reward.date)}</span>
                            <span className="text-white font-semibold">${reward.amount.toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-white/50 text-sm">No recent rewards</p>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Value */}
                      <p className="text-5xl font-bold text-white mb-3 tracking-tight">
                        {slides[currentSlide]?.value}
                      </p>

                      {/* Subtitle */}
                      <p className="text-white/50 text-sm">
                        {slides[currentSlide]?.subtitle}
                      </p>
                    </>
                  )}

                  {/* Special badge for top ranks */}
                  {slides[currentSlide]?.special && (
                    <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-medium">
                      <Trophy className="h-3 w-3" />
                      Top 10 LP!
                    </div>
                  )}
                </div>

                {/* Progress dots */}
                <div className="flex justify-center gap-1.5 mt-6">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToSlide(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === currentSlide
                          ? 'bg-white w-8'
                          : 'bg-white/30 w-1.5 hover:bg-white/50'
                      }`}
                    />
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={prevSlide}
                    disabled={currentSlide === 0}
                    className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>

                  <div className="flex gap-2">
                    {currentSlide === slides.length - 1 ? (
                      <Button
                        onClick={() => onOpenChange(false)}
                        className="bg-white text-gray-900 hover:bg-white/90 font-medium px-6"
                      >
                        Done
                      </Button>
                    ) : (
                      <Button
                        onClick={nextSlide}
                        className="bg-white/10 text-white hover:bg-white/20 border border-white/20"
                      >
                        Next
                      </Button>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextSlide}
                    disabled={currentSlide === slides.length - 1}
                    className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </>
            )}

            {stats && stats.totalEarned === 0 && !loading && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-5">
                  <DollarSign className="h-8 w-8 text-white/50" />
                </div>
                <p className="text-white/80 mb-2 font-medium">No rewards earned yet</p>
                <p className="text-white/50 text-sm mb-6">Start providing liquidity to see your wrapped!</p>
                <Button
                  onClick={() => onOpenChange(false)}
                  className="bg-white/10 text-white hover:bg-white/20 border border-white/20"
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
