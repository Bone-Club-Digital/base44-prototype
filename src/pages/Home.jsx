import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Gamepad2, PlusCircle, LogIn, RefreshCw, Clock, Trash2, User as UserIcon, Star, Video, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { GameSession } from '@/entities/GameSession';
import { base44 } from '@/api/base44Client';
import { Message } from '@/entities/Message';
import { ScheduledMatch } from '@/entities/ScheduledMatch';
import { LeagueParticipant } from '@/entities/LeagueParticipant';
import { HomeBanner } from '@/entities/HomeBanner';
import { useUser } from '../components/auth/UserProvider';
import CreateGameModal from '../components/lobby/CreateGameModal';
import Leaderboard from '../components/lobby/Leaderboard';
import { Badge } from '@/components/ui/badge';
import UsernameSetupModal from '../components/lobby/UsernameSetupModal';
import { getPublicLobbyData } from '@/functions/getPublicLobbyData';
import HomeSlider from '../components/lobby/HomeSlider';
import FriendActionModal from '../components/friends/FriendActionModal';
import FriendMatchmakingPanel from '../components/friends/FriendMatchmakingPanel';
import InviteFriendPanel from '../components/friends/InviteFriendPanel'; 
import SuccessNotification from '../components/notifications/SuccessNotification';
import LeagueInvitationCard from '../components/leagues/LeagueInvitationCard';
import LeagueProposalNotificationCard from '../components/leagues/LeagueProposalNotificationCard';
import { getLeagueProposalsForUser } from '@/functions/getLeagueProposalsForUser';
import ScheduledMatchInvitationNotifications from '../components/notifications/ScheduledMatchInvitationNotifications';
import TournamentInvitationCard from '../components/tournaments/TournamentInvitationCard';
import { cleanupAbandonedGames } from '@/functions/cleanupAbandonedGames';
import { cleanupStuckChallenges } from '@/functions/cleanupStuckChallenges';
import { cleanupStaleFriendRequests } from '@/functions/cleanupStaleFriendRequests';
import { debugFriendRequestData } from '@/functions/debugFriendRequestData';
import ClubInvitationNotifications from '../components/notifications/ClubInvitationNotifications';
import FriendRequestNotifications from '../components/notifications/FriendRequestNotifications'; // Ensure this points to the right component

export default function LobbyPage() {
  const { user, plan, loading: userLoading, refetchUser, refetchUnreadMessages } = useUser();
  const [allPlayers, setAllPlayers] = useState([]);
  const [openGames, setOpenGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [pendingFriendRequests, setPendingFriendRequests] = useState([]);
  const [pendingMatchInvites, setPendingMatchInvites] = useState([]);
  const [pendingLeagueInvites, setPendingLeagueInvites] = useState([]);
  const [pendingTournamentInvites, setPendingTournamentInvites] = useState([]);
  const [leagueProposals, setLeagueProposals] = useState([]);
  const [mastheadContent, setMastheadContent] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [cleanupSuccessMessage, setCleanupSuccessMessage] = useState('');
  const [friendCleanupMessage, setFriendCleanupMessage] = useState('');
  const [leagueSuccessMessage, setLeagueSuccessMessage] = useState('');
  const [joinedLeagueId, setJoinedLeagueId] = useState(null);
  const [clubSuccessMessage, setClubSuccessMessage] = useState('');
  const [joinedClubId, setJoinedClubId] = useState(null);
  const [modalState, setModalState] = useState({ isOpen: false, type: null, friendName: '', memberData: null });
  const navigate = useNavigate();
  const gamePollInterval = useRef(null);

  const GAMES_PER_PAGE = 10;

  const STARTING_POSITION = {
    24: { color: 'teal', count: 2 }, 13: { color: 'teal', count: 5 }, 8: { color: 'teal', count: 3 }, 6: { color: 'teal', count: 5 },
    1: { color: 'bone', count: 2 }, 12: { color: 'bone', count: 5 }, 17: { color: 'bone', count: 3 }, 19: { color: 'bone', count: 5 }
  };

  const colorPalette = {
    tobacco: '#5a3217',
    tangerine: '#f26222',
    bone: '#e5e4cd',
    teal: '#007e81',
    turquoise: '#9fd3ba',
  };

  const alignmentClasses = {
    left: 'justify-start items-center text-left',
    center: 'justify-center items-center text-center',
    right: 'justify-end items-center text-right',
  };

  // Fetch notifications in the background
  const fetchPendingNotifications = useCallback(async () => {
    if (!user) {
      setPendingInvitations([]);
      setPendingFriendRequests([]);
      setPendingMatchInvites([]);
      setPendingLeagueInvites([]);
      setPendingTournamentInvites([]);
      return;
    }

    try {
      // Limit the number of messages fetched and add timeout
      const messages = await Promise.race([
        Message.filter({ recipient_id: user.id, status: 'unread' }, '-created_date', 20),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]);
      
      const pendingClubInvites = messages.filter(m => 
        m.related_entity_type === 'ClubMember' && 
        m.type === 'notification'
      );
      
      const pendingFriendReqs = messages.filter(m => 
        m.related_entity_type === 'FriendRequest' && 
        m.type === 'notification'
      );

      const pendingScheduledMatchInvitesMessages = messages.filter(m => 
        m.related_entity_type === 'ScheduledMatch' && 
        m.type === 'notification' &&
        m.subject && m.subject.includes('invitation')
      );

      const pendingLeagueInvitesMessages = messages.filter(m => 
        m.related_entity_type === 'LeagueParticipant' && 
        m.type === 'notification' &&
        m.subject && m.subject.includes('League Invitation')
      );

      const pendingTournamentInvitesMessages = messages.filter(m =>
        m.related_entity_type === 'TournamentParticipant' &&
        m.type === 'notification' &&
        m.subject && m.subject.includes('Tournament Invitation')
      );

      // Validate league invitations to prevent errors with deleted participants
      if (pendingLeagueInvitesMessages.length > 0) {
        try {
          const validationPromises = pendingLeagueInvitesMessages.map(async (message) => {
            try {
              await LeagueParticipant.get(message.related_entity_id);
              return message; // Return the message if the participant exists
            } catch (error) {
              if (error.response && error.response.status === 404) {
                // Participant was deleted, mark message as read to clean up
                try {
                  await Message.update(message.id, { status: 'read' });
                } catch (updateError) {
                  console.warn('Could not clean up stale league invitation message:', updateError);
                }
                return null; // Return null for deleted participants
              }
              throw error; // Re-throw non-404 errors
            }
          });

          const validationResults = await Promise.allSettled(validationPromises);
          const validLeagueInvites = validationResults
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map(result => result.value);

          setPendingLeagueInvites(validLeagueInvites);
        } catch (error) {
          console.warn('Error validating league invitations:', error);
          setPendingLeagueInvites([]); // Set empty array on error
        }
      } else {
        setPendingLeagueInvites([]);
      }
      
      setPendingTournamentInvites(pendingTournamentInvitesMessages);

      // Enrich scheduled match invites with full match details
      if (pendingScheduledMatchInvitesMessages.length > 0) {
        const matchIds = pendingScheduledMatchInvitesMessages.map(m => m.related_entity_id).filter(Boolean);
        if (matchIds.length > 0) {
            const scheduledMatches = await ScheduledMatch.filter({ id: { '$in': matchIds } });
            const matchesMap = new Map(scheduledMatches.map(match => [match.id, match]));
            
            const enrichedInvites = pendingScheduledMatchInvitesMessages.map(message => ({
                ...message,
                scheduledMatch: matchesMap.get(message.related_entity_id) || null
            })).filter(invite => invite.scheduledMatch);

            setPendingMatchInvites(enrichedInvites);
        } else {
             setPendingMatchInvites([]);
        }
      } else {
        setPendingMatchInvites([]);
      }

      setPendingInvitations(pendingClubInvites);
      setPendingFriendRequests(pendingFriendReqs);
      
    } catch (error) {
      console.warn("Failed to fetch pending notifications:", error.message);
      setPendingInvitations([]);
      setPendingFriendRequests([]);
      setPendingMatchInvites([]);
      setPendingLeagueInvites([]);
      setPendingTournamentInvites([]);
    }
  }, [user]);

  // Fetch masthead content from first banner
  useEffect(() => {
    const fetchMastheadContent = async () => {
      try {
        const banners = await HomeBanner.filter({ is_active: true });
        const sortedBanners = banners.sort((a, b) => a.sort_order - b.sort_order);
        if (sortedBanners.length > 0) {
          setMastheadContent(sortedBanners[0]);
        }
      } catch (error) {
        console.error("Failed to fetch masthead content:", error);
      }
    };
    fetchMastheadContent();
  }, []);

  // Fetch League Match Proposals directly
  useEffect(() => {
    const fetchLeagueProposals = async () => {
      if (!user) {
        setLeagueProposals([]);
        return;
      }
      
      try {
        const { data } = await getLeagueProposalsForUser();
        setLeagueProposals(data || []);
      } catch (error) {
        console.warn("Could not fetch league proposals (subscription required):", error);
        setLeagueProposals([]);
      }
    };

    if (user && !userLoading) {
      fetchLeagueProposals();
    }
  }, [user, userLoading]);

  // Fetch games data
  const fetchGamesData = useCallback(async () => {
    setGamesLoading(true);
    try {
      const response = await Promise.race([
        getPublicLobbyData(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Lobby data timeout')), 5000))
      ]);

      const { openGames: fetchedOpenGames } = response.data;
      setOpenGames(fetchedOpenGames?.slice(0, 50) || []);
    } catch (error) {
      console.error("Failed to load games data:", error);
      setOpenGames([]);
    } finally {
      setGamesLoading(false);
    }
  }, []);

  // Fetch players data
  const fetchPlayersData = useCallback(async () => {
    setPlayersLoading(true);
    try {
      const response = await Promise.race([
        getPublicLobbyData(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Lobby data timeout')), 5000))
      ]);

      const { allPlayers: fetchedAllPlayers } = response.data;
      setAllPlayers(fetchedAllPlayers?.slice(0, 100) || []);
    } catch (error) {
      console.error("Failed to load players data:", error);
      setAllPlayers([]);
    } finally {
      setPlayersLoading(false);
    }
  }, []);

  const handleCreateGame = async (settings) => {
    if (!user) {
        alert("You must be logged in to create a game.");
        return;
    }

    try {
        if (settings.bones_stake > 0) {
            await base44.auth.updateMe({
                bones_balance: user.bones_balance - settings.bones_stake,
            });
            refetchUser(); // Refetch user after updating balance
        }

        const gamePayload = {
            player_teal_id: user.id,
            status: 'waiting_for_opponent',
            bones_stake: settings.bones_stake,
            match_state: {
                target_score: settings.target_score,
                use_clock: settings.use_clock,
                use_video_chat: settings.use_video_chat,
                video_chat_url: settings.video_chat_url,
                initial_time_seconds: settings.initial_time_seconds,
                increment_seconds: settings.increment_seconds,
                player_teal_time_remaining: settings.initial_time_seconds,
                player_bone_time_remaining: settings.initial_time_seconds,
                player_teal_score: 0,
                player_bone_score: 0,
                is_rated: settings.is_rated,
            },
            game_state: {
                board: STARTING_POSITION,
                dice: [0, 0],
                turn: 'teal',
                last_roll: null,
                moves: [],
                winner: null,
                checkers_off: { teal: 0, bone: 0 },
                doubling_cube: {
                    value: 1,
                    owner: null,
                    position: 'center',
                },
            }
        };

        const newGame = await GameSession.create(gamePayload);
        fetchGamesData();
        setCreateModalOpen(false);
    } catch (error) {
        console.error("Error creating game:", error);
        alert(`Failed to create game: ${error.message || 'Please try again.'}`);
        if (settings.bones_stake > 0) {
            refetchUser(); 
        }
    }
  };

  const handleFriendRequestAction = useCallback((action, friendName) => {
    if (action === 'accepted') {
      setModalState({
        isOpen: true,
        type: 'accept_success',
        friendName: friendName,
        memberData: null
      });
    } else if (action === 'declined') {
      // Optional: Add feedback for declined if needed, or simply refresh
    } else if (action === 'refresh') {
      // Stale request detected - just refresh notifications silently
      console.log('Refreshing notifications due to stale friend request');
    }
    // Always refresh data after an action on friend requests
    fetchPendingNotifications();
    refetchUnreadMessages();
  }, [fetchPendingNotifications, refetchUnreadMessages]);

  // Check for challenge accepted success message from localStorage
  useEffect(() => {
    const checkForChallengeSuccess = () => {
      const storedSuccess = localStorage.getItem('challengeAcceptedSuccess');
      if (storedSuccess) {
        try {
          const { message, timestamp } = JSON.parse(storedSuccess);
          // Only show if message is less than 5 minutes old
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            setSuccessMessage(message);
          }
          localStorage.removeItem('challengeAcceptedSuccess');
        } catch (error) {
          console.error('Error parsing challenge success message:', error);
          localStorage.removeItem('challengeAcceptedSuccess');
        }
      }
    };

    checkForChallengeSuccess();
  }, []);

  const handleMatchArranged = (opponentName, type = 'scheduled') => {
    if (type === 'instant') {
        setSuccessMessage(`Your instant challenge to ${opponentName} has been sent! The game is waiting in My Games.`);
    } else {
        setSuccessMessage(`Your match invitation has been sent to ${opponentName}. Waiting for them to accept. You can see the game status in My Games.`);
    }
  };

  const handleSuccessAction = () => {
    navigate(createPageUrl('MyGames'));
    setSuccessMessage('');
  };

  const closeModal = useCallback(() => {
    setModalState({ isOpen: false, type: null, friendName: '', memberData: null });
  }, []);

  // Show username modal only if user is logged in but doesn't have username
  useEffect(() => {
    if (!userLoading && user && !user.username) {
      setShowUsernameModal(true);
    }
  }, [user, userLoading]);

  // Quick active game check and initial data loading
  useEffect(() => {
    const setupLobby = async () => {
      if (userLoading) return;
      
      if (user) {
        try {
          const activeGamePromise = Promise.race([
            GameSession.filter({
              $or: [{ player_teal_id: user.id }, { player_bone_id: user.id }],
              status: { $in: ['in_progress', 'waiting_for_start'] }
            }, '-created_date', 1),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
          ]);
          
          const activeGames = await activeGamePromise;
          if (activeGames.length > 0) {
            navigate(createPageUrl(`Game?id=${activeGames[0].id}`));
            return;
          }
        } catch (error) {
          console.warn("Quick active game check failed, continuing...", error.message);
        }

        fetchPendingNotifications();
      }

      fetchGamesData();
      fetchPlayersData();
    };

    setupLobby();
  }, [user, userLoading, navigate, fetchPendingNotifications, fetchGamesData, fetchPlayersData]);

  // Simplified polling for games only
  useEffect(() => {
    if (userLoading || !user) {
      if (gamePollInterval.current) clearInterval(gamePollInterval.current);
      return;
    }

    if (gamePollInterval.current) clearInterval(gamePollInterval.current);

    const pollForGames = async () => {
      try {
        const [createdGames, joinedGames] = await Promise.all([
          GameSession.filter({ player_teal_id: user.id, status: 'waiting_for_start' }, '-created_date', 1),
          GameSession.filter({ player_bone_id: user.id, status: 'waiting_for_start' }, '-created_date', 1)
        ]);

        if (createdGames.length > 0 || joinedGames.length > 0) {
          const gameToJoin = createdGames[0] || joinedGames[0];
          navigate(createPageUrl(`Game?id=${gameToJoin.id}`));
          return;
        }
        
        fetchGamesData();
        cleanupAbandonedGames().catch(err => console.warn('Cleanup skipped (subscription required)'));
        
      } catch (error) {
        console.warn("Game polling error:", error.message);
      }
    };

    gamePollInterval.current = setInterval(pollForGames, 15000);

    return () => {
      if (gamePollInterval.current) clearInterval(gamePollInterval.current);
    };
  }, [user, userLoading, navigate, fetchGamesData]);

  const handleLogin = () => {
    window.location.href = window.location.origin + '?redirect_to_login=true';
  };

  const handleUsernameComplete = () => {
    setShowUsernameModal(false);
    refetchUser();
  };

  const handleJoinGame = async (gameId) => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }

    const gameToJoin = openGames.find(game => game.id === gameId);
    if (!gameToJoin) {
      alert("This game is no longer available.");
      return;
    }

    if (user.bones_balance < gameToJoin.bones_stake) {
      alert("You don't have enough Bones.");
      return;
    }

    if (gameToJoin.player_teal_id === user.id) {
      navigate(createPageUrl(`Game?id=${gameId}`));
      return;
    }

    try {
      const updatePayload = { 
        player_bone_id: user.id, 
        status: 'waiting_for_start',
      };

      await GameSession.update(gameId, updatePayload);
      navigate(createPageUrl(`Game?id=${gameId}`));
    } catch (error) {
      console.error("Join game error:", error);
      alert(`Failed to join game: ${error.message || 'Please try again.'}`);
    }
  };

  const handleCancelGame = async (gameId) => {
    if (!window.confirm("Are you sure you want to cancel this match? This action cannot be undone.")) {
        return;
    }
    try {
        await GameSession.delete(gameId);
        setOpenGames(prevGames => prevGames.filter(g => g.id !== gameId));
    } catch (error) {
        console.error("Error cancelling game:", error);
        alert(`Failed to cancel match: ${error.message || 'Please try again.'}`);
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(openGames.length / GAMES_PER_PAGE);
  const startIndex = (currentPage - 1) * GAMES_PER_PAGE;
  const endIndex = startIndex + GAMES_PER_PAGE;
  const currentGames = openGames.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    } else if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Add cleanup function for stuck challenges
  const handleCleanupChallenges = async () => {
    try {
      const { data } = await cleanupStuckChallenges();
      console.log('Cleanup result:', data);
      setCleanupSuccessMessage(data.message || 'Cleanup process ran successfully.');
      fetchGamesData();
      fetchPendingNotifications();
      refetchUnreadMessages();
    } catch (error) {
      console.error('Cleanup failed:', error);
      setCleanupSuccessMessage('Cleanup failed: ' + (error.message || 'Unknown error'));
    }
  };

  const handleCleanupFriendRequests = async () => {
    try {
      const { data } = await cleanupStaleFriendRequests();
      setFriendCleanupMessage(data.message || 'Friend request cleanup ran successfully.');
      fetchPendingNotifications();
      refetchUnreadMessages();
    } catch (error) {
      console.error('Friend request cleanup failed:', error);
      setFriendCleanupMessage('Cleanup failed: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDebugFriendRequests = async () => {
    try {
      const { data } = await debugFriendRequestData();
      console.log('=== FRIEND REQUEST DEBUG DATA ===');
      console.log(JSON.stringify(data, null, 2));
      alert(`Debug complete! Found ${data.orphaned_messages?.length || 0} orphaned messages. Check console for details.`);
    } catch (error) {
      console.error('Debug failed:', error);
      alert('Debug failed: ' + (error.message || 'Unknown error'));
    }
  };

  // Only show loading for user authentication
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: '#5a3217' }} />
          <p className="main-text">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <FriendActionModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        type={modalState.type}
        friendName={modalState.friendName}
        onConfirm={() => {
          closeModal();
        }}
      />
      
      <div className="min-h-screen" style={{ backgroundColor: '#e5e4cd' }}>
        <CreateGameModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setCreateModalOpen(false)}
          onCreate={handleCreateGame}
          user={user}
          refetchUser={refetchUser}
        />

        <div className="relative w-full overflow-hidden" style={{ backgroundColor: '#fffcc5' }}>
          <img
            src="https://base44.app/api/apps/68db9914ea8dd293650d368a/files/public/68db9914ea8dd293650d368a/2488711b4_bones_banner_V2.png"
            alt="Bone Club Backgammon"
            className="w-full h-auto"
          />
          {mastheadContent && (
            <div className={`absolute inset-0 flex p-8 md:p-16 ${alignmentClasses[mastheadContent.content_alignment] || alignmentClasses.left}`} style={{ alignItems: 'flex-start', paddingTop: '5%' }}>
              <div className="max-w-2xl">
                {mastheadContent.title && (
                  <h2
                    className="uppercase leading-tight text-4xl md:text-6xl"
                    style={{
                      color: colorPalette.bone,
                      fontFamily: "'Tanker', 'Abolition', 'Oswald', sans-serif",
                      textShadow: 'none',
                      letterSpacing: '-0.04em'
                    }}
                  >
                    BONE CLUB BACKGAMMON
                  </h2>
                )}
                {mastheadContent.strapline && (
                  <p 
                    className="mt-2 text-base md:text-lg"
                    style={{ 
                      color: colorPalette.bone,
                      fontFamily: "'BespokeSerif', serif",
                      fontWeight: 500,
                      fontStyle: 'italic',
                      textShadow: 'none'
                    }}
                  >
                    {mastheadContent.strapline}
                  </p>
                )}
                {mastheadContent.button_text && mastheadContent.button_link && (
                  <Link to={mastheadContent.button_link}>
                    <Button
                      size="lg"
                      className="mt-6 uppercase font-bold text-lg px-8 py-4 hover:opacity-90 transition-all duration-300"
                      style={{
                        backgroundColor: colorPalette.teal,
                        color: colorPalette.bone,
                      }}
                    >
                      {mastheadContent.button_text}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          <div className="mb-12">
            <HomeSlider />

          </div>

          <div className="space-y-6">
            {/* Add cleanup and debug buttons for testing */}
            {user && (
              <div className="text-center space-x-2">
                <Button
                  onClick={handleCleanupChallenges}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Clear Stuck Challenges
                </Button>
                <Button
                  onClick={handleCleanupFriendRequests}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Delete Stale Requests
                </Button>
                <Button
                  onClick={handleDebugFriendRequests}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Debug Friend Requests
                </Button>
              </div>
            )}

            {/* Username Setup Modal */}
            {showUsernameModal && (
              <UsernameSetupModal 
                isOpen={showUsernameModal} 
                onComplete={() => {
                  setShowUsernameModal(false);
                  refetchUser();
                }} 
              />
            )}

            <SuccessNotification
              title="Success!"
              message={successMessage}
              onClose={() => setSuccessMessage('')}
              actionText="Go to My Games"
              onAction={handleSuccessAction}
            />

             <SuccessNotification
              title="Cleanup Complete"
              message={cleanupSuccessMessage}
              onClose={() => setCleanupSuccessMessage('')}
            />
            
            <SuccessNotification
              title="Cleanup Complete"
              message={friendCleanupMessage}
              onClose={() => setFriendCleanupMessage('')}
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

            {/* New Success Notification for Club Invitations */}
            <SuccessNotification
              title="Club Joined!"
              message={clubSuccessMessage}
              onClose={() => {
                setClubSuccessMessage('');
                setJoinedClubId(null);
              }}
              actionText={joinedClubId ? 'Go to Club Page' : undefined}
              onAction={joinedClubId ? () => {
                navigate(createPageUrl(`ClubDetails?id=${joinedClubId}`));
                setClubSuccessMessage('');
                setJoinedClubId(null);
              } : undefined}
            />

            {/* Tournament Invitation Notifications */}
            {user && pendingTournamentInvites.length > 0 && (
              <Card className="tool-card-bg border-0 elegant-shadow mb-6" style={{ backgroundColor: '#007e81' }}>
                <CardHeader>
                  <CardTitle className="text-bone-color flex items-center gap-3">
                    <Trophy className="w-6 h-6" />
                    You Have Pending Tournament Invitations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingTournamentInvites.map(invite => (
                    <TournamentInvitationCard
                      key={invite.id}
                      message={invite}
                      onAction={() => {
                        fetchPendingNotifications();
                        refetchUnreadMessages();
                        setSuccessMessage('Responded to tournament invitation.');
                      }}
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Friend Request Notifications */}
            {user && pendingFriendRequests.length > 0 && (
              <FriendRequestNotifications 
                friendRequests={pendingFriendRequests} 
                onAction={handleFriendRequestAction}
              />
            )}

            {/* Scheduled Match Invitations */}
            {user && pendingMatchInvites.length > 0 && (
              <ScheduledMatchInvitationNotifications 
                invites={pendingMatchInvites} 
                currentPage="home"
                onAction={() => {
                  fetchPendingNotifications();
                  refetchUnreadMessages();
                  setSuccessMessage('Successfully accepted the match challenge. Go to My Games to see your scheduled matches.');
                }}
              />
            )}

            {/* League Match Proposals */}
            {user && leagueProposals.length > 0 && (
              <LeagueProposalNotificationCard proposals={leagueProposals} />
            )}

            {/* League Invitation Notifications */}
            {user && pendingLeagueInvites.length > 0 && (
              <div className="mb-6">
                {pendingLeagueInvites.map(invite => (
                  <LeagueInvitationCard 
                    key={invite.id} 
                    message={invite} 
                    onSuccess={(successMsg, leagueId) => {
                      setLeagueSuccessMessage(successMsg);
                      setJoinedLeagueId(leagueId);
                    }}
                    onAction={() => {
                      fetchPendingNotifications();
                      refetchUnreadMessages();
                    }}
                  />
                ))}
              </div>
            )}

            {/* Club Invitation Notifications */}
            {user && pendingInvitations.length > 0 && (
              <ClubInvitationNotifications 
                invites={pendingInvitations} 
                onAction={(accepted, clubName, clubId) => {
                  if (accepted) {
                    setClubSuccessMessage(`You have successfully joined ${clubName}!`);
                    setJoinedClubId(clubId);
                  }
                  fetchPendingNotifications();
                  refetchUnreadMessages();
                }}
              />
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Left Column - Friend Panel and Open Games */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Friend Matchmaking Panel - Only for logged-in users */}
                {user && (
                  <FriendMatchmakingPanel user={user} onMatchArranged={handleMatchArranged} />
                )}
                
                {/* Welcome Section - Updated for non-logged in users */}
                {!user && (
                  <Card className="tool-card-bg border-0 elegant-shadow text-center">
                    <CardContent className="p-8">
                      <h2 className="text-3xl font-bold mb-4 main-text">Welcome to Bone Club</h2>
                      <p className="text-lg mb-6 main-text opacity-80">
                        Join the premier online backgammon community and test your skills against players worldwide.
                      </p>
                      <Button 
                        onClick={handleLogin} 
                        size="lg"
                        className="uppercase font-bold text-lg px-8 py-4"
                        style={{ backgroundColor: '#f26222', color: 'white' }}
                      >
                        <LogIn className="w-6 h-6 mr-3" />
                        Login to Play
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Open Matches Section */}
                <Card className="tool-card-bg border-0 elegant-shadow">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="main-text uppercase flex items-center gap-3">
                      <Gamepad2 className="w-6 h-6" />
                      Open Matches ({openGames.length})
                    </CardTitle>
                    {user && (
                      <Button
                        onClick={() => setCreateModalOpen(true)}
                        style={{ backgroundColor: '#f26222', color: 'white' }}
                        className="hover:opacity-90"
                      >
                        <PlusCircle className="w-5 h-5 mr-2" />
                        Create Game
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {gamesLoading ? (
                      <div className="flex justify-center p-8">
                        <RefreshCw className="w-6 h-6 animate-spin main-text" />
                      </div>
                    ) : currentGames.length > 0 ? (
                        <div className="space-y-3">
                          {currentGames.map(game => (
                            <div
                              key={game.id}
                              className="flex items-center justify-between p-4 rounded-xl bg-white/40 hover:bg-white/50 transition-colors"
                            >
                              {/* Left: Profile Picture */}
                              <div className="flex-shrink-0">
                                {game.creator?.profile_picture_url ? (
                                  <img
                                    src={game.creator.profile_picture_url}
                                    alt={game.creator.username || 'Player'}
                                    className="w-16 h-16 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
                                    <UserIcon className="w-8 h-8 text-gray-600" />
                                  </div>
                                )}
                              </div>

                              {/* Middle: Match Info */}
                              <div className="flex-grow px-4">
                                <h3 className="font-bold text-lg main-text mb-2">
                                  {game.match_state?.target_score || '?'}-point match
                                </h3>
                                
                                {/* Badges Row */}
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  {game.match_state?.use_clock && (
                                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                                      <Clock className="w-4 h-4 text-white" />
                                    </div>
                                  )}
                                  
                                  {game.match_state?.use_video_chat && (
                                    <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                                      <Video className="w-4 h-4 text-white" />
                                    </div>
                                  )}
                                  
                                  {game.bones_stake > 0 && (
                                    <div className="h-8 bg-orange-500 text-white text-sm px-3 rounded-full font-bold flex items-center">
                                      🦴 {game.bones_stake}
                                    </div>
                                  )}
                                  
                                  <div 
                                    className={`h-8 text-sm px-3 rounded-full font-medium flex items-center ${
                                      game.match_state?.is_rated === false 
                                        ? 'bg-gray-400 text-white' 
                                        : 'bg-green-500 text-white'
                                    }`}
                                  >
                                    {game.match_state?.is_rated === false ? 'Unrated' : 'Rated'}
                                  </div>
                                </div>
                                
                                {/* Created by line */}
                                <div className="flex items-center gap-2">
                                  <span className="text-sm main-text">Created by {game.creator?.username || 'Unknown'}</span>
                                  <Badge
                                    variant="outline"
                                    className="text-xs px-1 py-0 flex items-center gap-1"
                                    style={{
                                        backgroundColor: '#5a3217',
                                        color: '#e5e4cd',
                                        borderColor: '#5a3217'
                                    }}
                                  >
                                    <Star className="w-3 h-3" style={{ color: '#fbbf24' }} />
                                    {game.creator?.rating ?? 1500}
                                  </Badge>
                                </div>
                              </div>

                              {/* Right: Action Buttons */}
                              <div className="flex items-center gap-3 flex-shrink-0">
                                {user && user.id === game.player_teal_id ? (
                                  // User is the creator of this game
                                  game.status === 'waiting_for_opponent' ? (
                                    <>
                                      <Button
                                        variant="destructive"
                                        onClick={() => handleCancelGame(game.id)}
                                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        Cancel
                                      </Button>
                                      <Badge className="bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Waiting
                                      </Badge>
                                    </>
                                  ) : (
                                    <Badge className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                                      <Gamepad2 className="w-4 h-4" />
                                      Starting
                                    </Badge>
                                  )
                                ) : (
                                  // User is not the creator, show Join button
                                  <Button 
                                    onClick={() => handleJoinGame(game.id)} 
                                    className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                                  >
                                    <Gamepad2 className="w-4 h-4" />
                                    Join
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-8 main-text">{user ? 'No open matches. Create one!' : 'No open matches available.'}</div>
                      )}
                      
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-white/20">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="flex items-center gap-1"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                          </Button>
                          
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              
                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(pageNum)}
                                  className="w-8 h-8 p-0"
                                  style={currentPage === pageNum ? { backgroundColor: '#5a3217', color: '#e5e4cd' } : {}}
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="flex items-center gap-1"
                          >
                            Next
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                </Card>
              </div>

              {/* Right Column - Leaderboard */}
              <div className="space-y-6">
                {user && <InviteFriendPanel />}
                <Leaderboard topPlayers={allPlayers.slice(0, 15)} loading={playersLoading} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}