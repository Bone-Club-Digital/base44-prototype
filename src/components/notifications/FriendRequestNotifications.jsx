import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, Check, X } from 'lucide-react';
import { respondToFriendRequest } from '@/functions/respondToFriendRequest'; // Use the new function

export default function FriendRequestNotifications({ friendRequests, onAction }) {
  const handleFriendRequest = async (message, accepted) => {
    if (!message.related_entity_id || message.related_entity_type !== 'FriendRequest') {
      console.error('Invalid friend request message:', message);
      return;
    }

    try {
      const response = await respondToFriendRequest({ // Call the new function
        friend_request_id: message.related_entity_id,
        message_id: message.id,
        accepted: accepted
      });

      if (response.data && response.data.success) {
        onAction(accepted ? 'accepted' : 'declined', response.data.sender_username);
      } else {
        throw new Error(response.data?.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error("Error responding to friend request:", error);
      
      const errorMessage = error.response?.data?.error || error.message || 'An unknown error occurred.';
      alert("Failed to respond to friend request: " + errorMessage);
      
      // Refresh the list regardless of error to clear out potentially stale items.
      onAction('refresh', null);
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
}