// components/portfolio/portfolio-skeleton.tsx
// Loading skeleton for portfolio page

import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function PortfolioSkeleton() {
  return (
    <div className="space-y-6">
      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 animate-pulse">
          <CardHeader>
            <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>

      {/* Positions Skeleton */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[...Array(5)].map((_, j) => (
                  <div key={j}>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
