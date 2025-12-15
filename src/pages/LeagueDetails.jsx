
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import {
  ArrowLeft, User as UserIcon, Info, Trophy,
  RefreshCw, Trash2, Play, Settings, Wrench, Clock, Target,
  Users, FileText, UserPlus, Loader2, MoreVertical
} from 'lucide-react';
import { League } from '@/entities/League';
import { Club } from '@/entities/Club';
import { Division } from '@/entities/Division';
import { LeagueParticipant } from '@/entities/LeagueParticipant';
import { LeagueMatch } from '@/entities/LeagueMatch';
import { LeagueMatchProposal } from '@/entities/LeagueMatchProposal';
import { PlayerStats } from '@/entities/PlayerStats';
import DivisionStandings from '../components/leagues/DivisionStandings';
import ArrangeLeagueMatchModal from '../components/leagues/ArrangeLeagueMatchModal';
import ReportResultModal from '../components/leagues/ReportResultModal';
import ProposalResponseModal from '../components/leagues/ProposalResponseModal';
import InviteLeagueMemberModal from '../components/leagues/InviteLeagueMemberModal';
import LeagueSettingsModal from '../components/leagues/LeagueSettingsModal';
import EditDivisionsModal from '../components/leagues/EditDivisionsModal';
import SuccessNotification from '../components/notifications/SuccessNotification';
import DeleteConfirmationModal from '@/components/ui/DeleteConfirmationModal';
import { useUser } from '../components/auth/UserProvider';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

// Function Imports
import { generateLeagueDivisions } from '@/functions/generateLeagueDivisions';
import { startLeague } from '@/functions/startLeague';
import { deleteLeague } from '@/functions/deleteLeague';
import { resetLeague } from '@/functions/resetLeague';
import { fixLeagueMatchData } from '@/functions/fixLeagueMatchData';
import { inspectLeagueMatches } from '@/functions/inspectLeagueMatches';
import { activateLeagueParticipants } from '@/functions/activateLeagueParticipants';

export default function LeagueDetailsPage() {
  const { user, loading: userLoading } = useUser();
  const [league, setLeague] = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [playerStats, setPlayerStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal states
  const [selectedLeagueMatch, setSelectedLeagueMatch] = useState(null);
  const [isArrangeModalOpen, setIsArrangeModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [proposalToRespond, setProposalToRespond] = useState(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isEditDivisionsModalOpen, setIsEditDivisionsModalOpen] = useState(false);


  // Action states
  const [startingLeague, setStartingLeague] = useState(false);
  const [generatingDivisions, setGeneratingDivisions] = useState(false);
  const [resettingLeague, setResettingLeague] = useState(false);


  const location = useLocation();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(location.search);
  const leagueId = urlParams.get('id');

  // Computed values with safe defaults
  const isAdmin = useMemo(() => {
    if (!user?.id || !league?.admin_user_id) return false;
    return user.role === 'admin' || league.admin_user_id === user.id;
  }, [user?.id, user?.role, league?.admin_user_id]);

  const activeParticipants = useMemo(() => {
    return participants.filter(p => p?.status === 'active' || p?.status === 'registered') || [];
  }, [participants]);

  const hasEnoughParticipants = useMemo(() => {
    if (!league?.players_per_division) return false;
    return activeParticipants.length >= (league.players_per_division || 2);
  }, [activeParticipants.length, league?.players_per_division]);

  // Resilient data fetching
  const fetchLeagueData = useCallback(async () => {
    if (!leagueId) {
      setError('No league ID provided.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Primary data fetch - all must succeed
      const [leagueData, participantsData, divisionsData, matchesData] = await Promise.all([
        League.get(leagueId).catch(e => {
          console.error('Failed to fetch league:', e);
          throw new Error('League not found');
        }),
        LeagueParticipant.filter({ league_id: leagueId }).catch(e => {
          console.warn('Failed to fetch participants:', e);
          return [];
        }),
        Division.filter({ league_id: leagueId }).catch(e => {
          console.warn('Failed to fetch divisions:', e);
          return [];
        }),
        LeagueMatch.filter({ league_id: leagueId }).catch(e => {
          console.warn('Failed to fetch matches:', e);
          return [];
        })
      ]);

      let finalLeagueData = leagueData;
      if (leagueData?.club_id) {
        try {
          const clubData = await Club.get(leagueData.club_id);
          if (clubData) {
            finalLeagueData = { ...leagueData, club: clubData };
          }
        } catch (e) {
          console.warn('Failed to fetch club for league:', e);
        }
      }

      setLeague(finalLeagueData);
      setParticipants(participantsData || []);
      setDivisions((divisionsData || []).sort((a, b) => (a?.division_number || 0) - (b?.division_number || 0)));
      setMatches(matchesData || []);

      // Secondary data fetch (non-blocking)
      if (participantsData?.length > 0) {
        const userIds = participantsData.map(p => p?.user_id).filter(Boolean);
        if (userIds.length > 0) {
          PlayerStats.filter({ user_id: { '$in': userIds } })
            .then(stats => setPlayerStats(stats || []))
            .catch(e => console.warn('Failed to fetch player stats:', e));
        }
      }

      if (user?.id) {
        LeagueMatchProposal.filter({
          $or: [{ proposer_id: user.id }, { recipient_id: user.id }],
          status: 'pending'
        })
          .then(proposalsData => setProposals(proposalsData || []))
          .catch(e => console.warn('Failed to fetch proposals:', e));
      }

    } catch (error) {
      console.error('Critical error loading league:', error);
      setError(error?.message || 'Failed to load league data');
    } finally {
      setLoading(false);
    }
  }, [leagueId, user?.id]);

  const handleInvitesSent = useCallback((message) => {
    console.log('League invites sent, showing success message:', message);
    setSuccessMessage(message || 'Invites sent successfully!');
    setIsInviteModalOpen(false);
    fetchLeagueData();
  }, [fetchLeagueData]);

  useEffect(() => {
    if (!userLoading) {
      fetchLeagueData();
    }
  }, [fetchLeagueData, userLoading]);

  // Match action handlers
  const handleArrangeMatch = useCallback((leagueMatch) => {
    if (!leagueMatch) return;
    setSelectedLeagueMatch(leagueMatch);
    setIsArrangeModalOpen(true);
  }, []);

  const handleReportResult = useCallback((leagueMatch) => {
    if (!leagueMatch) return;
    setSelectedLeagueMatch(leagueMatch);
    setIsReportModalOpen(true);
  }, []);

  const handleRespondToProposal = useCallback((proposal) => {
    if (!proposal) return;
    setProposalToRespond(proposal);
  }, []);

  const handleMatchUpdate = useCallback(() => {
    fetchLeagueData();
  }, [fetchLeagueData]);

  const closeArrangeModal = useCallback(() => {
    setIsArrangeModalOpen(false);
    setSelectedLeagueMatch(null);
  }, []);

  const closeReportModal = useCallback(() => {
    setIsReportModalOpen(false);
    setSelectedLeagueMatch(null);
  }, []);

  const closeProposalModal = useCallback(() => {
    setProposalToRespond(null);
  }, []);

  // Action handlers
  const handleGenerateDivisions = async () => {
    if (!league?.id) return;
    setGeneratingDivisions(true);
    try {
        const response = await generateLeagueDivisions({ league_id: league.id });
        setSuccessMessage(response.data.message || 'Divisions generated successfully!');
        fetchLeagueData();
    } catch (error) {
        alert(`Failed to generate divisions: ${error?.response?.data?.error || error.message || 'Unknown error'}`);
    } finally {
        setGeneratingDivisions(false);
    }
  };

  const handleStartLeague = async () => {
    if (!league?.id || !hasEnoughParticipants) { // Retaining hasEnoughParticipants check
      alert('League must be in "Registration Open" status and have enough participants to start.');
      return;
    }
    if (league.status !== 'registration_open') {
      alert('League must be in "Registration Open" status to start.');
      return;
    }

    setStartingLeague(true);
    try {
      await startLeague({ league_id: league.id });
      setSuccessMessage('League started successfully!');
      fetchLeagueData();
    } catch (error) {
      alert(`Failed to start league: ${error?.message || 'Unknown error'}`);
    } finally {
      setStartingLeague(false);
    }
  };

  const handleOpenRegistration = async () => {
    if (!league?.id) return;

    try {
      await League.update(league.id, { status: 'registration_open' });
      setSuccessMessage('League registration is now open! You can now start the league when ready.');
      fetchLeagueData();
    } catch (error) {
      alert(`Failed to open registration: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDeleteLeague = async () => {
    if (!league?.id) return;

    try {
      await deleteLeague({ league_id: league.id });
      setSuccessMessage('League deleted successfully!');
      navigate(createPageUrl('Clubs'));
    } catch (error) {
      alert(`Failed to delete league: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  const handleResetLeague = async () => {
    if (!league?.id) return;

    if (!window.confirm('Are you sure you want to reset this league? This will clear all matches and results.')) {
      return;
    }

    setResettingLeague(true);
    try {
      await resetLeague({ league_id: league.id });
      setSuccessMessage('League reset successfully!');
      fetchLeagueData();
    } catch (error) {
      alert(`Failed to reset league: ${error?.message || 'Unknown error'}`);
    } finally {
      setResettingLeague(false);
    }
  };

  const handleFixMatches = async () => {
    if (!league?.id) return;

    try {
      await fixLeagueMatchData({ league_id: league.id });
      setSuccessMessage('League matches fixed successfully!');
      fetchLeagueData();
    } catch (error) {
      alert(`Failed to fix matches: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleInspectMatches = async () => {
    if (!league?.id) return;

    try {
      const result = await inspectLeagueMatches({ league_id: league.id });
      console.log('League matches inspection:', result);
      setSuccessMessage('Check console for match inspection results.');
    } catch (error) {
      alert(`Failed to inspect matches: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleActivateParticipants = async () => {
    if (!league?.id) return;

    try {
      await activateLeagueParticipants({ league_id: league.id });
      setSuccessMessage('Registered participants activated successfully!');
      fetchLeagueData();
    } catch (error) {
      alert(`Failed to activate participants: ${error?.message || 'Unknown error'}`);
    }
  };


  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e5e4cd' }}>
      {/* League Masthead - Full width at top */}
      {league?.masthead_url && (
        <div className="w-full h-48 sm:h-64 lg:h-80 overflow-hidden">
          <img
            src={league.masthead_url}
            alt={`${league.name} masthead`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6">

        {/* Back Button */}
        <div className="flex items-center justify-between mb-6">
          <Link to={createPageUrl(`ClubDetails?id=${league?.club_id}`)} className="flex items-center gap-2 hover:opacity-70 transition-colors" style={{ color: '#5a3217' }}>
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {league?.club?.name || 'Club'}</span>
          </Link>
        </div>

        {/* Success Notification */}
        <SuccessNotification
          title="Success!"
          message={successMessage}
          onClose={() => setSuccessMessage('')}
        />

        {userLoading || loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin main-text" />
          </div>
        ) : error ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-bold main-text mb-4">Error</h2>
            <p className="main-text mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate(createPageUrl('Clubs'))} variant="outline">
                Back to Clubs
              </Button>
              <Button onClick={fetchLeagueData} style={{ backgroundColor: '#5a3217', color: '#e5e4cd' }}>
                Try Again
              </Button>
            </div>
          </div>
        ) : !league ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 main-text opacity-50" />
            <h2 className="text-2xl font-bold main-text mb-2">League Not Found</h2>
            <p className="main-text opacity-70">The league you're looking for doesn't exist or you don't have permission to view it.</p>
            <Button onClick={() => navigate(createPageUrl('Clubs'))} className="mt-4" style={{ backgroundColor: '#5a3217', color: '#e5e4cd' }}>
              Back to Clubs
            </Button>
          </div>
        ) : (
          <>
            {/* League Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                {league.club?.logo_url && (
                  <img
                    src={league.club.logo_url}
                    alt={`${league.name} logo`}
                    className="w-16 h-16 object-contain rounded bg-white p-2"
                  />
                )}
                <div>
                  <h1 className="font-abolition text-3xl sm:text-4xl text-[#5a3217]">{league.name}</h1>
                  <p className="main-text opacity-80">{league.description}</p>

                  <div className="flex items-center gap-3 mt-3">
                    {league?.status && (
                      <Badge
                        className={`${
                          league.status === 'in_progress' ? 'bg-green-500' :
                          league.status === 'registration_open' ? 'bg-blue-500' :
                          league.status === 'completed' ? 'bg-gray-500' :
                          'bg-yellow-500'
                        } text-white`}
                      >
                        {league.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    )}

                    <div className="text-sm main-text opacity-70">
                      {participants?.length || 0} participant{(participants?.length || 0) !== 1 ? 's' : ''}
                      {league?.players_per_division && (
                        ` • ${league.players_per_division} per division`
                      )}
                    </div>
                  </div>

                  {league?.status === 'draft' && !hasEnoughParticipants && (
                    <Alert className="mt-4 bg-yellow-50 border-yellow-200">
                      <AlertDescription className="text-yellow-800">
                        Need at least {league?.players_per_division || 2} participants to open registration or start the league.
                        Currently have {activeParticipants?.length || 0}.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              {/* Admin Controls */}
              {isAdmin && (
                <div className="flex flex-wrap gap-2">
                   {league.status === 'draft' && (
                    <Button
                      onClick={() => setIsInviteModalOpen(true)}
                      style={{ backgroundColor: '#007e81', color: 'white' }}
                      className="flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Invite Players
                    </Button>
                  )}

                  {league.status === 'draft' && hasEnoughParticipants && (
                    <Button
                      onClick={handleOpenRegistration}
                      style={{ backgroundColor: '#f26222', color: 'white' }}
                      className="flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Open Registration
                    </Button>
                  )}

                  {league.status === 'registration_open' && (
                     <Button
                        onClick={handleGenerateDivisions}
                        disabled={generatingDivisions || !hasEnoughParticipants}
                        style={{ backgroundColor: '#007e81', color: 'white' }}
                        className="flex items-center gap-2"
                    >
                        {generatingDivisions ? (
                            <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating...</>
                        ) : (
                            <><Wrench className="w-4 h-4" /> Generate Divisions</>
                        )}
                    </Button>
                  )}

                  {league.status === 'registration_open' && hasEnoughParticipants && (
                    <Button
                      onClick={handleStartLeague}
                      disabled={startingLeague}
                      style={{ backgroundColor: '#f26222', color: 'white' }}
                      className="flex items-center gap-2"
                    >
                      {startingLeague ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Start League
                        </>
                      )}
                    </Button>
                  )}
                  
                  {divisions.length > 0 && league.status === 'registration_open' && (
                     <Button
                        onClick={() => setIsEditDivisionsModalOpen(true)}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <Settings className="w-4 h-4" />
                        Edit Divisions
                    </Button>
                  )}


                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setIsSettingsModalOpen(true)}>
                        <Settings className="w-4 h-4 mr-2" />
                        League Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleResetLeague} disabled={resettingLeague}>
                        {resettingLeague ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Reset League
                      </DropdownMenuItem>
                      {participants.some(p => p?.status === 'registered') && (
                        <DropdownMenuItem onClick={handleActivateParticipants}>
                          <UserIcon className="w-4 h-4 mr-2" />
                          Activate Registered
                        </DropdownMenuItem>
                      )}
                      {user?.role === 'admin' && (
                        <>
                          <DropdownMenuItem onClick={handleFixMatches}>
                            <Settings className="w-4 h-4 mr-2" />
                            Fix Matches
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleInspectMatches}>
                            <Wrench className="w-4 h-4 mr-2" />
                            Inspect Matches
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem onClick={() => setIsDeleteModalOpen(true)} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete League
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {/* League Information Panel */}
            <Card className="tool-card-bg border-0 elegant-shadow mb-6">
              <CardHeader>
                <CardTitle className="main-text uppercase flex items-center gap-3">
                  <Info className="w-6 h-6" />
                  League Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className="bg-white/20 p-4 rounded-lg text-center">
                    <Trophy className="w-6 h-6 mx-auto mb-2" style={{ color: '#5a3217' }} />
                    <p className="text-xs main-text opacity-70">Status</p>
                    <p className="font-bold main-text capitalize">{league?.status?.replace('_', ' ') || 'Draft'}</p>
                  </div>

                  <div className="bg-white/20 p-4 rounded-lg text-center">
                    <FileText className="w-6 h-6 mx-auto mb-2" style={{ color: '#5a3217' }} />
                    <p className="text-xs main-text opacity-70">Format</p>
                    <p className="font-bold main-text capitalize">{league?.format?.replace('_', ' ') || 'Round Robin'}</p>
                  </div>

                  <div className="bg-white/20 p-4 rounded-lg text-center">
                    <Users className="w-6 h-6 mx-auto mb-2" style={{ color: '#5a3217' }} />
                    <p className="text-xs main-text opacity-70">Active</p>
                    <p className="font-bold main-text">{activeParticipants?.length || 0}</p>
                  </div>

                  <div className="bg-white/20 p-4 rounded-lg text-center">
                    <UserIcon className="w-6 h-6 mx-auto mb-2" style={{ color: '#5a3217' }} />
                    <p className="text-xs main-text opacity-70">Total</p>
                    <p className="font-bold main-text">{participants?.length || 0}</p>
                  </div>

                  <div className="bg-white/20 p-4 rounded-lg text-center">
                    <Target className="w-6 h-6 mx-auto mb-2" style={{ color: '#5a3217' }} />
                    <p className="text-xs main-text opacity-70">Match Length</p>
                    <p className="font-bold main-text">{league?.default_target_score || 5} pts</p>
                  </div>

                  <div className="bg-white/20 p-4 rounded-lg text-center">
                    <Clock className="w-6 h-6 mx-auto mb-2" style={{ color: '#5a3217' }} />
                    <p className="text-xs main-text opacity-70">Clock</p>
                    <p className="font-bold main-text">{league?.default_use_clock ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                {(league?.start_date || league?.end_date || league?.registration_end_date) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
                    {league?.start_date && (
                      <div className="text-center">
                        <p className="text-xs main-text opacity-70">Start Date</p>
                        <p className="font-bold main-text">{new Date(league.start_date).toLocaleDateString()}</p>
                      </div>
                    )}

                    {league?.end_date && (
                      <div className="text-center">
                        <p className="text-xs main-text opacity-70">End Date</p>
                        <p className="font-bold main-text">{new Date(league.end_date).toLocaleDateString()}</p>
                      </div>
                    )}

                    {league?.registration_end_date && (
                      <div className="text-center">
                        <p className="text-xs main-text opacity-70">Registration Closes</p>
                        <p className="font-bold main-text">{new Date(league.registration_end_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fixtures and Tables */}
            <div className="space-y-8">
              {divisions?.length > 0 ? (
                divisions.map(division => {
                  const divisionParticipants = participants.filter(p => p?.division_id === division?.id);
                  const divisionMatches = matches.filter(m => m?.division_id === division?.id);

                  return (
                    <DivisionStandings
                      key={division?.id}
                      league={league}
                      division={division}
                      participants={divisionParticipants}
                      matches={divisionMatches}
                      onMatchUpdate={handleMatchUpdate}
                      onArrangeMatch={handleArrangeMatch}
                      onReportResult={handleReportResult}
                      onRespondToProposal={handleRespondToProposal}
                    />
                  );
                })
              ) : (
                 <Card className="tool-card-bg border-0 elegant-shadow">
                    <CardContent className="p-6">
                      <div className="text-center p-8 main-text">
                        <p className="text-lg opacity-70">No divisions created yet.</p>
                        {isAdmin && (
                          <p className="text-sm opacity-60 mt-2">Generate divisions to see fixtures and tables.</p>
                        )}
                      </div>
                    </CardContent>
                </Card>
              )}
            </div>
          </>
        )}

        {/* Modals */}
        <EditDivisionsModal
            isOpen={isEditDivisionsModalOpen}
            onClose={() => setIsEditDivisionsModalOpen(false)}
            league={league}
            divisions={divisions}
            participants={participants}
            onUpdate={handleMatchUpdate}
        />

        {selectedLeagueMatch && (
          <ArrangeLeagueMatchModal
            isOpen={isArrangeModalOpen}
            onClose={closeArrangeModal}
            match={selectedLeagueMatch}
            onProposalSent={(message) => {
              setSuccessMessage(message);
              closeArrangeModal();
              handleMatchUpdate();
            }}
          />
        )}

        {selectedLeagueMatch && (
          <ReportResultModal
            isOpen={isReportModalOpen}
            onClose={closeReportModal}
            match={selectedLeagueMatch}
            user={user}
            onResultReported={() => {
              setSuccessMessage('Match result reported successfully!');
              closeReportModal();
              handleMatchUpdate();
            }}
          />
        )}

        {proposalToRespond && (
          <ProposalResponseModal
            isOpen={!!proposalToRespond}
            onClose={closeProposalModal}
            proposal={proposalToRespond}
            user={user}
            onAction={(message) => {
              setSuccessMessage(message || 'Proposal action completed.');
              closeProposalModal();
              handleMatchUpdate();
            }}
          />
        )}

        {league && (
          <InviteLeagueMemberModal
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
            league={league}
            onInvitesSent={handleInvitesSent}
          />
        )}
        
        {league && ( 
          <LeagueSettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            league={league}
            onUpdate={handleMatchUpdate} 
          />
        )}

        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteLeague}
          title="Delete League"
          message={`Are you sure you want to delete the league "${league?.name}"? This action cannot be undone and will remove all associated matches and data.`}
        />
      </div>
    </div>
  );
}
