
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Tournament } from '@/entities/Tournament';
import { Club } from '@/entities/Club';
import { TournamentParticipant } from '@/entities/TournamentParticipant'; // Assuming this entity exists
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Trophy, // Added from outline
  LogIn, // Added from outline
  UserCheck, // Added from outline
  ChevronLeft, // Added from outline
  ChevronRight, // Added from outline
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import CreateTournamentModal from '../components/tournaments/CreateTournamentModal';
import { format } from 'date-fns';

// TournamentCard component extracted from the rendering logic, as suggested by the outline.
// It also includes join functionality.
const TournamentCard = ({ tournament, onJoin, isParticipant, userId }) => {
  const isJoinable = tournament.status === 'open' && !isParticipant && tournament.club_id && userId;

  return (
    <Link to={createPageUrl(`TournamentDetails?id=${tournament.id}`)} className="block hover:scale-105 transition-transform duration-200">
      <Card className="tool-card-bg border-0 elegant-shadow h-full flex flex-col">
        <CardHeader>
          <CardTitle className="main-text truncate">{tournament.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-between">
          <p className="main-text opacity-70 mb-4 line-clamp-3">{tournament.description}</p>
          <div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline" style={{ backgroundColor: '#5a3217', color: '#e5e4cd', borderColor: '#5a3217' }}>{tournament.status.replace(/_/g, ' ')}</Badge>
              <Badge variant="outline">{tournament.type.replace(/_/g, ' ')}</Badge>
              {tournament.entry_fee_bones > 0 && (
                <Badge variant="secondary">🦴 {tournament.entry_fee_bones}</Badge>
              )}
              {isParticipant && (
                <Badge className="bg-green-500 text-white">
                  <UserCheck className="w-3 h-3 mr-1" /> Participating
                </Badge>
              )}
            </div>
            <p className="text-xs main-text opacity-60 mt-3">
              Starts: {format(new Date(tournament.start_date), 'dd MMM yyyy, HH:mm')}
            </p>
          </div>
          {isJoinable && (
            <div className="mt-4">
              <Button
                onClick={(e) => {
                  e.preventDefault(); // Prevent navigating to tournament details
                  onJoin(tournament.id);
                }}
                className="w-full"
                style={{ backgroundColor: '#f26222', color: 'white' }}
              >
                <LogIn className="w-4 h-4 mr-2" /> Join Tournament
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};


export default function TournamentsPage() {
  const { user, loading: userLoading } = useUser();
  const [searchParams] = useSearchParams();
  const location = useLocation(); // Keep location for compatibility with original code structure for clubId initial retrieval
  const clubId = searchParams.get('club_id'); // Use useSearchParams as per outline
  const navigate = useNavigate();

  const [club, setClub] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [clubMembers, setClubMembers] = useState([]);
  const [myParticipations, setMyParticipations] = useState([]); // New state for user participations
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false); // Renamed from isCreateModalOpen for consistency
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const TOURNAMENTS_PER_PAGE = 9; // Changed to 9 for better grid display (3 columns * 3 rows)


  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!clubId) {
      setError('No club ID provided.');
      setLoading(false);
      return;
    }
    try {
      const [clubData, allTournaments, clubMembersData] = await Promise.all([
        Club.get(clubId),
        Tournament.filter({ club_id: clubId }, '-created_date'),
        import('@/entities/ClubMember').then(module => module.ClubMember.filter({ club_id: clubId, status: 'active' }))
      ]);

      if (!clubData) throw new Error("Club not found.");
      
      setClub(clubData);
      setTournaments(allTournaments || []);
      setClubMembers(clubMembersData);

      if (user) {
        const participations = await TournamentParticipant.filter({ user_id: user.id });
        setMyParticipations(participations || []);
      }

    } catch (err) {
      console.error("Failed to fetch tournament data:", err);
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [clubId, user]); // Depend on clubId and user for re-fetching

  useEffect(() => {
    if (!userLoading) {
      fetchTournaments();
    }
  }, [clubId, userLoading, fetchTournaments]); // Add fetchTournaments to dependencies

  // isCurrentUserAdmin remains useMemo as it's derived state, not managed directly by useState
  const isCurrentUserAdmin = useMemo(() => {
    if (!user || !club) return false;
    return club.admin_id === user.id || (club.admin_ids && club.admin_ids.includes(user.id));
  }, [user, club]);
  
  const handleCreateTournament = () => { // Renamed from handleTournamentCreated
    fetchTournaments(); // Refresh all data including new tournament
    setShowCreateModal(false); // Update to new state name
  };

  const handleJoinTournament = async (tournamentId) => {
    if (!user) {
      navigate(createPageUrl('SignIn')); // Redirect to sign-in if not logged in
      return;
    }
    try {
      setLoading(true); // Indicate that an operation is in progress
      const newParticipation = await TournamentParticipant.create({
        tournament_id: tournamentId,
        user_id: user.id,
        status: 'pending' // Or 'accepted' depending on tournament rules
      });
      setMyParticipations(prev => [...prev, newParticipation]);
      console.log(`Successfully joined tournament: ${tournamentId}`);
      // Optionally show a toast notification
    } catch (error) {
      console.error("Failed to join tournament:", error);
      setError(`Failed to join tournament: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sortedTournaments = tournaments.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const totalPages = Math.ceil(sortedTournaments.length / TOURNAMENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * TOURNAMENTS_PER_PAGE;
  const endIndex = startIndex + TOURNAMENTS_PER_PAGE;
  const currentTournaments = sortedTournaments.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    } else if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);


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
              <Link to={createPageUrl('Clubs')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Clubs
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!club) {
      return <div>Club not found.</div>;
  }

  return (
    <>
      <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Link to={createPageUrl(`ClubDetails?id=${clubId}`)} className="flex items-center gap-2 hover:opacity-70 transition-colors" style={{ color: '#5a3217' }}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Back to {club.name}</span>
            </Link>
            {isCurrentUserAdmin && (
              <Button
                onClick={() => setShowCreateModal(true)} // Update to new state name
                style={{ backgroundColor: '#007e81', color: 'white' }}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Tournament
              </Button>
            )}
          </div>
          
          <h1 className="text-4xl font-bold main-text mb-8">{club.name} Tournaments</h1>

          {currentTournaments.length === 0 && currentPage === 1 ? ( // Check if no tournaments on first page
            <Card className="tool-card-bg border-0 elegant-shadow text-center py-12">
              <CardContent>
                <Trophy className="w-16 h-16 main-text opacity-50 mx-auto mb-4" />
                <h3 className="text-xl font-bold main-text mb-2">No Tournaments Yet</h3>
                <p className="main-text opacity-70 mb-4">Be the first to create a tournament for this club.</p>
                {isCurrentUserAdmin && (
                  <Button
                    onClick={() => setShowCreateModal(true)} // Update to new state name
                    style={{ backgroundColor: '#f26222', color: 'white' }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Tournament
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentTournaments.map(tournament => (
                  <TournamentCard 
                    key={tournament.id} 
                    tournament={tournament} 
                    onJoin={handleJoinTournament} 
                    isParticipant={myParticipations.some(p => p.tournament_id === tournament.id && p.status === 'accepted')}
                    userId={user?.id}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <Card className="tool-card-bg border-0 elegant-shadow mt-6">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-center gap-2">
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
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
      
      {isCurrentUserAdmin && (
        <CreateTournamentModal
          isOpen={showCreateModal} // Update to new state name
          onClose={() => setShowCreateModal(false)} // Update to new state name
          onCreate={handleCreateTournament}
          club={club}
          clubMembers={clubMembers}
        />
      )}
    </>
  );
}
