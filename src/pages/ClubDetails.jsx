
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Club } from '@/entities/Club';
import { ClubMember } from '@/entities/ClubMember';
import { PlayerStats } from '@/entities/PlayerStats';
import { ClubEvent } from '@/entities/ClubEvent';
import { ClubEventRSVP } from '@/entities/ClubEventRSVP';
import { Tournament } from '@/entities/Tournament';
import { Message } from '@/entities/Message';
import { League } from '@/entities/League';
import { Badge as BadgeEntity } from '@/entities/Badge';
import { UserBadge } from '@/entities/UserBadge';
import { useUser } from '../components/auth/UserProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Users, Calendar, Award, Settings, Trophy, ArrowLeft, Star } from 'lucide-react';
import ClubEventsList from '../components/clubs/ClubEventsList';
import ClubMembersList from '../components/clubs/ClubMembersList';
import ClubTournamentsList from '../components/tournaments/ClubTournamentsList';
import ClubMessagesList from '../components/clubs/ClubMessagesList';
import LeagueInvitationCard from '../components/leagues/LeagueInvitationCard';
import CreateLeagueModal from '../components/leagues/CreateLeagueModal';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import ClubLogoUpload from '../components/clubs/ClubLogoUpload';
import ClubMastheadUpload from '../components/clubs/ClubMastheadUpload';
import SuccessNotification from '../components/notifications/SuccessNotification';
import CreateTournamentModal from '../components/tournaments/CreateTournamentModal';

export default function ClubDetailsPage() {
    const { user, loading: userLoading, refetchUnreadMessages } = useUser();
    const location = useLocation();
    const navigate = useNavigate();
    const { clubId: clubIdFromParams } = useParams();
    const [searchParams] = useSearchParams();

    const clubIdFromQuery = searchParams.get('id');
    const clubId = clubIdFromParams || clubIdFromQuery;

    const [club, setClub] = useState(null);
    const [clubMembers, setClubMembers] = useState([]);
    const [playerStats, setPlayerStats] = useState([]);
    const [events, setEvents] = useState([]);
    const [rsvps, setRsvps] = useState([]);
    const [tournaments, setTournaments] = useState([]);
    const [messages, setMessages] = useState([]);
    const [leagues, setLeagues] = useState([]);
    const [pendingLeagueInvites, setPendingLeagueInvites] = useState([]);
    const [userBadges, setUserBadges] = useState([]);
    const [badges, setBadges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewLoading, setViewLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeView, setActiveView] = useState('events');
    const [isLeagueModalOpen, setLeagueModalOpen] = useState(false);
    const [showLogoUpload, setShowLogoUpload] = useState(false);
    const [showMastheadUpload, setShowMastheadUpload] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [isCreateTournamentModalOpen, setCreateTournamentModalOpen] = useState(false);

    const isAdmin = useMemo(() => {
        if (!user || !club) return false;
        return club.admin_id === user.id || (club.admin_ids && club.admin_ids.includes(user.id));
    }, [user, club]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const view = params.get('view');
        if (view) {
            setActiveView(view);
        }
    }, [location.search]);

    const fetchOnlyClubData = useCallback(async (force = false) => {
        if (!clubId) {
            setError("No club ID provided.");
            setLoading(false);
            return;
        }
        if (!force) setLoading(true);

        try {
            const clubData = await Club.get(clubId);
            if (!clubData) throw new Error(`Club not found. The club may have been deleted or the ID is incorrect.`);
            setClub(clubData);
        } catch (err) {
            console.error("Error fetching core club data:", err);
            setError(err.message || "Failed to load club data");
        } finally {
            if (!force) setLoading(false);
        }
    }, [clubId, setLoading, setError, setClub]);

    const fetchViewData = useCallback(async (view) => {
        if (!clubId) return;
        setViewLoading(true);
    
        try {
            switch (view) {
                case 'events': {
                    const [eventsData, rsvpsData] = await Promise.all([
                        ClubEvent.filter({ club_id: clubId }).catch(() => []),
                        ClubEventRSVP.filter({ club_id: clubId }).catch(() => [])
                    ]);
                    setEvents(eventsData || []);
                    setRsvps(rsvpsData || []);
                    break;
                }
                case 'members': {
                    const [membersData, userBadgesData, badgesData] = await Promise.all([
                        ClubMember.filter({ club_id: clubId, status: 'active' }).catch(() => []),
                        UserBadge.list().catch(() => []),
                        BadgeEntity.list().catch(() => [])
                    ]);
                    
                    // Fetch PlayerStats for each member individually
                    let statsData = [];
                    if (membersData.length > 0) {
                        const memberIds = membersData.map(m => m.user_id);
                        const statsPromises = memberIds.map(userId => 
                            PlayerStats.filter({ user_id: userId }).catch(() => [])
                        );
                        const statsResults = await Promise.all(statsPromises);
                        statsData = statsResults.flat();
                    }
                    
                    setClubMembers(membersData || []);
                    setPlayerStats(statsData || []);
                    setUserBadges(userBadgesData || []);
                    setBadges(badgesData || []);
                    break;
                }
                case 'tournaments': {
                    const tournamentsData = await Tournament.filter({ club_id: clubId }).catch(() => []);
                    setTournaments(tournamentsData || []);
                    break;
                }
                case 'leagues': {
                    const leaguesData = await League.filter({ club_id: clubId }).catch(() => []);
                    setLeagues(leaguesData || []);
                    break;
                }
                case 'messages': {
                    const messagesData = await Message.filter({ club_id: clubId, type: 'user_message' }).catch(() => []);
                    setMessages(messagesData || []);
                    break;
                }
                default:
                    break;
            }
        } catch (err) {
            console.error(`Error fetching data for ${view}:`, err);
        } finally {
            setViewLoading(false);
        }
    }, [clubId, setEvents, setRsvps, setClubMembers, setPlayerStats, setTournaments, setLeagues, setMessages, setUserBadges, setBadges, setViewLoading]);

    // This function now orchestrates the initial load of club data, view data, and invites.
    const fetchClubData = useCallback(async (force = false) => {
        if (!clubId) {
            setError("No club ID provided.");
            setLoading(false);
            return;
        }
        if (!force) setLoading(true);

        try {
            const clubData = await Club.get(clubId);
            if (!clubData) {
                throw new Error(`Club not found. The club may have been deleted or the ID is incorrect.`);
            }
            setClub(clubData);
            
            // Get initial view from URL params
            const params = new URLSearchParams(location.search);
            const initialView = params.get('view') || 'events';
            setActiveView(initialView);

            // Fetch initial view data immediately to prevent separate loading
            await fetchViewData(initialView);

            // Only fetch league invites if we have a user
            if (user) {
                try {
                    const userMessages = await Message.filter({ recipient_id: user.id, status: 'unread', club_id: clubId });
                    const leagueInvites = userMessages.filter(m =>
                        m.related_entity_type === 'LeagueParticipant' &&
                        m.subject && m.subject.includes('League Invitation')
                    );
                    setPendingLeagueInvites(leagueInvites);
                } catch (msgError) {
                    console.warn("Failed to fetch league invites:", msgError);
                    setPendingLeagueInvites([]);
                }
            }

        } catch (err) {
            console.error("Error fetching club data:", err);
            setError(err.message || "Failed to load club data");
        } finally {
            setLoading(false);
        }
    }, [clubId, user, location.search, fetchViewData, setClub, setError, setLoading, setPendingLeagueInvites]);

    // Single useEffect to handle all initial data fetching
    useEffect(() => {
        if (!location.pathname.toLowerCase().includes('/clubdetails')) {
            console.log('[ClubDetailsPage] Path does not match, skipping fetch.');
            setLoading(false);
            return;
        }

        if (!userLoading && clubId) {
            fetchClubData();
        }
    }, [userLoading, clubId, fetchClubData, location.pathname]);

    // Separate useEffect only for view changes after initial load
    useEffect(() => {
        if (clubId && !loading && !userLoading && club) {
            // Only fetch view data if it's different from current view
            // and we're not in the initial loading phase (loading is false)
            const params = new URLSearchParams(location.search);
            const urlView = params.get('view') || 'events';
            if (urlView !== activeView) {
                setActiveView(urlView);
                fetchViewData(urlView);
            }
        }
    }, [location.search, clubId, loading, userLoading, club, activeView, fetchViewData, setActiveView]);


    const handleImageUpload = async () => {
        await fetchOnlyClubData(true);
    };

    const handleCreateLeague = async (leagueData) => {
        try {
            await League.create({
                ...leagueData,
                club_id: clubId,
                admin_user_id: user.id
            });
            setLeagueModalOpen(false);
            // After creating a league, update the URL to switch to 'leagues' view
            navigate(createPageUrl(`ClubDetails?id=${clubId}&view=leagues`));
            setSuccessMessage('League created successfully!');
        } catch (error) {
            console.error("Error creating league:", error);
            throw error;
        }
    };

    const handleCreateTournament = async () => {
        // The tournament is already created in the modal, so we just handle post-creation actions
        setCreateTournamentModalOpen(false);
        // After creating a tournament, update the URL to switch to 'tournaments' view
        navigate(createPageUrl(`ClubDetails?id=${clubId}&view=tournaments`));
        setSuccessMessage('Tournament created successfully!');
        // Refresh the tournaments data
        await fetchViewData('tournaments');
    };

    const handleLeaveClub = (clubName) => {
        setSuccessMessage(`You have successfully left ${clubName}.`);
        setTimeout(() => {
            navigate(createPageUrl('Clubs'));
        }, 2000);
    };

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
                    <CardContent className="p-8">
                        <p className="main-text opacity-70 mb-6">{error}</p>
                        <Button asChild style={{ backgroundColor: '#f26222', color: 'white' }}>
                            <Link to={createPageUrl('Clubs')}>Back to Clubs</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!club) return null;

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#e5e4cd' }}>
            <div className="relative w-full h-64 bg-gray-700">
                {club.masthead_url ? (
                    <img
                        src={club.masthead_url}
                        alt={`${club.name} masthead`}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-teal-600 to-teal-800"></div>
                )}
                <div className="absolute inset-0 bg-black/20"></div>
            </div>

            <div className="max-w-7xl mx-auto p-8">
                <Link
                    to={createPageUrl('Clubs')}
                    className="inline-flex items-center gap-2 main-text hover:opacity-70 mb-8"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Clubs
                </Link>

                 <SuccessNotification
                    title="Success!"
                    message={successMessage}
                    onClose={() => setSuccessMessage('')}
                />

                <Card className="border-0 shadow-md mb-8" style={{ backgroundColor: '#f3f2e4' }}>
                    <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="flex-shrink-0">
                                {club.logo_url ? (
                                    <img
                                        src={club.logo_url}
                                        alt={`${club.name} logo`}
                                        className="w-32 h-32 object-contain rounded-lg"
                                    />
                                ) : (
                                    <div className="w-32 h-32 bg-gray-300 rounded-lg flex items-center justify-center">
                                        <Users className="w-16 h-16 text-gray-500" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-grow">
                                <h1 className="text-4xl font-bold main-text mb-2">{club.name}</h1>
                                {club.strapline && (
                                    <p className="text-xl main-text opacity-70 mb-4">{club.strapline}</p>
                                )}
                                {club.description && (
                                    <p className="main-text opacity-80 mb-6">{club.description}</p>
                                )}

                                <div className="flex flex-wrap gap-3">
                                    <Badge className="bg-teal-600 text-white">
                                        Admin: {club.admin_username}
                                    </Badge>
                                    <Badge className="bg-teal-600 text-white">
                                        {clubMembers.length} Members
                                    </Badge>
                                    <Badge className="bg-teal-600 text-white">
                                        {tournaments.length} Tournaments
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {user && pendingLeagueInvites.length > 0 && (
                    <div className="mb-6 space-y-4">
                        <h2 className="text-2xl font-bold main-text">Pending League Invitations</h2>
                        {pendingLeagueInvites.map(invite => (
                            <LeagueInvitationCard
                                key={invite.id}
                                message={invite}
                                onSuccess={setSuccessMessage}
                                onAction={() => {
                                    fetchClubData(true); 
                                    refetchUnreadMessages();
                                }}
                            />
                        ))}
                    </div>
                )}

                {isAdmin && (
                    <Card className="border-0 elegant-shadow mb-8" style={{ backgroundColor: '#9fd3ba' }}>
                        <CardContent className="p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <Settings className="w-6 h-6 main-text" />
                                <h2 className="text-2xl font-bold main-text">Admin Controls</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 w-full">
                                <Button
                                    asChild
                                    className="flex items-center justify-center gap-2 text-white font-medium px-4 py-3 w-full no-underline"
                                    style={{ backgroundColor: '#007e81' }}
                                >
                                    <Link to={createPageUrl(`ManageMembers?club_id=${clubId}`)} className="no-underline">
                                        <Users className="w-5 h-5" />
                                        Members
                                    </Link>
                                </Button>

                                <Button
                                    asChild
                                    className="flex items-center justify-center gap-2 text-white font-medium px-4 py-3 w-full no-underline"
                                    style={{ backgroundColor: '#007e81' }}
                                >
                                    <Link to={createPageUrl(`ManageEvents?club_id=${clubId}`)} className="no-underline">
                                        <Calendar className="w-5 h-5" />
                                        Events
                                    </Link>
                                </Button>

                                <Button
                                    onClick={() => setCreateTournamentModalOpen(true)}
                                    className="flex items-center justify-center gap-2 text-white font-medium px-4 py-3 w-full"
                                    style={{ backgroundColor: '#007e81' }}
                                >
                                    <Trophy className="w-5 h-5" />
                                    + Tournament
                                </Button>

                                <Button
                                    onClick={() => setLeagueModalOpen(true)}
                                    className="flex items-center justify-center gap-2 text-white font-medium px-4 py-3 w-full"
                                    style={{ backgroundColor: '#007e81' }}
                                >
                                    <Award className="w-5 h-5" />
                                    + League
                                </Button>

                                <Button
                                    asChild
                                    className="flex items-center justify-center gap-2 text-white font-medium px-4 py-3 w-full no-underline"
                                    style={{ backgroundColor: '#007e81' }}
                                >
                                    <Link to={createPageUrl(`ClubSettings?id=${clubId}`)} className="no-underline">
                                        <Settings className="w-5 h-5" />
                                        Settings
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="mb-8">
                    <div className="flex relative border-b-2 border-[#5a3217] border-opacity-30">
                        <button
                            className={`px-4 pb-3 pt-2 text-sm font-semibold transition-colors focus:outline-none relative ${
                                activeView === 'events' 
                                    ? 'text-[#5a3217]' 
                                    : 'text-[#5a3217] opacity-50 hover:opacity-100'
                            }`}
                            onClick={() => navigate(createPageUrl(`ClubDetails?id=${clubId}&view=events`))}
                        >
                            Events
                            {activeView === 'events' && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#f26222]"></div>
                            )}
                        </button>
                        <button
                            className={`px-4 pb-3 pt-2 text-sm font-semibold transition-colors focus:outline-none relative ${
                                activeView === 'members' 
                                    ? 'text-[#5a3217]' 
                                    : 'text-[#5a3217] opacity-50 hover:opacity-100'
                            }`}
                            onClick={() => navigate(createPageUrl(`ClubDetails?id=${clubId}&view=members`))}
                        >
                            Members
                            {activeView === 'members' && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#f26222]"></div>
                            )}
                        </button>
                        <button
                           className={`px-4 pb-3 pt-2 text-sm font-semibold transition-colors focus:outline-none relative ${
                                activeView === 'tournaments' 
                                    ? 'text-[#5a3217]' 
                                    : 'text-[#5a3217] opacity-50 hover:opacity-100'
                            }`}
                            onClick={() => navigate(createPageUrl(`ClubDetails?id=${clubId}&view=tournaments`))}
                        >
                            Tournaments
                            {activeView === 'tournaments' && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#f26222]"></div>
                            )}
                        </button>
                        <button
                            className={`px-4 pb-3 pt-2 text-sm font-semibold transition-colors focus:outline-none relative ${
                                activeView === 'leagues' 
                                    ? 'text-[#5a3217]' 
                                    : 'text-[#5a3217] opacity-50 hover:opacity-100'
                            }`}
                            onClick={() => navigate(createPageUrl(`ClubDetails?id=${clubId}&view=leagues`))}
                        >
                            Leagues
                            {activeView === 'leagues' && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#f26222]"></div>
                            )}
                        </button>
                        <button
                            className={`px-4 pb-3 pt-2 text-sm font-semibold transition-colors focus:outline-none relative ${
                                activeView === 'messages' 
                                    ? 'text-[#5a3217]' 
                                    : 'text-[#5a3217] opacity-50 hover:opacity-100'
                            }`}
                            onClick={() => navigate(createPageUrl(`ClubDetails?id=${clubId}&view=messages`))}
                        >
                            Messages
                            {activeView === 'messages' && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#f26222]"></div>
                            )}
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    {viewLoading ? (
                         <div className="flex justify-center items-center p-16">
                            <RefreshCw className="w-8 h-8 animate-spin main-text" />
                         </div>
                    ) : (
                        <>
                            {activeView === 'events' && (
                                <ClubEventsList
                                    clubId={clubId}
                                    events={events}
                                    rsvps={rsvps}
                                    isAdmin={isAdmin}
                                    onRefresh={() => fetchViewData('events')}
                                />
                            )}

                            {activeView === 'members' && (
                                <ClubMembersList
                                    club={club}
                                    isAdmin={isAdmin}
                                    clubMembers={clubMembers}
                                    playerStats={playerStats}
                                    userBadges={userBadges}
                                    badges={badges}
                                    onMemberUpdate={() => fetchViewData('members')}
                                    onLeaveClub={handleLeaveClub}
                                />
                            )}

                            {activeView === 'tournaments' && (
                                <ClubTournamentsList
                                   club={club}
                                   tournaments={tournaments}
                                   onManage={(tournament) => navigate(createPageUrl(`AdminTournaments?id=${tournament.id}&club_id=${club.id}`))}
                                />
                            )}
                            
                            {activeView === 'leagues' && (
                                <div>
                                    
                                    {leagues.length > 0 ? (
                                        <div className="grid gap-4">
                                            {leagues.map(league => (
                                                <Card key={league.id} className="tool-card-bg border-0 elegant-shadow">
                                                    <CardHeader className="flex flex-row items-center justify-between">
                                                        <CardTitle className="main-text">{league.name}</CardTitle>
                                                        <Badge className="bg-teal-600 text-white">
                                                            {league.status}
                                                        </Badge>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="main-text opacity-70 mb-4">{league.description}</p>
                                                        <div className="flex items-center gap-4 text-sm main-text opacity-60 flex-wrap">
                                                            <span>Start: {league.start_date ? format(new Date(league.start_date), 'PPP') : 'Not set'}</span>
                                                            <span>Format: {league.format.replace('_', ' ')}</span>
                                                            <span>{league.players_per_division} per division</span>
                                                            <span>
                                                                <Star className={`inline w-3 h-3 mr-1 ${league.default_is_rated !== false ? 'text-yellow-400' : 'text-gray-400'}`} />
                                                                {league.default_is_rated !== false ? 'Rated' : 'Unrated'}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-2 mt-4">
                                                            <Button
                                                                asChild
                                                                variant="outline"
                                                                size="sm"
                                                            >
                                                                <Link to={createPageUrl(`LeagueDetails?id=${league.id}`)}>
                                                                    View Details
                                                                </Link>
                                                            </Button>
                                                            {isAdmin && (
                                                                <Button
                                                                    asChild
                                                                    variant="outline"
                                                                >
                                                                    <Link to={createPageUrl(`LeagueDetails?id=${league.id}&admin=true`)}>
                                                                        Manage League
                                                                    </Link>
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : (
                                        <Card className="tool-card-bg border-0 elegant-shadow text-center py-12">
                                            <CardContent>
                                                <Award className="w-16 h-16 main-text opacity-50 mx-auto mb-4" />
                                                <h3 className="text-xl font-bold main-text mb-2">No Leagues Yet</h3>
                                                <p className="main-text opacity-70">
                                                    {isAdmin ? 'Create the first league for this club using the "Admin Controls" section above!' : 'No leagues have been created for this club yet.'}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            )}

                            {activeView === 'messages' && (
                                <ClubMessagesList
                                    clubId={clubId}
                                    clubName={club.name}
                                    messages={messages}
                                    onRefresh={() => fetchViewData('messages')}
                                />
                            )}
                        </>
                    )}
                </div>

                {isAdmin && (
                    <>
                        <ClubLogoUpload
                            isOpen={showLogoUpload}
                            onClose={() => setShowLogoUpload(false)}
                            club={club}
                            onUploadComplete={handleImageUpload}
                        />
                        <ClubMastheadUpload
                            isOpen={showMastheadUpload}
                            onClose={() => setShowMastheadUpload(false)}
                            club={club}
                            onUploadComplete={handleImageUpload}
                        />
                        <CreateLeagueModal
                            isOpen={isLeagueModalOpen}
                            onClose={() => setLeagueModalOpen(false)}
                            onSubmit={handleCreateLeague}
                            clubId={club.id}
                            clubName={club.name}
                        />
                        <CreateTournamentModal
                            isOpen={isCreateTournamentModalOpen}
                            onClose={() => setCreateTournamentModalOpen(false)}
                            onSubmit={handleCreateTournament}
                            club={club}
                            clubMembers={clubMembers}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
