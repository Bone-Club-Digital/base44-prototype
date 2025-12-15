import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function GameConnectionStatus({ 
  isConnected, 
  opponentConnected, 
  opponentUsername, 
  isReconnecting 
}) {
  if (!isConnected || isReconnecting) {
    return (
      <Alert className="border-orange-500 bg-orange-50 mb-4">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <AlertDescription>
          {isReconnecting ? 'Reconnecting to game...' : 'Connecting to game server...'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!opponentConnected && opponentUsername) {
    return (
      <Alert className="border-red-500 bg-red-50 mb-4">
        <WifiOff className="h-4 w-4" />
        <AlertDescription>
          {opponentUsername} has lost connection to the game. Waiting for them to reconnect...
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-green-500 bg-green-50 mb-4">
      <Wifi className="h-4 w-4" />
      <AlertDescription>
        Both players connected to game server
      </AlertDescription>
    </Alert>
  );
}