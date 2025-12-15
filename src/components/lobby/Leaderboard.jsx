
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Star } from 'lucide-react';

export default function Leaderboard({ topPlayers, loading }) {
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-amber-600" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-[#5a3217]">{rank}</span>;
    }
  };

  return (
    <Card className="tool-card-bg border-0 elegant-shadow h-fit">
      <CardHeader>
        <CardTitle className="main-text uppercase">Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <div className="w-6 h-6 border-2 border-[#5a3217] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : topPlayers.length > 0 ? (
          <div className="space-y-2">
            {topPlayers.map((player, index) => {
              const rank = index + 1;
              const gamesPlayed = player.games_played || 0;
              const gamesWon = player.games_won || 0;
              const winRate = gamesPlayed > 0 
                ? Math.round((gamesWon / gamesPlayed) * 100) 
                : 0;
              const displayName = player.username || player.full_name || 'Anonymous';
              
              return (
                <div 
                  key={player.id} 
                  className="flex items-center w-full p-2 rounded-md bg-white/30 hover:bg-white/50 transition-colors h-12"
                >
                  {/* Column 1: Rank Icon (10%) */}
                  <div className="w-[10%] flex justify-center items-center">
                    {getRankIcon(rank)}
                  </div>
                  
                  {/* Column 2: Username (50%) */}
                  <div className="w-[50%]">
                    <p className="font-semibold main-text text-sm truncate" title={displayName}>
                      {displayName}
                    </p>
                  </div>
                  
                  {/* Column 3: Rating (20%) */}
                  <div className="w-[20%] flex justify-center">
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
                        {player.rating || 1500}
                    </Badge>
                  </div>

                  {/* Column 4: Win Rate % (10%) */}
                  <div className="w-[10%] text-center">
                    <span className="text-xs main-text opacity-70 whitespace-nowrap">
                        {gamesPlayed > 0 ? `${winRate}%` : '-'}
                    </span>
                  </div>

                  {/* Column 5: Games Played (10%) */}
                  <div className="w-[10%] text-center">
                    <span className="text-xs main-text opacity-70 whitespace-nowrap">
                        {gamesPlayed > 0 ? `(${gamesPlayed})` : '(0)'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-sm main-text opacity-70">No players yet. Be the first!</p>
        )}
      </CardContent>
    </Card>
  );
}

