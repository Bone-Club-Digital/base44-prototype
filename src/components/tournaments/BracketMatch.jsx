import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Gamepad2, Play, RefreshCw, Trophy } from 'lucide-react';
import { TournamentMatch } from '@/entities/TournamentMatch';
import { startTournamentMatch } from '@/functions/startTournamentMatch';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function BracketMatch({ match, currentUserId, onUpdate }) {
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  const {
    player_1_id, player_1_username, player_1_ready,
    player_2_id, player_2_username, player_2_ready,
    status, winner_id
  } = match;

  const isPlayer1 = currentUserId === player_1_id;
  const isPlayer2 = currentUserId === player_2_id;
  const isParticipant = isPlayer1 || isPlayer2;
  const bothPlayersReady = player_1_ready && player_2_ready;

  const handleReadyClick = async () => {
    if (!isParticipant) return;
    setIsUpdating(true);
    setError('');
    try {
      const updatePayload = isPlayer1 ? { player_1_ready: true } : { player_2_ready: true };
      await TournamentMatch.update(match.id, updatePayload);
      onUpdate(); // Refresh the bracket data
    } catch (err) {
      console.error("Failed to set ready status:", err);
      setError("Failed to update status. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePlayClick = async () => {
    setIsUpdating(true);
    setError('');
    try {
      const { data } = await startTournamentMatch({ tournament_match_id: match.id });
      if (data.error) throw new Error(data.error);
      
      if (data.game_session_id) {
        navigate(createPageUrl(`Game?id=${data.game_session_id}`));
      } else {
        throw new Error("Could not start the game session.");
      }
    } catch (err) {
      console.error("Failed to start match:", err);
      setError(err.message || "Failed to start match. Please refresh and try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const renderPlayer = (playerId, username, isReady, isWinner) => (
    <div className={`flex items-center justify-between p-2 rounded ${isWinner ? 'bg-amber-200 font-bold' : 'bg-white/30'}`}>
      <span className="main-text truncate">{username || 'TBD'}</span>
      {isReady && status === 'scheduled' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
      {isWinner && <Trophy className="w-5 h-5 text-amber-500" />}
    </div>
  );

  return (
    <div className="bg-white/10 p-2 rounded-lg w-64 space-y-2">
      {renderPlayer(player_1_id, player_1_username, player_1_ready, winner_id === player_1_id)}
      {renderPlayer(player_2_id, player_2_username, player_2_ready, winner_id === player_2_id)}

      {status === 'scheduled' && isParticipant && (
        <div className="pt-2">
          {!bothPlayersReady && (
            <Button
              size="sm"
              className="w-full"
              style={{ backgroundColor: '#007e81', color: 'white' }}
              onClick={handleReadyClick}
              disabled={isUpdating || (isPlayer1 && player_1_ready) || (isPlayer2 && player_2_ready)}
            >
              {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              {isUpdating ? 'Updating...' : 'I am Ready'}
            </Button>
          )}

          {bothPlayersReady && (
            <Button
              size="sm"
              className="w-full"
              style={{ backgroundColor: '#f26222', color: 'white' }}
              onClick={handlePlayClick}
              disabled={isUpdating}
            >
              {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              {isUpdating ? 'Starting...' : 'Play Match'}
            </Button>
          )}
        </div>
      )}
      
      {status === 'in_progress' && (
        <Button size="sm" className="w-full" disabled>
          <Gamepad2 className="w-4 h-4 mr-2" /> Match in Progress
        </Button>
      )}

      {error && <p className="text-xs text-red-400 pt-1 text-center">{error}</p>}
    </div>
  );
}