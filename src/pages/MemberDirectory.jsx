
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { PlayerStats } from '@/entities/PlayerStats';
import { Badge as BadgeEntity } from '@/entities/Badge';
import { UserBadge } from '@/entities/UserBadge';
import { FriendRequest } from '@/entities/FriendRequest';
import { Friend } from '@/entities/Friend';
import { Message } from '@/entities/Message'; // Added import for Message entity
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Users, Search, ChevronLeft, ChevronRight, Star, Trophy,
  TrendingUp, Dices, Shield, Award, User as UserIcon, UserPlus, X
} from 'lucide-react';
import FriendActionModal from '../components/friends/FriendActionModal'; // New import for the modal
import { sendFriendRequest } from '@/functions/sendFriendRequest'; // New import for the backend function
import FriendRequestNotifications from '../components/notifications/FriendRequestNotifications'; // ADD THIS IMPORT

// Define a map of icons available for badges
const icons = { TrendingUp, Dices, Users, Trophy, Shield, Award };

const BadgeDisplay = ({ badge }) => {
    if (!badge) return null;
    const IconComponent = icons[badge.icon] || icons.Award;
    
    // Handle both hex colors and Tailwind class names
    const getBackgroundColor = (colorValue) => {
        // If it's already a hex color, use it directly
        if (colorValue && colorValue.startsWith('#')) {
            return colorValue;
        }
        
        // Otherwise, try to map from Tailwind classes (for backward compatibility)
        const colorMap = {
            'bg-blue-500': '#3b82f6',
            'bg-green-500': '#10b981',
            'bg-red-500': '#ef4444',
            'bg-yellow-500': '#f59e0b',
            'bg-purple-500': '#8b5cf6',
            'bg-pink-500': '#ec4899',
            'bg-indigo-500': '#6366f1',
            'bg-gray-500': '#6b7280',
            'bg-orange-500': '#f97316',
            'bg-teal-500': '#14b8a6',
        };
        
        // Check if the colorValue directly matches a key in the map
        if (colorValue && colorMap[colorValue]) {
            return colorMap[colorValue];
        }

        // Fallback to trying to extract a tailwind class from a string,
        // which might be useful if the stored value is not a direct class name
        const match = colorValue?.match(/bg-(\w+-\d+)/);
        if (match) {
            const fullClass = `bg-${match[1]}`;
            return colorMap[fullClass] || '#6b7280'; // default fallback for matched but unmapped
        }
        
        return '#6b7280'; // default fallback for unrecognized values
    };
    
    return (
        <div 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-xs font-medium" 
            style={{ backgroundColor: getBackgroundColor(badge.color) }}
            title={badge.description}
        >
            <IconComponent className="w-3 h-3" />
            <span>{badge.name}</span>
        </div>
    );
};

export default function MemberDirectoryPage() {
  const { user, loading, refetchUnreadMessages } = useUser();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [badges, setBadges] = useState([]);
  const [userBadges, setUserBadges] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingFriendRequests, setPendingFriendRequests] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('username');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [membersPerPage] = useState(20);
  const [selectedLetter, setSelectedLetter] = useState('All');
  const [modalState, setModalState] = useState({ isOpen: false, type: null, friendName: '', memberData: null });

  // Function to fetch only friend-related data and pending notifications
  const fetchPendingNotifications = useCallback(async () => {
    if (!user) return; // Only fetch if user is logged in
    try {
      const [
        allFriendRequestsResult,
        userFriendsResult,
        unreadFriendRequestMessagesResult
      ] = await Promise.allSettled([
        FriendRequest.list(),
        Friend.filter({ user_id: user.id }),
        Message.filter({ recipient_id: user.id, status: 'unread', type: 'notification' }, '-created_date', 20)
      ]);

      setFriendRequests(allFriendRequestsResult.status === 'fulfilled' ? allFriendRequestsResult.value : []);
      setFriends(userFriendsResult.status === 'fulfilled' ? userFriendsResult.value : []);
      
      const messages = unreadFriendRequestMessagesResult.status === 'fulfilled' ? unreadFriendRequestMessagesResult.value : [];
      const pendingFriendReqs = messages.filter(m =>
        m.related_entity_type === 'FriendRequest'
      );
      setPendingFriendRequests(pendingFriendReqs);

    } catch (error) {
      console.error('Error refetching friend data and notifications:', error);
    }
  }, [user]);

  const fetchMembersData = useCallback(async () => {
    try {
      const promises = [
        PlayerStats.list(),
        BadgeEntity.list(),
        UserBadge.list()
      ];

      // Add friend-related data fetching if user is logged in
      if (user) {
        promises.push(FriendRequest.list());
        promises.push(Friend.filter({ user_id: user.id })); // Only get current user's friendships
        // Fetch unread messages that are friend request notifications for the current user
        promises.push(Message.filter({ recipient_id: user.id, status: 'unread', type: 'notification' }, '-created_date', 20));
      }

      const results = await Promise.allSettled(promises);

      const allPlayers = results[0].status === 'fulfilled' ? results[0].value : [];
      setBadges(results[1].status === 'fulfilled' ? results[1].value : []);
      setUserBadges(results[2].status === 'fulfilled' ? results[2].value : []);
      
      if (user) {
        setFriendRequests(results[3].status === 'fulfilled' ? results[3].value : []);
        setFriends(results[4].status === 'fulfilled' ? results[4].value : []);
        
        const messages = results[5].status === 'fulfilled' ? results[5].value : [];
        const pendingFriendReqs = messages.filter(m => 
          m.related_entity_type === 'FriendRequest'
        );
        setPendingFriendRequests(pendingFriendReqs);
      }

      // Filter out players without usernames (incomplete profiles)
      const validPlayers = allPlayers.filter(player => player.username && player.username.trim());
      
      setMembers(validPlayers);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setMembersLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMembersData();
  }, [fetchMembersData]);

  const handleSendFriendRequest = async (memberData) => {
    if (!user) {
      alert('Please log in to send friend requests.');
      return;
    }

    try {
      // Call the new secure backend function
      await sendFriendRequest({
        recipient_id: memberData.user_id,
        recipient_username: memberData.username,
      });

      // Update local state to show the request is sent, providing immediate feedback
      setFriendRequests(prev => [...prev, {
        sender_id: user.id,
        recipient_id: memberData.user_id,
        status: 'pending'
      }]);

      // Show success modal
      setModalState({
        isOpen: true,
        type: 'add_success',
        friendName: memberData.username,
        memberData: null
      });
    } catch (error) {
      console.error('Error sending friend request:', error);
      const errorMessage = error.response?.data?.error || 'Failed to send friend request. Please try again.';
      alert(errorMessage);
    }
  };

  const handleRemoveFriend = async (memberData) => {
    if (!user) return;

    try {
      // Find the friendship record to delete
      const friendship = friends.find(f => f.friend_id === memberData.user_id);
      if (friendship) {
        await Friend.delete(friendship.id);
        
        // Also delete the reciprocal friendship
        const reciprocalFriendships = await Friend.filter({ 
          user_id: memberData.user_id, 
          friend_id: user.id 
        });
        
        for (const reciprocal of reciprocalFriendships) {
          await Friend.delete(reciprocal.id);
        }

        // Send notification to the removed friend
        await Message.create({
          sender_id: 'system',
          sender_username: 'Bone Club',
          recipient_id: memberData.user_id,
          recipient_username: memberData.username,
          type: 'notification',
          subject: 'Friend Removed',
          body: `${user.username} has removed you from their friends list.`,
          status: 'unread',
        });

        // Send notification to current user
        await Message.create({
          sender_id: 'system',
          sender_username: 'Bone Club',
          recipient_id: user.id,
          recipient_username: user.username,
          type: 'notification',
          subject: 'Friend Removed',
          body: `You have removed ${memberData.username} from your friends list.`,
          status: 'unread',
        });

        // Update local state
        setFriends(prev => prev.filter(f => f.friend_id !== memberData.user_id));

        // Show success modal
        setModalState({
          isOpen: true,
          type: 'remove_success',
          friendName: memberData.username,
          memberData: null
        });
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      alert('Failed to remove friend. Please try again.');
    }
  };

  const showRemoveConfirmation = (memberData) => {
    setModalState({
      isOpen: true,
      type: 'remove_confirm',
      friendName: memberData.username,
      memberData: memberData // Pass memberData to the modal for confirmation
    });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: null, friendName: '', memberData: null });
  };

  const handleFriendRequestAction = async (action, friendName) => {
    if (action === 'accepted') {
      setModalState({
        isOpen: true,
        type: 'accept_success',
        friendName: friendName,
        memberData: null
      });
    } else if (action === 'declined') {
      // Optional: Add feedback for declined if needed, or simply refresh
      // For now, just refresh without a modal for decline.
    }
    // Always refresh data after an action on friend requests
    fetchPendingNotifications();
    refetchUnreadMessages();
  };

  const getFriendshipStatus = (memberData) => {
    if (!user) return null;
    
    // Check if they're already friends - look for friendship where this member is the friend
    // Since `friends` state now only contains friendships where `user.id` is the `user_id`,
    // we only need to check if `memberData.user_id` is present as `friend_id`.
    const friendship = friends.find(f => f.friend_id === memberData.user_id);
    if (friendship) return 'friends';

    // Check if there's a pending friend request (sent by current user)
    const sentRequest = friendRequests.find(fr => 
      fr.sender_id === user.id && fr.recipient_id === memberData.user_id && fr.status === 'pending'
    );
    if (sentRequest) return 'request_sent';

    const receivedRequest = friendRequests.find(fr => 
      fr.recipient_id === user.id && fr.sender_id === memberData.user_id && fr.status === 'pending'
    );
    if (receivedRequest) return 'request_received';

    return null;
  };

  const handleLetterSelect = (letter) => {
    setSelectedLetter(letter);
    setCurrentPage(1);
    setSearchTerm('');
  };

  const getSortValue = (memberData, sortField) => {
    switch (sortField) {
      case 'username': return memberData.username || '';
      case 'rating': return memberData.rating || 1500;
      case 'games_played': return memberData.games_played || 0;
      case 'games_won': return memberData.games_won || 0;
      default: return memberData.username || '';
    }
  };
  
  const availableLetters = useMemo(() => {
    const letters = new Set();
    members.forEach(member => {
      const value = getSortValue(member, sortBy);
      if (typeof value === 'string' && value) {
        letters.add(value[0].toUpperCase());
      }
    });
    return letters;
  }, [members, sortBy]);

  // Filter and sort members
  const filteredAndSortedMembers = members
    .filter(memberData => {
      // Letter filter applied first
      if (selectedLetter !== 'All') {
        const value = getSortValue(memberData, sortBy);
        if (typeof value !== 'string' || !value || value[0].toUpperCase() !== selectedLetter) {
          return false;
        }
      }

      // Then search term filter
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        (memberData.username && memberData.username.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => {
      let aValue = getSortValue(a, sortBy);
      let bValue = getSortValue(b, sortBy);
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      } else {
        // Numeric comparison
        const comparison = aValue - bValue;
        return sortOrder === 'asc' ? comparison : -comparison;
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedMembers.length / membersPerPage);
  const startIndex = (currentPage - 1) * membersPerPage;
  const endIndex = startIndex + membersPerPage;
  const currentMembers = filteredAndSortedMembers.slice(startIndex, endIndex);

  // Generate pagination items
  const generatePaginationItems = () => {
    const items = [];
    const maxItems = 10;
    
    if (totalPages <= maxItems) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      if (currentPage <= 5) {
        for (let i = 1; i <= 7; i++) items.push(i);
        items.push('...');
        items.push(totalPages);
      } else if (currentPage >= totalPages - 4) {
        items.push(1);
        items.push('...');
        for (let i = totalPages - 6; i <= totalPages; i++) items.push(i);
      } else {
        items.push(1);
        items.push('...');
        for (let i = currentPage - 2; i <= currentPage + 2; i++) items.push(i);
        items.push('...');
        items.push(totalPages);
      }
    }
    return items;
  };

  // Create a map for quick badge lookup
  const badgeMap = useMemo(() => {
      const map = new Map();
      badges.forEach(b => map.set(b.id, b));
      return map;
  }, [badges]);

  if (loading || membersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#5a3217] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="main-text">Loading member directory...</p>
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
          if (modalState.memberData) {
            handleRemoveFriend(modalState.memberData);
          }
          closeModal();
        }}
      />
      
      <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold main-text">Member Directory</h1>
            <p className="main-text opacity-70 mt-2">Browse and connect with fellow Bone Club members</p>
          </div>

          {/* Notifications */}
          <div className="mb-8">
            {user && pendingFriendRequests.length > 0 && (
              <FriendRequestNotifications 
                friendRequests={pendingFriendRequests} 
                onAction={handleFriendRequestAction}
              />
            )}
          </div>

          {/* Search and Sort Controls */}
          <Card className="tool-card-bg border-0 elegant-shadow mb-6">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap justify-center gap-1">
                <Button
                  variant={selectedLetter === 'All' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLetterSelect('All')}
                  style={selectedLetter === 'All' ? { backgroundColor: '#5a3217', color: '#e5e4cd' } : {}}
                >
                  All
                </Button>
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                  <Button
                    key={letter}
                    variant={selectedLetter === letter ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleLetterSelect(letter)}
                    disabled={!availableLetters.has(letter)}
                    className="w-8 h-8 p-0"
                    style={
                      selectedLetter === letter 
                          ? { backgroundColor: '#5a3217', color: '#e5e4cd' } 
                          : !availableLetters.has(letter) 
                              ? { opacity: 0.5, cursor: 'not-allowed' } 
                              : {}
                    }
                  >
                    {letter}
                  </Button>
                ))}
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-grow relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <Input
                    placeholder="Search members by username..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                      setSelectedLetter('All');
                    }}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="username">Username</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="games_played">Games Played</SelectItem>
                      <SelectItem value="games_won">Games Won</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">A-Z / Low-High</SelectItem>
                      <SelectItem value="desc">Z-A / High-Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="mt-3 text-sm main-text opacity-70">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedMembers.length)} of {filteredAndSortedMembers.length} members
              </div>
            </CardContent>
          </Card>

          {/* Members Grid */}
          <div className="grid gap-6">
            {currentMembers.map(memberData => {
              const assignedBadgeIds = userBadges.filter(ub => ub.user_id === memberData.user_id).map(ub => ub.badge_id);
              const assignedBadges = assignedBadgeIds.map(id => badgeMap.get(id)).filter(Boolean);
              const winRate = memberData.games_played > 0 ? Math.round((memberData.games_won / memberData.games_played) * 100) : 0;
              const friendshipStatus = getFriendshipStatus(memberData);

              return (
                <Card key={memberData.id} className="tool-card-bg border-0 elegant-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        {memberData.profile_picture_url ? (
                          <img
                            src={memberData.profile_picture_url}
                            alt={memberData.username}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-[#5a3217] flex items-center justify-center">
                            <UserIcon className="w-8 h-8 text-[#e5e4cd]" />
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            {memberData.public_profile ? (
                              <Link 
                                to={createPageUrl(`PublicProfile?username=${encodeURIComponent(memberData.username)}`)}
                                className="text-xl font-bold main-text hover:underline"
                              >
                                {memberData.username}
                              </Link>
                            ) : (
                              <h3 className="text-xl font-bold main-text">
                                {memberData.username}
                              </h3>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm main-text">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span>Rating: {memberData.rating || 1500}</span>
                            </div>
                            <div>Games: {memberData.games_played || 0}</div>
                            <div>Wins: {memberData.games_won || 0}</div>
                            <div>Win Rate: {winRate}%</div>
                          </div>

                          {/* Display assigned badges */}
                          {assignedBadges.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {assignedBadges.map(badge => (
                                <BadgeDisplay key={badge.id} badge={badge} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Friend Request Button */}
                      <div className="flex items-center gap-2">
                        {user && user.id !== memberData.user_id && memberData.allow_friend_requests && (
                          <>
                            {friendshipStatus === 'friends' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => showRemoveConfirmation(memberData)} // Changed to show confirmation modal
                                className="flex items-center gap-1"
                              >
                                <X className="w-3 h-3" />
                                Remove Friend
                              </Button>
                            )}
                            {friendshipStatus === 'request_sent' && (
                              <Badge variant="outline" className="opacity-60">
                                Request Sent
                              </Badge>
                            )}
                            {friendshipStatus === 'request_received' && (
                              <Badge style={{ backgroundColor: '#f26222', color: '#e5e4cd' }}>
                                Pending
                              </Badge>
                            )}
                            {!friendshipStatus && (
                              <Button
                                size="sm"
                                onClick={() => handleSendFriendRequest(memberData)}
                                style={{ backgroundColor: '#007e81', color: 'white' }}
                                className="flex items-center gap-1"
                              >
                                <UserPlus className="w-3 h-3" />
                                Add Friend
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
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
                  
                  {generatePaginationItems().map((item, index) => (
                    <React.Fragment key={index}>
                      {item === '...' ? (
                        <span className="px-2 py-1 text-sm main-text opacity-50">...</span>
                      ) : (
                        <Button
                          variant={currentPage === item ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(item)}
                          style={currentPage === item ? { backgroundColor: '#5a3217', color: '#e5e4cd' } : {}}
                          className="w-10 h-8"
                        >
                          {item}
                        </Button>
                      )}
                    </React.Fragment>
                  ))}
                  
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
                
                <div className="text-center mt-2 text-sm main-text opacity-70">
                  Page {currentPage} of {totalPages}
                </div>
              </CardContent>
            </Card>
          )}

          {currentMembers.length === 0 && (
            <Card className="tool-card-bg border-0 elegant-shadow text-center py-12">
              <CardContent>
                <Users className="w-16 h-16 main-text opacity-50 mx-auto mb-4" />
                <h3 className="text-xl font-bold main-text mb-2">
                  {searchTerm || selectedLetter !== 'All' ? 'No Members Found' : 'No Members Yet'}
                </h3>
                <p className="main-text opacity-70">
                  {searchTerm 
                    ? `No members match your search for "${searchTerm}"`
                    : selectedLetter !== 'All' 
                      ? `No members match the selected filter.`
                      : 'Members will appear here as they join.'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
