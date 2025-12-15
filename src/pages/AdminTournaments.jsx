
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, RefreshCw, Users, Mail, Trash2, Play, Eye } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Tournament } from '@/entities/Tournament';
import { TournamentParticipant } from '@/entities/TournamentParticipant';
import { ClubMember } from '@/entities/ClubMember';
import { generateBracket } from '@/functions/generateBracket';
import { Message } from '@/entities/Message';
import { deleteTournament } from '@/functions/deleteTournament';

// This is a reinstated and improved version of the Tournament Management page.

export default function AdminTournamentsPage() {
  const { user, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const tournamentId = useMemo(() => new URLSearchParams(location.search).get('id'), [location.search]);
  const clubId = useMemo(() => new URLSearchParams(location.search).get('club_id'), [location.search]);

  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [clubMembers, setClubMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!tournamentId || !clubId) {
      setError('Missing tournament or club ID.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [tournamentData, participantsData, clubMembersData] = await Promise.all([
        Tournament.get(tournamentId).catch(err => {
          if (err.response?.status === 404) return null;
          throw err;
        }),
        TournamentParticipant.filter({ tournament_id: tournamentId }),
        ClubMember.filter({ club_id: clubId, status: 'active' })
      ]);

      if (!tournamentData) {
        throw new Error("Tournament not found. It may have been deleted.");
      }
      
      setTournament(tournamentData);
      setParticipants(participantsData);
      setClubMembers(clubMembersData);
    } catch (err) {
      console.error("Failed to fetch tournament management data:", err);
      setError(err.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }, [tournamentId, clubId]);

  useEffect(() => {
    if (!userLoading) {
      fetchData();
    }
  }, [userLoading, fetchData]);

  const handleInvite = async (memberToInvite) => {
    setProcessing(true);
    try {
      const isAlreadyParticipant = participants.some(p => p.user_id === memberToInvite.user_id);
      if (isAlreadyParticipant) {
        alert(`${memberToInvite.username} is already in the tournament.`);
        return;
      }
      
      const newParticipant = await TournamentParticipant.create({
        tournament_id: tournamentId,
        user_id: memberToInvite.user_id,
        username: memberToInvite.username,
        status: 'invited',
      });

      // Create a notification message for the invitee
      await Message.create({
          sender_id: 'system',
          sender_username: 'Bone Club System',
          recipient_id: memberToInvite.user_id,
          recipient_username: memberToInvite.username,
          type: 'notification',
          subject: `Tournament Invitation: ${tournament.name}`,
          body: `You have been invited to join the tournament **${tournament.name}** by ${user.username || user.full_name}.`,
          status: 'unread',
          related_entity_id: newParticipant.id,
          related_entity_type: 'TournamentParticipant'
      });

      fetchData(); // Refresh data
    } catch (err) {
      console.error("Failed to invite member:", err);
      alert(`Failed to invite ${memberToInvite.username}.`);
    } finally {
      setProcessing(false);
    }
  };

  const handleRemove = async (participantToRemove) => {
    if (!window.confirm(`Are you sure you want to remove ${participantToRemove.username}?`)) return;
    setProcessing(true);
    try {
      await TournamentParticipant.delete(participantToRemove.id);
      fetchData();
    } catch (err) {
      alert(`Failed to remove ${participantToRemove.username}.`);
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateBracket = async () => {
    if (!window.confirm("Are you sure you want to generate the bracket? This will lock registrations and start the tournament.")) return;
    setProcessing(true);
    try {
      await generateBracket({ tournament_id: tournamentId });
      alert("Bracket generated successfully!");
      fetchData();
    } catch (err) {
      console.error("Bracket generation failed:", err);
      alert(`Bracket generation failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteTournament = async () => {
    setProcessing(true);
    try {
      await deleteTournament({ tournament_id: tournamentId });
      alert('Tournament successfully deleted.');
      navigate(createPageUrl(`ClubDetails?id=${clubId}`));
    } catch (err) {
      console.error("Failed to delete tournament:", err);
      alert(`Failed to delete tournament: ${err.response?.data?.error || err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const potentialInvitees = useMemo(() => {
    const participantIds = new Set(participants.map(p => p.user_id));
    return clubMembers.filter(cm => !participantIds.has(cm.user_id));
  }, [clubMembers, participants]);

  if (loading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <RefreshCw className="w-12 h-12 animate-spin main-text" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#e5e4cd' }}>
        <Card className="tool-card-bg border-0 elegant-shadow text-center max-w-lg">
          <CardHeader>
            <CardTitle className="main-text text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="main-text opacity-70 mb-6">{error}</p>
            <Button asChild style={{ backgroundColor: '#f26222', color: 'white' }}>
              <Link to={createPageUrl(`ClubDetails?id=${clubId}`)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Club
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isRegistrationOpen = tournament.status === 'registration_open';
  const canGenerateBracket = isRegistrationOpen && participants.filter(p => p.status === 'accepted').length >= 2;

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to={createPageUrl(`ClubDetails?id=${clubId}`)} className="flex items-center gap-2 hover:opacity-70 transition-colors" style={{ color: '#5a3217' }}>
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Club Details</span>
          </Link>
          <Link to={createPageUrl(`TournamentDetails?id=${tournamentId}`)} className="flex items-center gap-2 hover:opacity-70 transition-colors" style={{ color: '#007e81' }}>
            <Eye className="w-4 h-4" />
            <span>View Public Page</span>
          </Link>
        </div>

        <h1 className="text-4xl font-bold main-text mb-2">{tournament.name}</h1>
        <p className="main-text opacity-70 mb-6">Admin Management</p>

        {/* Tournament Actions */}
        <Card className="tool-card-bg border-0 elegant-shadow mb-8">
          <CardHeader><CardTitle className="main-text">Tournament Actions</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <Button onClick={handleGenerateBracket} disabled={!canGenerateBracket || processing} style={{backgroundColor: '#007e81', color: 'white'}}>
              <Play className="w-4 h-4 mr-2"/> {processing ? 'Processing...' : 'Generate Bracket & Start'}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={processing}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Tournament
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent style={{ backgroundColor: '#e5e4cd' }}>
                <AlertDialogHeader>
                  <AlertDialogTitle className="main-text">Delete Tournament</AlertDialogTitle>
                  <AlertDialogDescription className="main-text">
                    Are you sure you want to permanently delete "{tournament.name}"? This will remove all participants and matches. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteTournament}
                    style={{ backgroundColor: '#dc2626', color: 'white' }}
                  >
                    Yes, Delete Tournament
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {!canGenerateBracket && isRegistrationOpen && (
              <p className="text-sm main-text opacity-70 mt-2">
                You need at least 2 accepted participants to generate the bracket.
              </p>
            )}
            {tournament.status !== 'registration_open' && (
              <p className="text-sm main-text opacity-70 mt-2">
                This tournament is already in progress or completed.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Participants List */}
          <Card className="tool-card-bg border-0 elegant-shadow">
            <CardHeader><CardTitle className="main-text flex items-center gap-2"><Users className="w-6 h-6"/>Participants ({participants.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {participants.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-white/20 rounded-md">
                    <span className="main-text">{p.username}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={p.status === 'accepted' ? 'default' : 'secondary'}>{p.status}</Badge>
                      {isRegistrationOpen && (
                        <Button size="sm" variant="destructive" onClick={() => handleRemove(p)} disabled={processing}>
                          <Trash2 className="w-4 h-4"/>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Invite Members */}
          {isRegistrationOpen && (
            <Card className="tool-card-bg border-0 elegant-shadow">
              <CardHeader><CardTitle className="main-text flex items-center gap-2"><Mail className="w-6 h-6"/>Invite Club Members</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {potentialInvitees.length > 0 ? potentialInvitees.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-2 bg-white/20 rounded-md">
                      <span className="main-text">{m.username}</span>
                      <Button size="sm" onClick={() => handleInvite(m)} disabled={processing} style={{backgroundColor: '#007e81', color: 'white'}}>
                        <Plus className="w-4 h-4 mr-1"/> Invite
                      </Button>
                    </div>
                  )) : <p className="main-text opacity-70">All club members have been invited.</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
