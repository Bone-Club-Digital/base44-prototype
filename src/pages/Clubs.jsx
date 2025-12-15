
import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Club } from '@/entities/Club';
import { ClubMember } from '@/entities/ClubMember';
import { Message } from '@/entities/Message';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, RefreshCw, Users, LogIn } from 'lucide-react';
import CreateClubForm from '../components/clubs/CreateClubForm';
import MyClubsList from '../components/clubs/MyClubsList';
import PendingInvitesList from '../components/clubs/PendingInvitesList';
import MyTournamentsList from '../components/tournaments/MyTournamentsList';
import SuccessNotification from '../components/notifications/SuccessNotification';
import LeagueInvitationCard from '../components/leagues/LeagueInvitationCard';

export default function ClubsPage() {
  const { user, plan, loading, refetchUser, refetchPendingInvites, refetchUnreadMessages } = useUser();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState([]);
  const [myClubs, setMyClubs] = useState([]);
  // pendingInvites will continue to store ClubMember objects for club invitations.
  const [pendingInvites, setPendingInvites] = useState([]); 
  // pendingLeagueInvites will store Message objects for league invitations.
  const [pendingLeagueInvites, setPendingLeagueInvites] = useState([]); 
  const [myClubIds, setMyClubIds] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [leagueSuccessMessage, setLeagueSuccessMessage] = useState('');
  const [joinedLeagueId, setJoinedLeagueId] = useState(null);
  const [dataFetched, setDataFetched] = useState(false); // Add flag to prevent multiple fetches

  // Combined function to fetch all data in one go
  const fetchAllData = useCallback(async (userId) => {
    if (!userId) {
      setDataLoading(false);
      setDataFetched(true);
      return;
    }

    console.log('[Clubs] Starting data fetch for user:', userId);
    setDataLoading(true);
    
    try {
      // Fetch all data concurrently with proper error handling
      const [allClubs, memberships, messages] = await Promise.all([
        Promise.race([
          Club.list(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout (Clubs) after 10 seconds")), 10000))
        ]).catch(error => {
          if (error.response?.status === 429) {
            console.warn("Rate limited on clubs, using empty array");
            return [];
          }
          throw error;
        }),
        Promise.race([
          ClubMember.filter({ user_id: userId }, '-created_date', 50),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout (Memberships) after 10 seconds")), 10000))
        ]).catch(error => {
          if (error.response?.status === 429) {
            console.warn("Rate limited on memberships, using empty array");
            return [];
          }
          throw error;
        }),
        Promise.race([
          Message.filter({ recipient_id: userId, status: 'unread' }, '-created_date'),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout on messages")), 8000))
        ]).catch(error => {
          if (error.response?.status === 429) {
            console.warn("Rate limited on messages, keeping existing data");
            return [];
          }
          throw error;
        })
      ]);

      const activeMemberships = memberships.filter(m => m.status === 'active');
      const pendingMemberships = memberships.filter(m => m.status === 'pending');

      // Ensure unique pending invites for clubs
      const uniquePendingClubInvites = Array.from(new Map(pendingMemberships.map(item => [item.club_id, item])).values());

      // Filter league invites from messages
      const leagueInvites = messages.filter(m => 
        m.related_entity_type === 'LeagueParticipant' && 
        m.type === 'notification' &&
        m.subject && m.subject.includes('League Invitation')
      );

      // Update all states in one batch
      setClubs(allClubs); // Set all clubs
      setMyClubs(activeMemberships);
      setPendingInvites(uniquePendingClubInvites); // This still stores ClubMember objects
      setMyClubIds(activeMemberships.map(m => m.club_id)); // Set the club IDs for child components
      setPendingLeagueInvites(leagueInvites);

      console.log('[Clubs] Data fetch completed successfully');

    } catch (error) {
      console.warn("Data fetch failed:", error.message);
      // On rate limit errors, don't clear existing data
      if (error.response?.status !== 429) {
        setClubs([]);
        setMyClubs([]);
        setPendingInvites([]);
        setMyClubIds([]);
        setPendingLeagueInvites([]);
      }
    } finally {
      setDataLoading(false);
      setDataFetched(true);
    }
  }, []); // No dependencies - function is stable

  // Single useEffect with stable dependencies
  useEffect(() => {
    const userId = user?.id;
    console.log('[Clubs] useEffect triggered - loading:', loading, 'userId:', userId, 'dataFetched:', dataFetched);
    
    if (!loading && !dataFetched) {
      if (userId) {
        fetchAllData(userId);
      } else {
        // No user, just set loading to false and mark as fetched to prevent re-runs
        setDataLoading(false);
        setDataFetched(true);
      }
    }
  }, [loading, user?.id, dataFetched, fetchAllData]);

  const handleCreateClub = async ({ name, strapline, description }) => {
    if (!user || !user.username) {
      alert("Something went wrong, your user profile is not fully loaded.");
      return;
    }

    try {
      // Create the club
      const newClub = await Club.create({
        name,
        strapline,
        description,
        admin_id: user.id,
        admin_username: user.username,
      });

      // Add the admin as the first active member
      await ClubMember.create({
        club_id: newClub.id,
        club_name: newClub.name,
        user_id: user.id,
        username: user.username,
        status: 'active',
      });

      setShowCreateForm(false);
      setDataFetched(false); // Reset flag to trigger refetch
      if (user?.id) {
        await fetchAllData(user.id); // Refresh club and membership data
      }
    } catch (error) {
      console.error("Error creating club:", error);
      alert("Failed to create club. The name might already be taken.");
    }
  };

  const handleClubInvitation = async (membershipId, accepted) => {
    try {
      if (accepted) {
        // Find invite to get club name for success message
        const invite = pendingInvites.find(inv => inv.id === membershipId);
        await ClubMember.update(membershipId, { status: 'active' });
        if (invite) {
          setSuccessMessage(`You have successfully joined ${invite.club_name}!`);
        }
      } else {
        await ClubMember.delete(membershipId);
      }

      // Find and update the associated notification message to keep things in sync
      const messages = await Message.filter({ related_entity_id: membershipId, related_entity_type: 'ClubMember' });
      if (messages.length > 0) {
        await Message.update(messages[0].id, { status: 'read' });
      }

      // Reset dataFetched to allow refetch
      setDataFetched(false);
      const userId = user?.id;
      if (userId) {
        await fetchAllData(userId);
      }
      await refetchPendingInvites();
      await refetchUnreadMessages();
    } catch (error) {
      console.error("Error responding to club invitation:", error);
      alert("Failed to respond to invitation.");
    }
  };

  const handleLeagueJoinSuccess = (message, leagueId) => {
    setLeagueSuccessMessage(message);
    setJoinedLeagueId(leagueId);
  };

  // Show main page loader only for auth check
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 main-text" />
          <p className="main-text">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <Card className="tool-card-bg border-0 elegant-shadow text-center p-8">
          <Users className="w-16 h-16 main-text opacity-50 mx-auto mb-4" />
          <h2 className="text-2xl font-bold main-text mb-2">Join the Club!</h2>
          <p className="main-text opacity-70 mb-6">Please log in to view, create, and join clubs.</p>
          <Button onClick={() => User.login()} style={{ backgroundColor: '#f26222', color: 'white' }}>
            <LogIn className="w-5 h-5 mr-2" />
            Log In
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}> {/* Updated padding */}
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-4xl sm:text-5xl text-[#5a3217]">Bone Club Backgammon Clubs</h1>

          {(plan?.name === 'VIP' || user?.role === 'admin') && (
            <Button
              onClick={() => setShowCreateForm(true)}
              style={{ backgroundColor: '#f26222', color: 'white' }}
              className="flex items-center gap-2"
            >
              <PlusCircle className="w-5 h-5" />
              Create a New Club
            </Button>
          )}
        </div>

        <SuccessNotification
          title="Invitation Accepted!"
          message={successMessage}
          onClose={() => setSuccessMessage('')}
        />
        
        <SuccessNotification
            title="League Joined!"
            message={leagueSuccessMessage}
            onClose={() => {
              setLeagueSuccessMessage('');
              setJoinedLeagueId(null);
            }}
            actionText={joinedLeagueId ? 'Go to League Page' : undefined}
            onAction={joinedLeagueId ? () => {
              navigate(createPageUrl(`LeagueDetails?id=${joinedLeagueId}`));
              setLeagueSuccessMessage('');
              setJoinedLeagueId(null);
            } : undefined}
        />

        <CreateClubForm
          isOpen={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          onCreate={handleCreateClub}
        />

        {/* League Invitations section - now populated by fetchLeagueInvitationMessages */}
        {pendingLeagueInvites.length > 0 && (
          <div className="mb-6 space-y-4"> {/* Added space-y-4 for consistent spacing */}
            <h2 className="font-abolition text-3xl sm:text-4xl text-[#5a3217] mb-4">Pending League Invitations</h2>
            {pendingLeagueInvites.map(invite => (
              <LeagueInvitationCard
                key={invite.id}
                message={invite}
                onSuccess={handleLeagueJoinSuccess}
                onAction={() => {
                  // Action on league invite refreshes all data, including league messages and global unread count
                  setDataFetched(false); // Reset flag to trigger refetch
                  if (user?.id) {
                    fetchAllData(user.id);
                  }
                  refetchUnreadMessages();
                }}
              />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            {dataLoading ? <SectionLoader /> : <MyClubsList clubs={myClubs} />}
          </div>
          <div>
            {dataLoading ? <SectionLoader /> : <PendingInvitesList
              invites={pendingInvites} // Still passes ClubMember objects to PendingInvitesList
              onAccept={(id) => handleClubInvitation(id, true)}
              onDecline={(id) => handleClubInvitation(id, false)}
            />}
          </div>
          <div className="lg:col-span-2">
            <MyTournamentsList clubIds={myClubIds} allClubs={clubs} />
          </div>
        </div>
      </div>
    </div>
  );
}

// A small component for inline loading states
const SectionLoader = () => (
  <Card className="tool-card-bg border-0 elegant-shadow">
    <CardContent className="flex items-center justify-center p-12">
      <RefreshCw className="w-6 h-6 animate-spin main-text" />
    </CardContent>
  </Card>
);
