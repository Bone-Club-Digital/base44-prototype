
import React, { useState, useEffect } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Friend } from '@/entities/Friend';
import { PlayerStats } from '@/entities/PlayerStats';
import { Message } from '@/entities/Message';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, UserPlus, MessageSquare, User as UserIcon, UserX, Check, X } from 'lucide-react'; // Added UserX, Check, X icons
import FriendActionModal from '../components/friends/FriendActionModal'; // Added FriendActionModal

// Friend Request Notifications Component
const FriendRequestNotifications = ({ friendRequests, onAction }) => {
  const handleFriendRequest = async (message, accepted) => {
    if (!message.related_entity_id || message.related_entity_type !== 'FriendRequest') {
      console.error('Invalid friend request message');
      return;
    }

    try {
      const { FriendRequest } = await import('@/entities/FriendRequest');
      const { Friend } = await import('@/entities/Friend');
      
      if (accepted) {
        await FriendRequest.update(message.related_entity_id, { status: 'accepted' });
        
        const friendRequest = await FriendRequest.get(message.related_entity_id);
        
        await Friend.create({
          user_id: friendRequest.recipient_id,
          friend_id: friendRequest.sender_id,
          user_username: friendRequest.recipient_username,
          friend_username: friendRequest.sender_username
        });
        
        await Friend.create({
          user_id: friendRequest.sender_id,
          friend_id: friendRequest.recipient_id,
          user_username: friendRequest.sender_username,
          friend_username: friendRequest.recipient_username
        });
        
        // Send notification to the user who accepted
        await Message.create({
            sender_id: 'system',
            sender_username: 'Bone Club',
            recipient_id: friendRequest.recipient_id,
            recipient_username: friendRequest.recipient_username,
            type: 'notification',
            subject: 'Friend Request Accepted',
            body: `You are now friends with ${friendRequest.sender_username}.`,
            status: 'unread',
        });

        // Send notification to the original sender
        await Message.create({
            sender_id: 'system',
            sender_username: 'Bone Club',
            recipient_id: friendRequest.sender_id,
            recipient_username: friendRequest.sender_username,
            type: 'notification',
            subject: 'Friend Request Accepted',
            body: `${friendRequest.recipient_username} accepted your friend request. You are now friends.`,
            status: 'unread',
        });

      } else {
        await FriendRequest.update(message.related_entity_id, { status: 'declined' });
      }
      
      await Message.update(message.id, { status: 'read' });
      onAction(accepted ? 'accepted' : 'declined', message.sender_username);
    } catch (error) {
      console.error("Error responding to friend request:", error);
      alert("Failed to respond to friend request.");
    }
  };
    
  return (
    <Card className="tool-card-bg border-0 elegant-shadow mb-6" style={{ backgroundColor: '#007e81' }}>
        <CardHeader>
            <CardTitle className="text-bone-color flex items-center gap-3">
                <UserPlus className="w-6 h-6" />
                You Have Pending Friend Requests
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
            {friendRequests.map(request => (
                <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                    <p className="font-semibold text-bone-color">
                        <strong className="highlight-text">{request.sender_username}</strong> wants to be your friend
                    </p>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={() => handleFriendRequest(request, true)}
                            style={{ backgroundColor: '#9fd3ba', color: '#5a3217' }}
                            className="hover:opacity-90"
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Accept
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleFriendRequest(request, false)}
                        >
                            <X className="w-4 h-4 mr-2" />
                            Decline
                        </Button>
                    </div>
                </div>
            ))}
        </CardContent>
    </Card>
  );
};

export default function FriendsPage() {
  const { user, loading: userLoading, refetchUnreadMessages } = useUser();
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingFriendRequests, setPendingFriendRequests] = useState([]);
  const [modalState, setModalState] = useState({ isOpen: false, type: null, friendName: '', friendData: null });

  useEffect(() => {
    if (!userLoading && !user) {
      navigate(createPageUrl('Home'));
    }
  }, [user, userLoading, navigate]);

  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Fetch friends and pending friend requests in parallel
        const [friendships, messages] = await Promise.all([
          Friend.filter({ user_id: user.id }),
          Message.filter({ recipient_id: user.id, status: 'unread' }, '-created_date', 20)
        ]);

        const friendIds = friendships.map(f => f.friend_id);

        // Filter for pending friend requests
        const pendingFriendReqs = messages.filter(m => 
          m.related_entity_type === 'FriendRequest' && 
          m.type === 'notification'
        );
        setPendingFriendRequests(pendingFriendReqs);

        if (friendIds.length === 0) {
          setFriends([]);
          setLoading(false);
          return;
        }

        // Fetch player stats for all friends in one go for efficiency
        const friendsStats = await PlayerStats.filter({ 'user_id': { '$in': friendIds } });
        const statsMap = new Map(friendsStats.map(stat => [stat.user_id, stat]));

        // Combine friendship data with player stats
        const enrichedFriends = friendships.map(friendship => {
          const stats = statsMap.get(friendship.friend_id);
          return {
            ...friendship,
            profile_picture_url: stats?.profile_picture_url,
            rating: stats?.rating || 1500,
            public_profile: stats?.public_profile || false
          };
        }).sort((a, b) => a.friend_username.localeCompare(b.friend_username));

        setFriends(enrichedFriends);
      } catch (error) {
        console.error("Failed to fetch friends:", error);
        setFriends([]);
        setPendingFriendRequests([]); // Clear pending requests on error too
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchFriends();
    }
  }, [user]);

  const handleRemoveFriend = async (friendData) => {
    if (!user) return;

    try {
      // Find the friendship record to delete (current user -> friend)
      const friendship = friends.find(f => f.friend_id === friendData.friend_id && f.user_id === user.id);
      if (friendship) {
        await Friend.delete(friendship.id);
        
        // Also delete the reciprocal friendship (friend -> current user)
        const reciprocalFriendships = await Friend.filter({ 
          user_id: friendData.friend_id, 
          friend_id: user.id 
        });
        
        for (const reciprocal of reciprocalFriendships) {
          await Friend.delete(reciprocal.id);
        }

        // Send notification to the removed friend
        await Message.create({
          sender_id: 'system',
          sender_username: 'Bone Club',
          recipient_id: friendData.friend_id,
          recipient_username: friendData.friend_username,
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
          body: `You have removed ${friendData.friend_username} from your friends list.`,
          status: 'unread',
        });

        // Update local state
        setFriends(prev => prev.filter(f => f.friend_id !== friendData.friend_id));

        // Show success modal
        setModalState({
          isOpen: true,
          type: 'remove_success',
          friendName: friendData.friend_username,
          friendData: null // Clear friendData after successful operation
        });
      } else {
        console.warn('Friendship not found for removal:', friendData);
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      // Show error modal or notification
      setModalState({
        isOpen: true,
        type: 'error',
        friendName: '',
        friendData: null
      });
    }
  };

  const showRemoveConfirmation = (friendData) => {
    setModalState({
      isOpen: true,
      type: 'remove_confirm',
      friendName: friendData.friend_username,
      friendData: friendData // Pass full friend data for removal
    });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: null, friendName: '', friendData: null });
  };

  const handleFriendRequestAction = (action, friendName) => {
    if (action === 'accepted') {
      setModalState({
        isOpen: true,
        type: 'accept_success',
        friendName: friendName,
        friendData: null // Clear friendData as it's not a removal
      });
      // Re-fetch friends to show the newly added friend
      // Or manually update the state by adding the friend. Re-fetching is simpler for now.
      // This will trigger the useEffect, but for immediate UI update, we might need a more targeted update.
      // For now, setting pending requests to empty will clear the notifications.
      setLoading(true); // Indicate data is being reloaded
    }
    // Refresh the friend requests list by clearing local state
    setPendingFriendRequests([]);
    // This will refetch all unread messages, effectively removing the processed one.
    refetchUnreadMessages(); 
  };


  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="w-12 h-12 border-4 border-[#5a3217] border-t-transparent rounded-full animate-spin"></div>
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
          if (modalState.friendData && modalState.type === 'remove_confirm') { // Ensure it's a confirmation before triggering remove
            handleRemoveFriend(modalState.friendData);
          }
          closeModal();
        }}
      />
      
      <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Users className="w-16 h-16 mx-auto main-text mb-4" />
            <h1 className="text-4xl font-bold main-text">My Friends</h1>
            <p className="main-text opacity-70 mt-2">Your connected backgammon companions.</p>
          </div>

          {/* Friend Request Notifications */}
          {pendingFriendRequests.length > 0 && (
            <FriendRequestNotifications 
              friendRequests={pendingFriendRequests} 
              onAction={handleFriendRequestAction}
            />
          )}

          <Card className="tool-card-bg border-0 elegant-shadow">
            <CardHeader>
              <CardTitle className="main-text">Friend List ({friends.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-16">
                  <div className="w-8 h-8 border-4 border-[#5a3217] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : friends.length > 0 ? (
                <div className="space-y-4">
                  {friends.map(friend => (
                    <div key={friend.id} className="flex items-center justify-between p-4 rounded-lg bg-white/20">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={friend.profile_picture_url} alt={friend.friend_username} className="object-cover" />
                          <AvatarFallback style={{ backgroundColor: '#5a3217', color: '#e5e4cd' }}>
                            {friend.friend_username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold main-text">{friend.friend_username}</h3>
                          <p className="text-sm main-text opacity-70">Rating: {friend.rating}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {friend.public_profile && (
                          <Link to={createPageUrl(`PublicProfile?username=${encodeURIComponent(friend.friend_username)}`)}>
                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                              <UserIcon className="w-3 h-3" />
                              Profile
                            </Button>
                          </Link>
                        )}
                        {/* Message button: Outline suggests removing the Link wrapper, which makes it non-navigational. Implementing as per outline. */}
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          Message
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => showRemoveConfirmation(friend)} // Call showRemoveConfirmation
                          className="flex items-center gap-1"
                        >
                          <UserX className="w-3 h-3" /> {/* UserX icon */}
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <UserPlus className="w-16 h-16 main-text opacity-50 mx-auto mb-4" /> {/* Updated icon */}
                  <h3 className="text-xl font-bold main-text mb-2">No Friends Yet</h3> {/* Updated heading */}
                  <p className="main-text opacity-70 mb-4">
                    Start building your network by visiting the Member Directory and sending friend requests. {/* Updated text */}
                  </p>
                  <Link to={createPageUrl('MemberDirectory')}>
                    <Button style={{ backgroundColor: '#007e81', color: 'white' }}> {/* Updated button style */}
                      Browse Members {/* Updated button text */}
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
