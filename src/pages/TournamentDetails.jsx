
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Tournament } from '@/entities/Tournament';
import { TournamentParticipant } from '@/entities/TournamentParticipant';
import { Club } from '@/entities/Club';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Trophy, Calendar, VenetianMask, Bone, UserCheck, UserMinus, UserPlus, Settings, Edit } from 'lucide-react';
import { joinTournament } from '@/functions/joinTournament';
import { leaveTournament } from '@/functions/leaveTournament';
import { declineTournamentInvitation } from '@/functions/declineTournamentInvitation';
import { format } from 'date-fns';

export default function TournamentDetailsPage() {
    const { user, refetchUser } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const tournamentId = new URLSearchParams(location.search).get('id');

    const [tournament, setTournament] = useState(null);
    const [club, setClub] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [userParticipant, setUserParticipant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false); // For user join/leave/accept/decline actions
    const [isActionLoading, setIsActionLoading] = useState(false); // For admin specific actions (like generate bracket)
    const [error, setError] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false); // State for a potential Edit Tournament modal

    const fetchData = useCallback(async () => {
        if (!tournamentId) {
            setError("No Tournament ID provided.");
            setLoading(false);
            return;
        }

        // Basic validation - tournament IDs should be valid MongoDB ObjectIds (24 hex characters)
        if (!/^[0-9a-fA-F]{24}$/.test(tournamentId)) {
            setError("Invalid tournament ID format.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const tournamentData = await Tournament.get(tournamentId);
            if (!tournamentData) {
                throw new Error("Tournament not found.");
            }
            setTournament(tournamentData);

            // Fetch Club data only if a valid club_id exists and is different from the tournament's own ID
            let clubData = null;
            if (tournamentData.club_id && tournamentData.club_id !== tournamentData.id) {
                try {
                    clubData = await Club.get(tournamentData.club_id);
                } catch (e) {
                    console.warn(`Could not fetch club with id ${tournamentData.club_id}. It may have been deleted or the ID is incorrect.`, e);
                }
            } else if (tournamentData.club_id) {
                console.warn(`Data integrity issue detected: tournament.club_id is the same as tournament.id (${tournamentId}). Skipping club fetch.`);
            }
            setClub(clubData);

            const participantsData = await TournamentParticipant.filter({ tournament_id: tournamentId }).catch(e => {
                console.warn("Failed to fetch participants:", e);
                return [];
            });
            
            // This now includes invited, accepted, etc.
            const allParticipants = participantsData || [];
            
            const acceptedParticipants = allParticipants.filter(p => p.status === 'accepted');
            setParticipants(acceptedParticipants);

            if (user) {
                const userParticipation = allParticipants.find(p => p.user_id === user.id);
                setUserParticipant(userParticipation || null);
            } else {
                setUserParticipant(null);
            }

        } catch (err) {
            console.error("Failed to fetch tournament details:", err);
            setError(`Failed to load tournament: ${err.message}`);
            setTournament(null);
            setClub(null);
            setParticipants([]);
            setUserParticipant(null);
        } finally {
            setLoading(false);
        }
    }, [tournamentId, user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleJoinTournament = async () => {
        if (!user) {
            alert('Please log in to join the tournament.');
            return;
        }
        if (!tournament || !tournament.id) {
            alert('Tournament data is not available.');
            return;
        }

        setIsProcessing(true);
        try {
            const { data } = await joinTournament({ tournament_id: tournament.id });
            
            if (data.success) {
                alert(data.message || 'Successfully joined the tournament!');
                await fetchData(); // Refresh data
                await refetchUser(); // Refresh user bones etc.
            } else {
                alert(data.error || 'Failed to join tournament.');
            }
        } catch (error) {
            console.error('Join tournament error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to join tournament.';
            alert(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleLeaveTournament = async () => {
        if (!user) {
            alert('Please log in to leave the tournament.');
            return;
        }
        if (!tournament || !tournament.id) {
            alert('Tournament data is not available.');
            return;
        }
        if (!confirm('Are you sure you want to leave this tournament?')) {
            return;
        }

        setIsProcessing(true);
        try {
            const { data } = await leaveTournament({ tournament_id: tournament.id });
            
            if (data.success) {
                alert('Successfully left the tournament.');
                await fetchData(); // Refresh data
                await refetchUser(); // Refresh user bones etc.
            } else {
                alert(data.error || 'Failed to leave tournament.');
            }
        } catch (error) {
            console.error('Leave tournament error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to leave tournament.';
            alert(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeclineInvitation = async () => {
        if (!user || !tournament || !tournament.id) {
            alert('Cannot decline invitation.');
            return;
        }
        if (!confirm('Are you sure you want to decline this invitation?')) {
            return;
        }

        setIsProcessing(true);
        try {
            const { data } = await declineTournamentInvitation({ tournament_id: tournament.id });
            
            if (data.success) {
                alert('Invitation declined.');
                await fetchData();
                await refetchUser();
            } else {
                alert(data.error || 'Failed to decline invitation.');
            }
        } catch (error) {
            console.error('Decline invitation error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to decline invitation.';
            alert(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };


    const handleAcceptInvitation = useCallback(async () => {
        if (!user || !tournament || !tournament.id) return;
        setIsProcessing(true); // Changed to isProcessing for consistency with other user actions
        try {
            const { data } = await joinTournament({ tournament_id: tournament.id }); // Reusing joinTournament for accepting
            if (data.success) {
                alert(data.message || 'Invitation accepted successfully!');
                await fetchData();
                await refetchUser();
            } else {
                alert(data.error || 'Failed to accept invitation.');
            }
        } catch (error) {
            console.error('Accept invitation error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to accept invitation.';
            alert(errorMessage);
        } finally {
            setIsProcessing(false); // Changed to isProcessing
        }
    }, [user, tournament, fetchData, refetchUser]);

    const handleGenerateBracket = useCallback(async () => {
        if (!user || !tournament || !tournament.id) return;
        if (!confirm('Are you sure you want to generate the bracket and start the tournament? This action cannot be undone.')) {
            return;
        }
        setIsActionLoading(true);
        try {
            // This is a placeholder for the actual API call to generate the bracket.
            // In a real application, you would call an API function like `generateTournamentBracket`.
            // Example: const { data } = await generateTournamentBracket({ tournament_id: tournament.id });
            console.log("Simulating bracket generation for tournament:", tournament.id);
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
            alert('Bracket generation and tournament start initiated! (This is a simulated action)');
            await fetchData(); // Refresh data to update tournament status
        } catch (error) {
            console.error('Generate bracket error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to generate bracket.';
            alert(errorMessage);
        } finally {
            setIsActionLoading(false);
        }
    }, [user, tournament, fetchData]);

    const userStatus = useMemo(() => {
        if (!user) return 'logged_out';
        if (tournament && user.id === tournament.admin_user_id) return 'admin';
        if (userParticipant) return userParticipant.status;
        return 'viewer';
    }, [user, tournament, userParticipant]);
    
    if (loading) return <div className="text-center p-12 main-text">Loading Tournament...</div>;
    if (error) return <div className="text-center p-12 text-red-500">Error: {error}</div>;
    if (!tournament) return <div className="text-center p-12 main-text">Tournament not found.</div>;

    const canViewBracket = tournament.status === 'in_progress' || tournament.status === 'completed';
    const registrationOpen = tournament.status === 'registration_open';
    const isAdmin = user && user.id === tournament.admin_user_id;

    return (
        <div className="min-h-screen p-4 sm:p-8 pb-16" style={{ backgroundColor: '#e5e4cd' }}>
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    {/* Use club.name if available, otherwise fallback to tournament.club_name */}
                    <Link to={createPageUrl(`ClubDetails?id=${tournament.club_id}`)} className="inline-flex items-center gap-2 text-[#5a3217] hover:underline">
                        <ArrowLeft className="w-4 h-4" />
                        Back to {club?.name || tournament.club_name || 'Club'}
                    </Link>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-2">
                        {/* Admin Controls */}
                        {isAdmin && (
                            <Card className="tool-card-bg border-0 elegant-shadow mb-6">
                                <CardHeader>
                                    <CardTitle className="main-text">Admin Controls</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex flex-wrap gap-4">
                                        <Button
                                            onClick={() => setShowEditModal(true)}
                                            style={{ backgroundColor: '#007e81', color: 'white' }}
                                            className="flex items-center gap-2"
                                        >
                                            <Edit className="w-4 h-4" />
                                            Edit Tournament
                                        </Button>

                                        {/* The "Accept My Invitation" button for admins is moved below to the non-admin section */}
                                        
                                        {tournament.status === 'registration_open' && (
                                            <Button
                                                onClick={handleGenerateBracket}
                                                disabled={isActionLoading || participants.length < 2} // Disable if not enough participants
                                                style={{ backgroundColor: '#f26222', color: 'white' }}
                                                className="flex items-center gap-2"
                                            >
                                                {isActionLoading ? (
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                    <Trophy className="w-4 h-4" />
                                                )}
                                                Generate Bracket & Start
                                            </Button>
                                        )}

                                        <Button
                                            onClick={() => navigate(createPageUrl(`ManageTournament?id=${tournament.id}`))}
                                            variant="outline"
                                            className="flex items-center gap-2"
                                        >
                                            <Settings className="w-4 h-4" />
                                            Manage Tournament
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="tool-card-bg border-0 elegant-shadow">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-4xl main-text">{tournament.name}</CardTitle>
                                        <p className="text-lg main-text opacity-80 pt-2">{tournament.description}</p>
                                    </div>
                                    <Badge variant="secondary">{tournament.status.replace('_', ' ')}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-b border-white/20 py-4">
                                    <InfoItem icon={<Trophy/>} label="Format" value={tournament.type.replace('_', ' ')} />
                                    <InfoItem icon={<Calendar/>} label="Starts" value={tournament.start_date ? format(new Date(tournament.start_date), 'MMM d, yyyy') : 'TBD'} />
                                    <InfoItem icon={<Users/>} label="Participants" value={`${participants.length} / ${tournament.max_competitors || '∞'}`} />
                                    <InfoItem icon={<Bone />} label="Entry Fee" value={`${tournament.entry_fee_bones || 0} Bones`} />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 items-start">
                                    {/* Action Buttons for non-admins */}
                                    {user && !isAdmin && (
                                        <div className="flex gap-4">
                                            {userParticipant ? (
                                                <>
                                                    {userParticipant.status === 'invited' && (
                                                        <>
                                                            <Button
                                                                onClick={handleJoinTournament}
                                                                disabled={isProcessing}
                                                                style={{ backgroundColor: '#f26222', color: 'white' }}
                                                                className="flex items-center gap-2"
                                                            >
                                                                <UserCheck className="w-4 h-4" />
                                                                {isProcessing ? 'Accepting...' : 'Accept Invitation'}
                                                                {tournament.entry_fee_bones > 0 && (
                                                                    <span className="ml-2">({tournament.entry_fee_bones} 🦴)</span>
                                                                )}
                                                            </Button>
                                                            <Button
                                                                onClick={handleDeclineInvitation}
                                                                disabled={isProcessing}
                                                                variant="destructive"
                                                                className="flex items-center gap-2"
                                                            >
                                                                <UserMinus className="w-4 h-4" />
                                                                {isProcessing ? 'Declining...' : 'Decline Invitation'}
                                                            </Button>
                                                        </>
                                                    )}
                                                    {userParticipant.status === 'accepted' && registrationOpen && (
                                                        <Button
                                                            onClick={handleLeaveTournament}
                                                            disabled={isProcessing}
                                                            variant="destructive"
                                                            className="flex items-center gap-2"
                                                        >
                                                            <UserMinus className="w-4 h-4" />
                                                            {isProcessing ? 'Leaving...' : 'Leave Tournament'}
                                                        </Button>
                                                    )}
                                                </>
                                            ) : (
                                                registrationOpen && (
                                                    <Button
                                                        onClick={handleJoinTournament}
                                                        disabled={isProcessing}
                                                        style={{ backgroundColor: '#f26222', color: 'white' }}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <UserPlus className="w-4 h-4" />
                                                        {isProcessing ? 'Entering...' : 'Enter Tournament'}
                                                        {tournament.entry_fee_bones > 0 && (
                                                            <span className="ml-2">({tournament.entry_fee_bones} 🦴)</span>
                                                        )}
                                                    </Button>
                                                )
                                            )}
                                        </div>
                                    )}
                                    {canViewBracket && (
                                        <Button asChild variant="outline">
                                            <Link to={createPageUrl(`TournamentBracket?id=${tournament.id}`)}>
                                                <VenetianMask className="w-4 h-4 mr-2" /> View Bracket
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-1">
                        <Card className="tool-card-bg border-0 elegant-shadow">
                            <CardHeader>
                                <CardTitle className="main-text flex items-center gap-3"><Users/> Participants</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {participants.length > 0 ? (
                                    <ul className="space-y-2">
                                        {participants.map(p => (
                                            <li key={p.id} className="flex items-center gap-3 bg-white/30 p-2 rounded-md">
                                                <img src={p.profile_picture_url || `https://api.dicebear.com/7.x/micah/svg?seed=${p.username}`} alt={p.username} className="w-8 h-8 rounded-full object-cover" />
                                                <span className="font-semibold main-text text-sm">{p.username}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="main-text opacity-70 text-center py-4">No one has entered yet.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

const InfoItem = ({ icon, label, value }) => (
    <div className="flex flex-col items-center text-center">
        <div className="text-2xl main-text opacity-80 mb-1">{icon}</div>
        <div className="text-xs main-text uppercase opacity-60">{label}</div>
        <div className="text-sm font-semibold main-text">{value}</div>
    </div>
);
