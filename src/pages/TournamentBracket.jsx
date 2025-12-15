
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../components/auth/UserProvider';
import { Tournament } from '@/entities/Tournament';
import { TournamentParticipant } from '@/entities/TournamentParticipant';
import { TournamentMatch } from '@/entities/TournamentMatch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, ArrowLeft, Trophy, Crown, AlertCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import Bracket from '../components/tournaments/Bracket';
import { generateBracket } from '@/functions/generateBracket'; // Direct import

export default function TournamentBracketPage() {
  const { user, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [matchesByRound, setMatchesByRound] = useState({});
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingBracket, setGeneratingBracket] = useState(false);
  const [error, setError] = useState(null); // Added error state for display
  // Removed pollInterval.current as useEffect will manage interval directly

  const tournamentId = new URLSearchParams(location.search).get('id');

  const fetchBracketData = useCallback(async () => {
    if (!tournamentId) {
      setError("No tournament ID provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('[pages/TournamentBracket.js]', 'Fetching bracket data for tournament:', tournamentId);
      
      const [tournamentData, participantsData, matchesData] = await Promise.all([
        Tournament.get(tournamentId),
        TournamentParticipant.filter({ tournament_id: tournamentId }),
        TournamentMatch.filter({ tournament_id: tournamentId }, 'round', 100), // Kept original filtering parameters
      ]);

      if (!tournamentData) {
          throw new Error("Tournament not found");
      }

      console.log('[pages/TournamentBracket.js]', 'Tournament data:', tournamentData);
      console.log('[pages/TournamentBracket.js]', 'Current user:', user);
      console.log('[pages/TournamentBracket.js]', 'Tournament admin_user_id:', tournamentData.admin_user_id);
      console.log('[pages/TournamentBracket.js]', 'Current user ID:', user?.id);
      console.log('[pages/TournamentBracket.js]', 'Is admin?', tournamentData.admin_user_id === user?.id);

      // *** NEW: Check if user has an active match that started ***
      if (user && matchesData) {
        const userActiveMatch = matchesData.find(match => 
          (match.player_1_id === user.id || match.player_2_id === user.id) &&
          match.status === 'in_progress' &&
          match.game_session_id
        );
        
        if (userActiveMatch) {
          console.log('[pages/TournamentBracket.js]', 'User has active match, redirecting to game:', userActiveMatch.game_session_id);
          setLoading(false); // Set loading to false before navigating
          navigate(createPageUrl(`Game?id=${userActiveMatch.game_session_id}`));
          return; // Exit early to prevent further processing
        }
      }

      setTournament(tournamentData);
      setParticipants(participantsData || []);
      setMatches(matchesData || []);

      const groupedMatches = (matchesData || []).reduce((acc, match) => {
        const round = match.round;
        if (!acc[round]) acc[round] = [];
        acc[round].push(match);
        return acc;
      }, {});
      
      const sortedGroupedMatches = {};
      Object.keys(groupedMatches).sort((a,b) => parseInt(a) - parseInt(b)).forEach(key => {
          sortedGroupedMatches[key] = groupedMatches[key].sort((a,b) => a.match_number_in_round - b.match_number_in_round);
      });

      setMatchesByRound(sortedGroupedMatches);
      setError(null); // Clear any previous errors on successful fetch

    } catch (error) {
      console.error('[pages/TournamentBracket.js]', "Error fetching bracket data:", error);
      setTournament(null); // Clear tournament if there's an error
      setError("Failed to load tournament data. " + (error.message || '')); // Set specific error message
    } finally {
      setLoading(false); // Ensure loading is false regardless of success or failure
    }
  }, [tournamentId, navigate, user]); // Added user to dependencies

  useEffect(() => {
    fetchBracketData();

    // *** INCREASED POLLING FREQUENCY for better real-time experience ***
    const interval = setInterval(fetchBracketData, 5000); // Check every 5 seconds instead of 30

    return () => {
      clearInterval(interval);
    };
  }, [fetchBracketData]);

  const handleGenerateBracket = async () => {
    if (!window.confirm('Are you sure you want to generate the bracket? This action cannot be undone.')) {
      return;
    }

    setGeneratingBracket(true);
    try {
      const response = await generateBracket({ tournament_id: tournamentId });
      
      if (response?.data?.success) {
        alert('Bracket generated successfully!');
        await fetchBracketData();
      } else {
        throw new Error(response?.data?.error || 'An unknown error occurred during bracket generation.');
      }
    } catch (error) {
      console.error('Error generating bracket:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Please try again.';
      alert(`Failed to generate bracket: ${errorMessage}`);
    } finally {
      setGeneratingBracket(false);
    }
  };

  const handleNavigateToMatch = (gameSessionId) => {
    if (gameSessionId) {
      navigate(createPageUrl(`Game?id=${gameSessionId}`));
    }
  };

  const isAdmin = user && tournament && user.id === tournament.admin_user_id;
  const winner = participants.find(p => p.status === 'winner');
  const acceptedParticipantsCount = participants.filter(p => p.status === 'accepted').length;
  const canGenerateBracket = isAdmin && tournament?.status === 'registration_open' && acceptedParticipantsCount > 0;

  if (loading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <RefreshCw className="w-12 h-12 animate-spin main-text" />
      </div>
    );
  }

  if (!tournament || error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center" style={{ backgroundColor: '#e5e4cd' }}>
        <div>
            <h1 className="text-2xl font-bold main-text">{error ? "Error Loading Tournament" : "Tournament Not Found"}</h1>
            <p className="main-text opacity-70 mb-4">{error || "The tournament you are looking for does not exist or failed to load."}</p>
            <Button onClick={() => navigate(createPageUrl('Clubs'))}>
                <ArrowLeft className="w-4 h-4 mr-2"/>
                Back to Clubs
            </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 pb-16" style={{ backgroundColor: '#e5e4cd' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          {tournament.club_id && (
            <Button variant="outline" size="sm" onClick={() => navigate(createPageUrl(`ClubDetails?id=${tournament.club_id}`))}>
                <ArrowLeft className="w-4 h-4 mr-2"/>
                Back to Club
            </Button>
          )}
        </div>
        
        <div className="text-center mb-8">
            <Trophy className="w-12 h-12 mx-auto main-text mb-2" />
            <h1 className="text-4xl font-bold main-text">{tournament.name}</h1>
            <p className="main-text opacity-70 mt-2">{tournament.description}</p>
            {user && (
              <div className="mt-2 text-xs main-text opacity-50">
                Debug: User ID = {user.id}, Admin ID = {tournament.admin_user_id}, Is Admin = {isAdmin ? 'YES' : 'NO'}
              </div>
            )}
        </div>

        {winner && (
          <Card className="max-w-md mx-auto mb-8 bg-amber-100 border-amber-300">
            <CardHeader className="text-center">
              <Crown className="w-10 h-10 mx-auto text-amber-500 mb-2" />
              <CardTitle className="text-amber-800">Tournament Winner!</CardTitle>
              <p className="text-2xl font-bold text-amber-900">{winner.username}</p>
            </CardHeader>
          </Card>
        )}

        <div className="overflow-x-auto p-4">
            <div className="flex items-start gap-12 min-w-max">
            {matches.length > 0 ? (
                <Bracket 
                  matches={matches} 
                  participants={participants}
                  currentUserId={user?.id} 
                  onUpdate={fetchBracketData}
                  onNavigate={handleNavigateToMatch}
                />
            ) : (
                <div className="w-full flex justify-center">
                    <Card className="tool-card-bg border-0 elegant-shadow mt-8 max-w-lg text-center p-8">
                        <CardHeader>
                            <CardTitle className="main-text flex items-center justify-center gap-2">
                              <AlertCircle className="w-5 h-5" />
                              Bracket Not Generated
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="main-text opacity-70 my-4">The bracket for this tournament has not been generated yet.</p>
                            
                            <div className="text-sm main-text opacity-60 bg-white/20 p-3 rounded">
                              <p><strong>Tournament Admin:</strong> {tournament.admin_username}</p>
                              <p><strong>Your Status:</strong> {isAdmin ? 'Admin' : 'Participant'}</p>
                              <p><strong>Accepted Participants:</strong> {acceptedParticipantsCount}</p>
                            </div>
                            
                            {canGenerateBracket && (
                                <Button onClick={handleGenerateBracket} disabled={generatingBracket} style={{ backgroundColor: '#f26222', color: 'white' }} className="w-full">
                                    {generatingBracket ? 'Generating...' : 'Generate Bracket'}
                                </Button>
                            )}
                            {!canGenerateBracket && isAdmin && acceptedParticipantsCount === 0 && tournament?.status === 'registration_open' && (
                                <div className="text-center p-4 bg-white/10 rounded">
                                  <p className="text-sm main-text opacity-70">
                                    Need at least one accepted participant to generate the bracket.
                                  </p>
                                </div>
                            )}
                            {!canGenerateBracket && isAdmin && tournament?.status !== 'registration_open' && (
                                <div className="text-center p-4 bg-white/10 rounded">
                                  <p className="text-sm main-text opacity-70">
                                    Bracket can only be generated when tournament registration is open.
                                  </p>
                                </div>
                            )}
                            {!isAdmin && (
                                <div className="text-center p-4 bg-white/10 rounded">
                                  <p className="text-sm main-text opacity-70">Only the tournament admin can generate the bracket.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
            </div>
        </div>
      </div>
    </div>
  );
}
