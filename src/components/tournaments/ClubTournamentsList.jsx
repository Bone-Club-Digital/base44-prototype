import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, ArrowRight, Eye, Clock, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useUser } from '../auth/UserProvider';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function ClubTournamentsList({ club, tournaments, onManage }) {
  const { user } = useUser();
  const isClubAdmin = user && club && (user.id === club.admin_id || (club.admin_ids && club.admin_ids.includes(user.id)));

  if (!tournaments || tournaments.length === 0) {
    return (
      <Card className="tool-card-bg border-0 elegant-shadow h-fit">
        <CardHeader>
          <CardTitle className="main-text flex items-center gap-3">
            <Trophy className="w-6 h-6" />
            Club Tournaments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 main-text opacity-70">
            <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No tournaments have been created for this club yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="tool-card-bg border-0 elegant-shadow h-fit">
      <CardHeader>
        <CardTitle className="main-text flex items-center gap-3">
          <Trophy className="w-6 h-6" />
          Club Tournaments ({tournaments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tournaments.map((tournament) => (
            <div key={tournament.id} className="flex items-center justify-between p-3 rounded-lg bg-white/30">
              {club.logo_url && (
                  <div className="flex-shrink-0 mr-4">
                      <img
                          src={club.logo_url}
                          alt={`${club.name} logo`}
                          className="w-16 h-16 object-contain rounded-md"
                      />
                  </div>
              )}
              <div className="flex-1">
                <p className="font-bold main-text">{tournament.name}</p>
                
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
                </div>
                
                <p className="text-sm main-text opacity-80">
                  {tournament.start_date && (
                    <span>
                      Starts: {format(new Date(tournament.start_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
                  <Button asChild size="sm" style={{ backgroundColor: '#007e81', color: 'white' }}>
                    <Link to={createPageUrl(`TournamentDetails?id=${tournament.id}`)}>
                      <Eye className="w-4 h-4 md:mr-2" />
                      <span className="hidden md:inline">View</span>
                    </Link>
                  </Button>
                  {isClubAdmin && (
                    <Button onClick={() => onManage(tournament)} size="sm" variant="outline">
                      <span className="hidden md:inline">Manage</span>
                      <ArrowRight className="w-4 h-4 md:ml-2" />
                    </Button>
                  )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}