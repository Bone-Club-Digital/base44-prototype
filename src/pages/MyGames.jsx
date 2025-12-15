
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
    Gamepad2,
    RefreshCw,
    Shield,
    Clock // Added Clock icon
} from 'lucide-react'; // Removed Calendar icon
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GameSession } from '@/entities/GameSession';
import { LeagueMatch } from '@/entities/LeagueMatch';
import { useUser } from '../components/auth/UserProvider';
import { getLeagueProposalsForUser } from '@/functions/getLeagueProposalsForUser';
import { getMyScheduledMatches } from '@/functions/getMyScheduledMatches';
import LeagueProposalCard from '../components/leagues/LeagueProposalCard';
import ProposalResponseModal from '../components/leagues/ProposalResponseModal';
import ScheduledMatchCard from '../components/mygames/ScheduledMatchCard';
import ScheduledMatchInvitationNotifications from '../components/notifications/ScheduledMatchInvitationNotifications';
import SuccessNotification from '../components/notifications/SuccessNotification';
// Removed Message import as it's no longer used for fetching invites

export default function MyGamesPage() {
    const { user, loading: userLoading, refetchUnreadMessages } = useUser();
    const navigate = useNavigate();

    const [activeGames, setActiveGames] = useState([]);
    const [scheduledMatches, setScheduledMatches] = useState([]);
    const [leagueMatches, setLeagueMatches] = useState([]);
    const [leagueProposals, setLeagueProposals] = useState([]);
    const [pendingMatchInvites, setPendingMatchInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedProposal, setSelectedProposal] = useState(null);
    const [isResponseModalOpen, setResponseModalOpen] = useState(false); // New state for modal visibility
    const [successMessage, setSuccessMessage] = useState('');
    const pollIntervalRef = useRef(null);
    const [lastFetchTime, setLastFetchTime] = useState(0);
    const [retryCount, setRetryCount] = useState(0);

    const fetchAllGameData = useCallback(async (forceRefresh = false) => {
        if (!user) return;

        // Rate limiting protection - bypass for forced refreshes
        const now = Date.now();
        if (!forceRefresh && now - lastFetchTime < 3000) {
            console.log('[MyGames] Skipping fetch - too soon since last request');
            return;
        }

        // Don't show loading spinner on background polls or forced refreshes
        if (!pollIntervalRef.current && !forceRefresh) {
            setLoading(true);
        }
        setError(null);

        try {
            setLastFetchTime(now);

            const [
                activeGamesData,
                scheduledMatchesResponse,
                leagueMatchesData,
                leagueProposalsResponse
            ] = await Promise.all([
                GameSession.filter({
                    '$or': [{ player_teal_id: user.id }, { player_bone_id: user.id }],
                    status: { '$in': ['in_progress', 'waiting_for_start'] }
                }, '-created_date'),
                getMyScheduledMatches(),
                LeagueMatch.filter({
                    '$or': [{ player_1_id: user.id }, { player_2_id: user.id }]
                }, '-created_date'),
                getLeagueProposalsForUser(),
            ]);

            setActiveGames(activeGamesData);

            const scheduledMatchesData = scheduledMatchesResponse.data || [];

            // Check for games that were started by opponent - navigate immediately
            for (const match of scheduledMatchesData) {
                if (match.game_session_id && match.status === 'completed') {
                    // Check if there's an active game for this match
                    const activeGame = activeGamesData.find(g => g.id === match.game_session_id);
                    if (activeGame && activeGame.status === 'waiting_for_start') {
                        console.log('Opponent started match, joining:', activeGame.id);
                        navigate(createPageUrl(`Game?id=${activeGame.id}`));
                        return;
                    }
                }
            }

            // Enhance scheduled matches with game status
            const enhancedScheduledMatches = scheduledMatchesData.map(match => {
                if (match.game_session_id) {
                    const activeGame = activeGamesData.find(g => g.id === match.game_session_id);
                    if (activeGame) {
                        return {
                            ...match,
                            gameStatus: activeGame.status,
                            gameSession: activeGame
                        };
                    }
                }
                return match;
            });

            setScheduledMatches(enhancedScheduledMatches);
            setLeagueMatches(leagueMatchesData);

            const proposals = leagueProposalsResponse.data || [];
            const pendingProposals = proposals.filter(p => p.status === 'pending');
            setLeagueProposals(pendingProposals);

            // Pending match invites are no longer fetched by this function as per outline.
            // If they are to be displayed, a different mechanism (e.g., real-time) would be needed.
            setPendingMatchInvites([]); // Ensure this is reset if not populated.

            // Reset retry count on success
            setRetryCount(0);

        } catch (err) {
            console.error('[MyGames] Error fetching game data:', err);

            // Handle rate limiting specifically
            if (err.response?.status === 429 || (err.message && err.message.includes('429'))) {
                const newRetryCount = retryCount + 1;
                setRetryCount(newRetryCount);

                // Exponential backoff - wait longer each time we get rate limited
                // Max 30 seconds to prevent excessively long waits
                const backoffDelay = Math.min(30000, 5000 * Math.pow(2, newRetryCount));
                console.log(`[MyGames] Rate limited, backing off for ${backoffDelay}ms`);

                setTimeout(() => {
                    // Only retry if the component is still mounted and user is logged in
                    if (pollIntervalRef.current && user) {
                        fetchAllGameData();
                    }
                }, backoffDelay);

                setError(`Rate limited. Retrying in ${Math.round(backoffDelay / 1000)} seconds...`);
            } else {
                const errorMessage = err.response?.data?.error || err.message || 'An unknown error occurred';
                setError(`Failed to load game data: ${errorMessage}`);
            }
        } finally {
            setLoading(false);
        }
    }, [user, navigate, lastFetchTime, retryCount]); // Added lastFetchTime and retryCount dependencies

    // Check for success messages from localStorage
    useEffect(() => {
        const checkForSuccessMessage = () => {
            const storedSuccess = localStorage.getItem('scheduledMatchSuccess');
            if (storedSuccess) {
                try {
                    const { message, timestamp } = JSON.parse(storedSuccess);
                    // Only show if message is less than 10 seconds old
                    if (Date.now() - timestamp < 10000) {
                        setSuccessMessage(message);
                    }
                    localStorage.removeItem('scheduledMatchSuccess');
                } catch (error) {
                    console.error('Error parsing success message:', error);
                    localStorage.removeItem('scheduledMatchSuccess');
                }
            }
        };

        checkForSuccessMessage();
    }, []);

    // Initial fetch and polling setup
    useEffect(() => {
        if (!user) {
            // If user logs out, stop polling and reset data
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            setActiveGames([]);
            setScheduledMatches([]);
            setLeagueMatches([]);
            setLeagueProposals([]);
            setPendingMatchInvites([]);
            setLoading(true); // Reset loading state
            setError(null);
            setSelectedProposal(null);
            setResponseModalOpen(false); // Reset modal state
            setSuccessMessage('');
            return;
        }

        // Clear any existing interval before setting a new one
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }

        // Set up polling
        // We fetch immediately, then every 10 seconds
        fetchAllGameData();
        pollIntervalRef.current = setInterval(() => {
            fetchAllGameData();
        }, 10000); // Poll every 10 seconds (much less aggressive)

        // Cleanup on component unmount or user change
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, [user, fetchAllGameData]);

    const handleRespondToProposal = (proposal) => {
        setSelectedProposal(proposal);
        setResponseModalOpen(true); // Open the modal
    };

    const handleCloseModal = () => {
        setResponseModalOpen(false); // Close the modal
        setSelectedProposal(null); // Clear the proposal data
    };

    if (userLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: '#5a3217' }} />
                    <p className="main-text">Loading your user data...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-8" style={{ backgroundColor: '#e5e4cd' }}>
                <Card className="tool-card-bg border-0 elegant-shadow max-w-md mx-auto">
                    <CardContent className="p-8 text-center">
                        <Shield className="w-16 h-16 main-text opacity-50 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold main-text mb-2">Please Log In</h2>
                        <p className="main-text opacity-70">You need to be logged in to view your games.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Only show this loading state once user is confirmed logged in
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: '#5a3217' }} />
                    <p className="main-text">Loading your games...</p>
                </div>
            </div>
        );
    }

    const hasActiveGames = activeGames.length > 0;
    const hasScheduledMatches = scheduledMatches.length > 0;
    const hasLeagueMatches = leagueMatches.length > 0;
    const hasLeagueProposals = leagueProposals.length > 0;
    const hasPendingMatchInvites = pendingMatchInvites.length > 0;
    const showEmptyState = !hasActiveGames && !hasScheduledMatches && !hasLeagueMatches && !hasLeagueProposals && !hasPendingMatchInvites;

    return (
        <>
            <ProposalResponseModal
                isOpen={isResponseModalOpen}
                onClose={handleCloseModal}
                proposal={selectedProposal}
                user={user}
                onAction={(message) => {
                    if (message) {
                        setSuccessMessage(message);
                    }
                    handleCloseModal(); // Close modal and clear selected proposal
                    fetchAllGameData(); // Refresh data
                }}
            />
            <div className="min-h-screen" style={{ backgroundColor: '#e5e4cd' }}>
                <div className="max-w-7xl mx-auto p-6">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="font-abolition text-4xl sm:text-5xl main-text">My Games</h1>
                        <Button onClick={fetchAllGameData} variant="outline" disabled={loading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>

                    <SuccessNotification
                        title="Success!"
                        message={successMessage}
                        onClose={() => setSuccessMessage('')}
                    />

                    {error && (
                        <Card className="mb-6 border-red-500 bg-red-100">
                            <CardContent className="p-4 text-center">
                                <p className="text-red-700 font-semibold">Error Loading Data</p>
                                <p className="text-red-600 text-sm mt-1">{error}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* This component will only show if pendingMatchInvites is populated */}
                    {hasPendingMatchInvites && (
                        <ScheduledMatchInvitationNotifications
                            invites={pendingMatchInvites}
                            onAction={() => {
                                fetchAllGameData(true); // Force refresh
                                refetchUnreadMessages();
                                setSuccessMessage('Successfully accepted the match challenge.');
                            }}
                        />
                    )}

                    {/* League Match Proposals Requiring Response */}
                    {hasLeagueProposals && (
                        <Card className="border-0 elegant-shadow mb-8" style={{ backgroundColor: '#007e81' }}>
                            <CardHeader>
                                <CardTitle className="text-bone-color flex items-center gap-3">
                                    <Clock className="w-6 h-6" />
                                    League Match Proposals Requiring Response ({leagueProposals.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {leagueProposals.map((proposal) => (
                                    <LeagueProposalCard
                                        key={proposal.id}
                                        proposal={proposal}
                                        user={user} // Retaining user prop for component functionality
                                        onRespond={() => {
                                            setSelectedProposal(proposal);
                                            setResponseModalOpen(true);
                                        }}
                                    />
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    <Tabs defaultValue="active" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-6">
                            <TabsTrigger value="active">Active Games ({activeGames.length})</TabsTrigger>
                            <TabsTrigger value="scheduled">Scheduled Matches ({scheduledMatches.length})</TabsTrigger>
                            <TabsTrigger value="league">League Matches ({leagueMatches.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="active">
                            <Card className="tool-card-bg border-0 elegant-shadow">
                                <CardContent className="p-4">
                                    {hasActiveGames ? (
                                        <div className="space-y-4">
                                            {/* Placeholder for Active Games List */}
                                            {activeGames.map(game => (
                                                <div key={game.id} className="p-3 border rounded">
                                                    <p className="main-text">Active Game ID: {game.id}</p>
                                                    <p className="main-text">Status: {game.status}</p>
                                                    <Button onClick={() => navigate(createPageUrl(`Game?id=${game.id}`))}>Join Game</Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center p-4 main-text opacity-70">No active games in progress.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="scheduled">
                            <Card className="tool-card-bg border-0 elegant-shadow">
                                <CardContent className="p-4">
                                    {hasScheduledMatches ? (
                                        <div className="space-y-4">
                                            {scheduledMatches.map(match => (
                                                <ScheduledMatchCard
                                                    key={match.id}
                                                    match={match}
                                                    user={user}
                                                    onRefresh={fetchAllGameData} // This now accepts forceRefresh parameter
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center p-4 main-text opacity-70">No matches scheduled. Arrange one with a friend from the home page!</p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="league">
                            <Card className="tool-card-bg border-0 elegant-shadow">
                                <CardContent className="p-4">
                                    {hasLeagueMatches ? (
                                        <div className="space-y-4">
                                            {/* Placeholder for League Matches List */}
                                            {leagueMatches.map(match => (
                                                <div key={match.id} className="p-3 border rounded">
                                                    <p className="main-text">League Match ID: {match.id}</p>
                                                    <p className="main-text">Status: {match.status}</p>
                                                    {/* Add more details or action buttons as needed */}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center p-4 main-text opacity-70">No league matches to display.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    {showEmptyState && (
                        <Card className="tool-card-bg border-0 elegant-shadow mt-6">
                            <CardContent className="p-8 text-center">
                                <Gamepad2 className="w-16 h-16 main-text opacity-50 mx-auto mb-4" />
                                <h3 className="text-xl font-bold main-text mb-2">No Games Yet</h3>
                                <p className="main-text opacity-70 mb-4">
                                    You don't have any active games, scheduled matches, or league matches.
                                </p>
                                <Button
                                    onClick={() => navigate(createPageUrl('Home'))}
                                    style={{ backgroundColor: '#007e81', color: 'white' }}
                                    className="hover:opacity-90"
                                >
                                    Find a Match
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </>
    );
}
