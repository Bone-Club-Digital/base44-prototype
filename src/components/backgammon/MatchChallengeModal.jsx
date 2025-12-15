
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Clock, Trophy, Video, Coins, Star } from 'lucide-react'; // Added Star
import { setPlayerReadyAndStartGame } from '@/functions/setPlayerReadyAndStartGame';
// REMOVED: import { debugGameSessionIssue } from '@/functions/debugGameSessionIssue';

export default function MatchChallengeModal({ gameSession, playerInfo, user, onCancel, isActionInProgress }) {
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Check if current user is already ready
  useEffect(() => {
    if (gameSession && user) {
      const isPlayerTeal = gameSession.player_teal_id === user.id;
      const isPlayerBone = gameSession.player_bone_id === user.id;
      
      if (isPlayerTeal) {
        setIsReady(gameSession.match_state?.player_teal_ready || false);
      } else if (isPlayerBone) {
        setIsReady(gameSession.match_state?.player_bone_ready || false);
      }
    }
  }, [gameSession, user]);

  if (!gameSession || !user) return null;

  const isPlayerTeal = gameSession.player_teal_id === user.id;
  const isPlayerBone = gameSession.player_bone_id === user.id;
  const isParticipant = isPlayerTeal || isPlayerBone;

  // If user is not a participant in this game, they shouldn't see this modal
  if (!isParticipant) {
    return null;
  }

  const opponentReady = isPlayerTeal 
    ? gameSession.match_state?.player_bone_ready 
    : gameSession.match_state?.player_teal_ready;

  const bothReady = gameSession.match_state?.player_teal_ready && gameSession.match_state?.player_bone_ready;

  const handleReady = async () => {
    if (isProcessing || isReady || isActionInProgress) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      console.log('Setting player ready for game:', gameSession.id);
      
      // Removed debugging call:
      // console.log('Running debug check first...');
      // const { data: debugData } = await debugGameSessionIssue({ gameId: gameSession.id });
      // console.log('Debug results:', debugData);
      
      const { data: updatedGame, error: functionError } = await setPlayerReadyAndStartGame({ 
        gameId: gameSession.id 
      });

      // Updated error handling
      if (functionError || (updatedGame && updatedGame.error)) {
        throw new Error(functionError || updatedGame.error.details || updatedGame.error);
      }
      
      setIsReady(true);
      // The parent component will handle the transition via WebSocket updates.
      // Removed explicit logging and status check as the parent component handles the game start
    } catch (err) {
      console.error('Error setting player ready:', err);
      setError(err.message || 'Failed to ready up. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatMatchSettings = (matchState) => {
    if (!matchState) return 'Standard Match';
    
    const parts = [];
    if (matchState.target_score) parts.push(`${matchState.target_score}-point match`);
    if (matchState.is_rated === false) { // Check for explicitly false
        parts.push('Unrated');
    } else if (matchState.is_rated === true) {
        parts.push('Rated');
    }
    if (matchState.use_clock) parts.push('Timed');
    if (matchState.use_video_chat) parts.push('Video chat');
    
    return parts.length > 0 ? parts.join(', ') : 'Standard Match';
  };

  const getPlayerName = (playerId) => {
    if (playerId === gameSession.player_teal_id) {
      return playerInfo.tealPlayer?.username || 'Player';
    } else if (playerId === gameSession.player_bone_id) {
      return playerInfo.bonePlayer?.username || 'Player';
    }
    return 'Unknown';
  };

  const getPlayerRating = (playerId) => {
    if (playerId === gameSession.player_teal_id) {
      return playerInfo.tealPlayer?.rating || 1500;
    } else if (playerId === gameSession.player_bone_id) {
      return playerInfo.bonePlayer?.rating || 1500;
    }
    return 1500;
  };

  const getProfilePicture = (playerId) => {
    if (playerId === gameSession.player_teal_id) {
      return playerInfo.tealPlayer?.profile_picture_url;
    } else if (playerId === gameSession.player_bone_id) {
      return playerInfo.bonePlayer?.profile_picture_url;
    }
    return null;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-2xl"
        >
          <Card className="tool-card-bg border-0 elegant-shadow">
            <CardHeader className="text-center pb-4">
              <CardTitle className="main-text text-2xl font-bold">
                Match Challenge
              </CardTitle>
              <p className="main-text opacity-70">
                {formatMatchSettings(gameSession.match_state)}
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* Players Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Player 1 */}
                <div className="flex items-center space-x-4 p-4 bg-white/50 rounded-lg">
                  <div className="relative">
                    {getProfilePicture(gameSession.player_teal_id) ? (
                      <img
                        src={getProfilePicture(gameSession.player_teal_id)}
                        alt={getPlayerName(gameSession.player_teal_id)}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[#007e81] flex items-center justify-center">
                        <User className="w-8 h-8 text-white" />
                      </div>
                    )}
                    {gameSession.match_state?.player_teal_ready && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold main-text">
                      {getPlayerName(gameSession.player_teal_id)}
                    </p>
                    <p className="text-sm main-text opacity-70">
                      Rating: {getPlayerRating(gameSession.player_teal_id)}
                    </p>
                    <Badge 
                      className={gameSession.match_state?.player_teal_ready ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                    >
                      {gameSession.match_state?.player_teal_ready ? 'Ready' : 'Waiting...'}
                    </Badge>
                  </div>
                </div>

                {/* Player 2 */}
                <div className="flex items-center space-x-4 p-4 bg-white/50 rounded-lg">
                  <div className="relative">
                    {getProfilePicture(gameSession.player_bone_id) ? (
                      <img
                        src={getProfilePicture(gameSession.player_bone_id)}
                        alt={getPlayerName(gameSession.player_bone_id)}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[#5a3217] flex items-center justify-center">
                        <User className="w-8 h-8 text-white" />
                      </div>
                    )}
                    {gameSession.match_state?.player_bone_ready && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold main-text">
                      {getPlayerName(gameSession.player_bone_id)}
                    </p>
                    <p className="text-sm main-text opacity-70">
                      Rating: {getPlayerRating(gameSession.player_bone_id)}
                    </p>
                    <Badge 
                      className={gameSession.match_state?.player_bone_ready ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                    >
                      {gameSession.match_state?.player_bone_ready ? 'Ready' : 'Waiting...'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Match Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-white/30 rounded-lg">
                  <Trophy className="w-6 h-6 mx-auto mb-1 main-text" />
                  <p className="text-sm font-semibold main-text">
                    {gameSession.match_state?.target_score || 1} Points
                  </p>
                </div>
                
                {gameSession.match_state?.use_clock && (
                  <div className="p-3 bg-white/30 rounded-lg">
                    <Clock className="w-6 h-6 mx-auto mb-1 main-text" />
                    <p className="text-sm font-semibold main-text">Timed</p>
                  </div>
                )}
                
                {gameSession.match_state?.use_video_chat && (
                  <div className="p-3 bg-white/30 rounded-lg">
                    <Video className="w-6 h-6 mx-auto mb-1 main-text" />
                    <p className="text-sm font-semibold main-text">Video Chat</p>
                  </div>
                )}
                
                {gameSession.bones_stake > 0 && (
                  <div className="p-3 bg-white/30 rounded-lg">
                    <Coins className="w-6 h-6 mx-auto mb-1 main-text" />
                    <p className="text-sm font-semibold main-text">
                      {gameSession.bones_stake} Bones
                    </p>
                  </div>
                )}

                {gameSession.match_state?.is_rated !== undefined && (
                    <div className="p-3 bg-white/30 rounded-lg">
                        <Star className={`w-6 h-6 mx-auto mb-1 main-text ${!gameSession.match_state.is_rated ? 'opacity-30' : 'text-yellow-400'}`} />
                        <p className="text-sm font-semibold main-text">
                            {gameSession.match_state.is_rated ? 'Rated' : 'Unrated'}
                        </p>
                    </div>
                )}
              </div>

              {/* Ready Status */}
              {bothReady ? (
                <div className="text-center p-4 bg-green-100 rounded-lg">
                  <p className="text-green-800 font-semibold text-lg">
                    Both players ready! Starting match...
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="main-text mb-4">
                    {opponentReady 
                      ? "Your opponent is ready! Click Ready to start the match."
                      : isReady 
                        ? "You are ready. Waiting for your opponent..."
                        : "Click Ready when you're prepared to start the match."
                    }
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                {!isReady && (
                  <Button
                    onClick={handleReady}
                    disabled={isProcessing || isActionInProgress}
                    className="px-8 py-3 text-lg font-bold"
                    style={{ backgroundColor: '#007e81', color: 'white' }}
                  >
                    {isProcessing ? 'Getting Ready...' : 'READY'}
                  </Button>
                )}

                <Button
                  onClick={onCancel}
                  variant="outline"
                  disabled={isProcessing || isActionInProgress}
                  className="px-8 py-3 text-lg font-bold"
                >
                  Cancel Match
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
