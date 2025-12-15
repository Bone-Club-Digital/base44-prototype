import React, { useState, useEffect } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Tournament } from '@/entities/Tournament';
import { TournamentParticipant } from '@/entities/TournamentParticipant';
import { Club } from '@/entities/Club';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Trophy, UserPlus, Mail, Trash2 } from 'lucide-react';
import { generateBracket } from '@/functions/generateBracket';
import InviteTournamentMemberModal from '../components/tournaments/InviteTournamentMemberModal';

export default function ManageTournamentPage() {
    const { user } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const tournamentId = new URLSearchParams(location.search).get('id');

    const [tournament, setTournament] = useState(null);
    const [club, setClub] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showInviteModal, setShowInviteModal] = useState(false);

    const fetchData = async () => {
        if (!tournamentId) {
            setError("No Tournament ID provided.");
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

            // Fetch Club data if available
            let clubData = null;
            if (tournamentData.club_id && tournamentData.club_id !== tournamentData.id) {
                try {
                    clubData = await Club.get(tournamentData.club_id);
                } catch (e) {
                    console.warn(`Could not fetch club with id ${tournamentData.club_id}`, e);
                }
            }
            setClub(clubData);

            // Fetch all participants (including pending invitations)
            const participantsData = await TournamentParticipant.filter({ tournament_id: tournamentId }).catch(e => {
                console.warn("Failed to fetch participants:", e);
                return [];
            });
            
            setParticipants(participantsData || []);

        } catch (err) {
            console.error("Failed to fetch tournament details:", err);
            setError(`Failed to load tournament: ${err.message}`);
            setTournament(null);
            setClub(null);
            setParticipants([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [tournamentId]);

    const handleGenerateBracket = async () => {
        if (!tournament || !tournament.id) return;
        if (!confirm('Are you sure you want to generate the bracket and start the tournament? This action cannot be undone.')) {
            return;
        }
        setIsActionLoading(true);
        try {
            const { data } = await generateBracket({ tournament_id: tournament.id });
            if (data.success) {
                alert('Bracket generated successfully!');
                await fetchData();
            } else {
                alert(data.error || 'Failed to generate bracket.');
            }
        } catch (error) {
            console.error('Generate bracket error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to generate bracket.';
            alert(errorMessage);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleRemoveParticipant = async (participantId, participantName) => {
        if (!confirm(`Are you sure you want to remove ${participantName} from the tournament?`)) {
            return;
        }

        try {
            await TournamentParticipant.delete(participantId);
            alert(`${participantName} has been removed from the tournament.`);
            await fetchData();
        } catch (error) {
            console.error('Error removing participant:', error);
            alert('Failed to remove participant.');
        }
    };

    if (loading) return <div className="text-center p-12 main-text">Loading Tournament...</div>;
    if (error) return <div className="text-center p-12 text-red-500">Error: {error}</div>;
    if (!tournament) return <div className="text-center p-12 main-text">Tournament not found.</div>;

    // Check if user is admin
    const isAdmin = user && user.id === tournament.admin_user_id;
    if (!isAdmin) {
        return <div className="text-center p-12 text-red-500">Access denied: You are not the administrator of this tournament.</div>;
    }

    const acceptedParticipants = participants.filter(p => p.status === 'accepted');
    const invitedParticipants = participants.filter(p => p.status === 'invited');

    return (
        <div className="min-h-screen p-4 sm:p-8" style={{ backgroundColor: '#e5e4cd' }}>
            <div className="max-w-6xl mx-auto">
                <div className="mb-6">
                    <Link to={createPageUrl(`TournamentDetails?id=${tournament.id}`)} className="inline-flex items-center gap-2 text-[#5a3217] hover:underline">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Tournament Details
                    </Link>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-4xl font-bold main-text">Manage Tournament</h1>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => setShowInviteModal(true)}
                            style={{ backgroundColor: '#007e81', color: 'white' }}
                            className="flex items-center gap-2"
                        >
                            <UserPlus className="w-4 h-4" />
                            Invite Players
                        </Button>
                        {tournament.status === 'registration_open' && (
                            <Button
                                onClick={handleGenerateBracket}
                                disabled={isActionLoading || acceptedParticipants.length < 2}
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
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Tournament Info */}
                    <Card className="tool-card-bg border-0 elegant-shadow">
                        <CardHeader>
                            <CardTitle className="main-text">{tournament.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-semibold main-text">Status</p>
                                <Badge variant="secondary">{tournament.status.replace('_', ' ')}</Badge>
                            </div>
                            <div>
                                <p className="text-sm font-semibold main-text">Entry Fee</p>
                                <p className="main-text">{tournament.entry_fee_bones || 0} Bones</p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold main-text">Format</p>
                                <p className="main-text">{tournament.type.replace('_', ' ')}</p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold main-text">Participants</p>
                                <p className="main-text">{acceptedParticipants.length} accepted, {invitedParticipants.length} pending</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Accepted Participants */}
                    <Card className="tool-card-bg border-0 elegant-shadow">
                        <CardHeader>
                            <CardTitle className="main-text flex items-center gap-3">
                                <Users className="w-5 h-5" />
                                Accepted Participants ({acceptedParticipants.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {acceptedParticipants.length > 0 ? (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {acceptedParticipants.map(participant => (
                                        <div key={participant.id} className="flex items-center justify-between p-2 bg-white/30 rounded-md">
                                            <div className="flex items-center gap-3">
                                                {participant.profile_picture_url ? (
                                                    <img
                                                        src={participant.profile_picture_url}
                                                        alt={participant.username}
                                                        className="w-8 h-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-[#5a3217] flex items-center justify-center">
                                                        <span className="text-white text-xs font-bold">
                                                            {participant.username.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                <span className="font-semibold main-text text-sm">{participant.username}</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveParticipant(participant.id, participant.username)}
                                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center main-text opacity-70 py-4">No participants yet.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pending Invitations */}
                    {invitedParticipants.length > 0 && (
                        <Card className="tool-card-bg border-0 elegant-shadow lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="main-text flex items-center gap-3">
                                    <Mail className="w-5 h-5" />
                                    Pending Invitations ({invitedParticipants.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {invitedParticipants.map(participant => (
                                        <div key={participant.id} className="flex items-center justify-between p-3 bg-yellow-100 rounded-md">
                                            <div className="flex items-center gap-3">
                                                {participant.profile_picture_url ? (
                                                    <img
                                                        src={participant.profile_picture_url}
                                                        alt={participant.username}
                                                        className="w-8 h-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-[#5a3217] flex items-center justify-center">
                                                        <span className="text-white text-xs font-bold">
                                                            {participant.username.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                <span className="font-semibold text-sm text-[#5a3217]">{participant.username}</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveParticipant(participant.id, participant.username)}
                                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <InviteTournamentMemberModal
                    isOpen={showInviteModal}
                    onClose={() => setShowInviteModal(false)}
                    tournament={tournament}
                    onInviteSent={fetchData}
                />
            </div>
        </div>
    );
}