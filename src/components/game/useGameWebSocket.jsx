import { useEffect, useState } from 'react';

export default function useGameWebSocket(gameId, user) {
  const [isConnected, setIsConnected] = useState(false);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [opponentUsername, setOpponentUsername] = useState('');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    if (!gameId || !user) {
      setIsConnected(false);
      setOpponentConnected(false);
      return;
    }

    // Simulate connection process
    setIsReconnecting(true);
    
    const connectTimer = setTimeout(() => {
      console.log('[GameConnection] Simulated connection established');
      setIsConnected(true);
      setIsReconnecting(false);
      setConnectionError(null);
      
      // Simulate opponent detection after a short delay
      const opponentTimer = setTimeout(() => {
        setOpponentConnected(true);
        setOpponentUsername('Opponent');
      }, 2000);

      return () => clearTimeout(opponentTimer);
    }, 1000);

    return () => {
      clearTimeout(connectTimer);
      setIsConnected(false);
      setOpponentConnected(false);
      setIsReconnecting(false);
    };
  }, [gameId, user]);

  return {
    isConnected,
    opponentConnected,
    opponentUsername,
    isReconnecting,
    connectionError,
  };
}