// components/social/market-commentary.tsx
'use client';

import { useMarketCommentary } from '@/hooks/useWebSocket';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MarketCommentaryProps {
  marketId?: string;
  showAll?: boolean;
}

export function MarketCommentary({ marketId, showAll = false }: MarketCommentaryProps) {
  const { comments, isConnected } = useMarketCommentary(marketId);

  // Filter comments relevant to LPs
  const relevantComments = comments.filter((comment) => {
    // Look for keywords related to liquidity provision
    const text = comment.text?.toLowerCase() || '';
    const keywords = [
      'liquidity',
      'spread',
      'order',
      'market maker',
      'reward',
      'q-score',
      'whale',
      'bid',
      'ask',
    ];
    return keywords.some((keyword) => text.includes(keyword));
  });

  const displayComments = showAll ? comments : relevantComments;

  const getCommentType = (comment: any) => {
    const text = comment.text?.toLowerCase() || '';

    if (text.includes('whale') || text.includes('large')) {
      return { icon: TrendingUp, color: 'text-yellow-600', label: 'Whale Activity' };
    }
    if (text.includes('liquidity') || text.includes('spread')) {
      return { icon: AlertCircle, color: 'text-blue-600', label: 'LP Related' };
    }
    return { icon: MessageSquare, color: 'text-gray-600', label: 'Discussion' };
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          Market Commentary
          {!marketId && <span className="text-sm text-gray-500">(All Markets)</span>}
        </h3>
        {isConnected ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse" />
            Live
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-gray-50 text-gray-700">
            <Activity className="w-3 h-3 mr-1.5 animate-pulse" />
            Connecting...
          </Badge>
        )}
      </div>

      {/* Filter toggle */}
      {!showAll && relevantComments.length < comments.length && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-800">
            📊 Showing only LP-relevant commentary ({relevantComments.length} of{' '}
            {comments.length} messages)
          </p>
        </div>
      )}

      {/* Comments feed */}
      {displayComments.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {displayComments.map((comment, index) => {
            const type = getCommentType(comment);
            const timestamp = comment.timestamp ? new Date(comment.timestamp) : new Date();

            return (
              <div
                key={index}
                className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className={`w-8 h-8 rounded-full bg-white flex items-center justify-center ${type.color}`}
                  >
                    <type.icon className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {type.label}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(timestamp, { addSuffix: true })}
                      </span>
                    </div>

                    {/* Comment text */}
                    {comment.text && (
                      <p className="text-sm text-gray-700 break-words">{comment.text}</p>
                    )}

                    {/* Metadata */}
                    {comment.user && (
                      <div className="mt-2 text-xs font-mono text-gray-500">
                        {comment.user.slice(0, 6)}...{comment.user.slice(-4)}
                      </div>
                    )}

                    {/* Market context */}
                    {comment.market && comment.marketName && (
                      <div className="mt-2 text-xs text-gray-600 truncate">
                        📊 {comment.marketName}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-3 animate-pulse" />
          <p className="text-sm">Waiting for market commentary...</p>
          <p className="text-xs mt-1">
            {!showAll
              ? 'LP-relevant discussions will appear here'
              : 'Live commentary will stream here'}
          </p>
        </div>
      )}

      {/* Info footer */}
      <div className="mt-4 pt-4 border-t">
        <p className="text-xs text-gray-500 flex items-center gap-2">
          <AlertCircle className="w-3 h-3" />
          Commentary is pulled from Polymarket's live data stream. Use this to gauge market
          sentiment and identify LP opportunities.
        </p>
      </div>
    </Card>
  );
}
