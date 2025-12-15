
import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '../auth/UserProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Eye, ChevronLeft, ChevronRight, Clock, Video } from 'lucide-react';
import { TournamentParticipant } from '@/entities/TournamentParticipant';
import { Tournament } from '@/entities/Tournament';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function MyTournamentsList({ clubIds, allClubs = [] }) {
  const { user } = useUser();
  const navigate = useNavigate();
  const [myClubTournaments, setMyClubTournaments] = useState([]);
  const [userParticipations, setUserParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const TOURNAMENTS_PER_PAGE = 10;

  const clubLogoMap = useMemo(() => {
    return new Map(allClubs.map(club => [club.id, club.logo_url]));
  }, [allClubs]);

  useEffect(() => {
    const fetchMyTournaments = async () => {
      if (!user || !clubIds || clubIds.length === 0) {
        setLoading(false);
        setMyClubTournaments([]);
        setUserParticipations([]);
        return;
      }
      setLoading(true);
      try {
        // Optimized tournament fetch using clubIds
        const [tournamentsFromMyClubs, participations] = await Promise.all([
          Tournament.filter({ 'club_id': { '$in': clubIds } }),
          TournamentParticipant.filter({ user_id: user.id })
        ]);
        
        setMyClubTournaments(tournamentsFromMyClubs || []);
        setUserParticipations(participations || []);
      } catch (error) {
        console.error("Error fetching user's tournaments:", error);
        setMyClubTournaments([]);
        setUserParticipations([]);
      } finally {
        setLoading(false);
      }
    };

    // Add a small delay to start fetching after parent component renders
    const timer = setTimeout(() => {
        fetchMyTournaments();
    }, 100);

    return () => clearTimeout(timer);
  }, [user, clubIds]);

  const getUserStatus = (tournament) => {
    const participation = userParticipations.find(p => p.tournament_id === tournament.id);
    if (!participation) return null;
    
    switch (participation.status) {
      case 'invited': return 'Invited';
      case 'accepted': return 'Entered';
      case 'declined': return 'Left';
      default: return participation.status;
    }
  };

  const sortedTournaments = myClubTournaments.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
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

  if (loading) {
    return (
      <Card className="tool-card-bg border-0 elegant-shadow h-full">
        <CardHeader>
          <CardTitle className="main-text flex items-center gap-3">
            <Trophy className="w-6 h-6" />
            My Club Tournaments
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 main-text opacity-70">
          <p>Loading tournaments...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="tool-card-bg border-0 elegant-shadow h-full">
      <CardHeader>
        <CardTitle className="main-text flex items-center gap-3">
          <Trophy className="w-6 h-6" />
          My Club Tournaments ({myClubTournaments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentTournaments.length === 0 && currentPage === 1 ? (
          <div className="text-center py-8 main-text opacity-70">
            <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No tournaments found in your clubs.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {currentTournaments.map(tournament => {
                const userStatus = getUserStatus(tournament);
                const clubLogoUrl = clubLogoMap.get(tournament.club_id);
                return (
                  <div key={tournament.id} className="flex items-center justify-between p-3 rounded-lg bg-white/30">
                    {clubLogoUrl && (
                        <div className="flex-shrink-0 mr-4">
                            <img
                                src={clubLogoUrl}
                                alt={`${tournament.club_name} logo`}
                                className="w-16 h-16 object-contain rounded-md"
                            />
                        </div>
                    )}
                    <div className="flex-1">
                      <p className="font-bold main-text">{tournament.name}</p>
                      
                      {/* Badges Row */}
                      <div className="flex items-center gap-2 mt-2 mb-2 flex-wrap">
                        {tournament.match_settings?.use_clock && (
                          <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                            <Clock className="w-3 h-3 text-white" />
                          </div>
                        )}
                        
                        {tournament.match_settings?.use_video_chat && (
                          <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center">
                            <Video className="w-3 h-3 text-white" />
                          </div>
                        )}
                        
                        {tournament.entry_fee_bones > 0 && (
                          <div className="h-6 bg-orange-500 text-white text-xs px-2 rounded-full font-bold flex items-center">
                            🦴 {tournament.entry_fee_bones}
                          </div>
                        )}
                        
                        <div 
                          className={`h-6 text-xs px-2 rounded-full font-medium flex items-center ${
                            tournament.match_settings?.is_rated === false 
                              ? 'bg-gray-400 text-white' 
                              : 'bg-green-500 text-white'
                          }`}
                        >
                          {tournament.match_settings?.is_rated === false ? 'Unrated' : 'Rated'}
                        </div>

                        <Badge 
                          className="text-xs px-2 py-1"
                          style={{ backgroundColor: '#007e81', color: '#e5e4cd', border: 'none' }}
                        >
                          {(tournament.type || 'knockout').charAt(0).toUpperCase() + (tournament.type || 'knockout').slice(1)}
                        </Badge>
                        <Badge 
                          className="text-xs px-2 py-1"
                          style={{ backgroundColor: '#007e81', color: '#e5e4cd', border: 'none' }}
                        >
                          {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1).replace('_', ' ')}
                        </Badge>
                        {userStatus && (
                          <Badge 
                            className="text-xs px-2 py-1"
                            style={{ 
                              backgroundColor: userStatus === 'Entered' ? '#10b981' : userStatus === 'Invited' ? '#f59e0b' : '#6b7280', 
                              color: '#ffffff', 
                              border: 'none' 
                            }}
                          >
                            {userStatus}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm main-text opacity-80">
                        {tournament.club_name || 'Unknown Club'}
                        {tournament.start_date && (
                          <span className="ml-2">
                            | Starts: {format(new Date(tournament.start_date), 'MMM d, yyyy')}
                          </span>
                        )}
                      </p>
                    </div>
                    <Button onClick={() => navigate(createPageUrl(`TournamentDetails?id=${tournament.id}`))} size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-2" /> View
                    </Button>
                  </div>
                );
              })}
            </div>

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
          </>
        )}
      </CardContent>
    </Card>
  );
}
