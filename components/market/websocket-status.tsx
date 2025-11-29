// components/market/websocket-status.tsx
'use client';

import { useWebSocketStatus } from '@/hooks/useWebSocket';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export function WebSocketStatus() {
  const { status, reconnectAttempts } = useWebSocketStatus();

  if (status === 'connected') {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <Wifi className="w-3 h-3 mr-1.5" />
        Live
      </Badge>
    );
  }

  if (status === 'connecting' || reconnectAttempts > 0) {
    return (
      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
        <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
        Connecting{reconnectAttempts > 0 && ` (${reconnectAttempts})`}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-gray-100 text-gray-600">
      <WifiOff className="w-3 h-3 mr-1.5" />
      Offline
    </Badge>
  );
}
