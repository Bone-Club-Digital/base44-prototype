
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Gamepad2, Calendar, Clock, RefreshCw } from 'lucide-react';
import { Friend } from '@/entities/Friend';
import { PlayerStats } from '@/entities/PlayerStats';
import { GameSession } from '@/entities/GameSession';
import ChallengeModal from './ChallengeModal';
import ArrangeMatchModal from './ArrangeMatchModal';

export default function FriendMatchmakingPanel({ user, onMatchArranged }) {
  const [friends, setFriends] = useState([]);
  const [onlineFriends, setOnlineFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // Add refreshing state
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [arrangeModalOpen, setArrangeModalOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const isMounted = useRef(true);

  const fetchFriendsData = useCallback(async () => {
    if (!user?.id || !isMounted.current) {
      if (isMounted.current) {
        setLoading(false);
      }
      return;
    }

    // Set refreshing state if not initial load
    if (!loading) {
      setRefreshing(true);
    }

    try {
      const friendships = await Friend.filter({ user_id: user.id });
      const friendIds = friendships.map(f => f.friend_id);

      if (friendIds.length === 0) {
        if (isMounted.current) {
          setFriends([]);
          setOnlineFriends([]);
        }
        return;
      }
      
      const [friendsStats, activeGames] = await Promise.all([
        PlayerStats.filter({ 'user_id': { '$in': friendIds } }),
        GameSession.filter({ 
          $or: [
            { player_teal_id: { '$in': friendIds } },
            { player_bone_id: { '$in': friendIds } }
          ],
          status: { '$in': ['in_progress', 'waiting_for_start'] }
        })
      ]);

      const statsMap = new Map(friendsStats.map(stat => [stat.user_id, stat]));
      const activePlayers = new Set();
      
      activeGames.forEach(game => {
        if (friendIds.includes(game.player_teal_id)) activePlayers.add(game.player_teal_id);
        if (friendIds.includes(game.player_bone_id)) activePlayers.add(game.player_bone_id);
      });

      const enrichedFriends = friendships.map(friendship => {
        const stats = statsMap.get(friendship.friend_id);
        const lastActive = stats?.last_active ? new Date(stats.last_active) : null;
        // Increased online detection window to 90 seconds to account for heartbeat timing
        const isOnline = lastActive && (Date.now() - lastActive.getTime()) < 90 * 1000; // Changed from 1 minute to 90 seconds
        const inGame = activePlayers.has(friendship.friend_id);
        
        return {
          ...friendship,
          profile_picture_url: stats?.profile_picture_url,
          rating: stats?.rating || 1500,
          isOnline,
          inGame,
          available: isOnline && !inGame,
          lastActive
        };
      });

      if (isMounted.current) {
        const online = enrichedFriends.filter(f => f.isOnline);
        setFriends(enrichedFriends);
        setOnlineFriends(online);
      }

    } catch (error) {
      console.error("[FriendMatchmakingPanel] Failed to fetch friends data:", error);
      if (isMounted.current) {
        setFriends([]);
        setOnlineFriends([]);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user?.id, loading]); // user?.id is a dependency because user.id is used, loading is a dependency for the initial state check

  const handleRefresh = useCallback(() => {
    fetchFriendsData();
  }, [fetchFriendsData]);

  useEffect(() => {
    isMounted.current = true; // Set to true on mount
    if (user) {
      fetchFriendsData(); // Fetch immediately on mount
      
      // Set up polling to refresh every 30 seconds
      const interval = setInterval(fetchFriendsData, 30000); 

      // Clean up interval and isMounted ref on unmount
      return () => {
        isMounted.current = false;
        clearInterval(interval);
      };
    }
  }, [user, fetchFriendsData]);

  const handleChallenge = (friend) => {
    setSelectedFriend(friend);
    setChallengeModalOpen(true);
  };

  const handleArrangeMatch = (friend = null) => {
    setSelectedFriend(friend);
    setArrangeModalOpen(true);
  };

  const getStatusBadge = (friend) => {
    if (friend.available) {
      return <Badge className="bg-green-500 text-white text-xs">Available</Badge>;
    } else if (friend.inGame) {
      return <Badge className="bg-red-500 text-white text-xs">In Game</Badge>;
    } else if (friend.isOnline) {
      return <Badge className="bg-yellow-500 text-white text-xs">Online</Badge>;
    } else {
      return <Badge variant="outline" className="text-xs">Offline</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="tool-card-bg border-0 elegant-shadow">
        <CardContent className="p-4">
          <div className="flex justify-center items-center py-8">
            <div className="w-6 h-6 border-4 border-[#5a3217] border-t-transparent rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="tool-card-bg border-0 elegant-shadow">
        <CardHeader>
          <CardTitle className="main-text uppercase flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6" />
              Challenge Friends
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-main-text hover:bg-white/20 p-2"
              title="Refresh friends list"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs defaultValue="instant" className="w-full">
            <TabsList className="grid w-full grid-cols-2 gap-2 bg-transparent p-0 h-auto mb-4">
              <TabsTrigger value="instant" className="flex items-center gap-2 tab-trigger">
                <Gamepad2 className="w-4 h-4" />
                Instant Play ({onlineFriends.length})
              </TabsTrigger>
              <TabsTrigger value="arrange" className="flex items-center gap-2 tab-trigger">
                <Calendar className="w-4 h-4" />
                Arrange Match
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="instant" className="mt-4">
              {onlineFriends.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {onlineFriends.map(friend => (
                    <div key={friend.id} className="flex items-center justify-between p-3 rounded-lg bg-white/20">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={friend.profile_picture_url} alt={friend.friend_username} className="object-cover" />
                          <AvatarFallback style={{ backgroundColor: '#5a3217', color: '#e5e4cd' }}>
                            {friend.friend_username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold main-text text-sm">{friend.friend_username}</p>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(friend)}
                            <span className="text-xs main-text opacity-60">★{friend.rating}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleChallenge(friend)}
                        disabled={!friend.available}
                        style={{ backgroundColor: friend.available ? '#007e81' : '#9ca3af', color: 'white' }}
                        className="hover:opacity-90"
                      >
                        <Gamepad2 className="w-4 h-4 mr-1" />
                        Challenge
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 main-text opacity-50 mx-auto mb-3" />
                  <p className="main-text opacity-70 text-sm">None of your friends are online</p>
                  <p className="main-text opacity-50 text-xs mt-1">
                    {friends.length === 0 
                      ? 'Add friends from the Member Directory first!' 
                      : 'Check back later or arrange a match!'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="mt-3 text-xs"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="arrange" className="mt-4">
              <div className="space-y-4">
                <Button
                  onClick={() => handleArrangeMatch()}
                  className="w-full"
                  style={{ backgroundColor: '#f26222', color: 'white' }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Match with Friend
                </Button>
                
                {friends.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm main-text opacity-70 mb-3">Or quick-schedule with:</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {friends.slice(0, 5).map(friend => (
                        <div key={friend.id} className="flex items-center justify-between p-2 rounded bg-white/10">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={friend.profile_picture_url} alt={friend.friend_username} className="object-cover" />
                              <AvatarFallback className="text-xs" style={{ backgroundColor: '#5a3217', color: '#e5e4cd' }}>
                                {friend.friend_username.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm main-text">{friend.friend_username}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleArrangeMatch(friend)}
                            className="text-xs px-2"
                          >
                            Schedule
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {friends.length === 0 && (
                  <div className="text-center py-4 text-sm main-text opacity-70">
                    Add friends from the Member Directory to schedule matches!
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ChallengeModal
        isOpen={challengeModalOpen}
        onClose={() => setChallengeModalOpen(false)}
        friend={selectedFriend}
        user={user}
        onChallengeSent={(opponentName) => {
          setChallengeModalOpen(false);
          setSelectedFriend(null);
          if (onMatchArranged) {
            onMatchArranged(opponentName, 'instant');
          }
        }}
      />

      <ArrangeMatchModal
        isOpen={arrangeModalOpen}
        onClose={() => setArrangeModalOpen(false)}
        friend={selectedFriend}
        friends={friends}
        user={user}
        onMatchArranged={(opponentName) => {
          setArrangeModalOpen(false);
          setSelectedFriend(null);
          if (onMatchArranged) {
            onMatchArranged(opponentName, 'scheduled');
          }
        }}
      />

      <style>{`
        .tab-trigger {
          transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          border: none;
          height: auto;
          font-family: inherit;
        }
        .tab-trigger[data-state="inactive"] {
          background-color: rgba(0, 126, 129, 0.5);
          color: rgba(229, 228, 205, 0.8);
        }
        .tab-trigger[data-state="active"] {
          background-color: #007e81;
          color: #e5e4cd;
        }
        .tab-trigger:hover {
          background-color: rgba(0, 126, 129, 0.7);
        }
      `}</style>
    </>
  );
}
