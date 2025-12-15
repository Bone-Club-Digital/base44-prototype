import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, UserPlus, Star } from "lucide-react";
import { getAvailableUsersForTournamentInvite } from '@/functions/getAvailableUsersForTournamentInvite';
import { sendBulkTournamentInvitations } from '@/functions/sendBulkTournamentInvitations';

export default function InviteTournamentMemberModal({ isOpen, onClose, tournament, onInviteSent }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Fetch available users when modal opens
  useEffect(() => {
    if (isOpen && tournament) {
      fetchAvailableUsers();
    } else {
      // Reset state when modal closes
      setSearchTerm('');
      setSelectedUsers([]);
      setError('');
    }
  }, [isOpen, tournament]);

  const fetchAvailableUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getAvailableUsersForTournamentInvite({ 
        tournament_id: tournament.id 
      });
      setAvailableUsers(data.availableUsers || []);
    } catch (error) {
      console.error('Error fetching available users:', error);
      setError('Failed to load available users');
      setAvailableUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = availableUsers.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.user_id === user.user_id);
      if (isSelected) {
        return prev.filter(u => u.user_id !== user.user_id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleSendInvitations = async () => {
    if (selectedUsers.length === 0) return;

    setSending(true);
    setError('');
    try {
      const { data } = await sendBulkTournamentInvitations({
        tournament_id: tournament.id,
        tournament_name: tournament.name,
        users_to_invite: selectedUsers
      });
      
      if (data.success) {
        const { results } = data;
        let message = `Sent ${results.sent.length} invitation(s)`;
        if (results.skipped.length > 0) {
          message += `, skipped ${results.skipped.length}`;
        }
        if (results.failed.length > 0) {
          message += `, failed ${results.failed.length}`;
        }
        alert(message);
        onInviteSent();
        onClose();
      } else {
        setError(data.error || 'Failed to send invitations');
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
      setError('Failed to send invitations');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col" style={{ backgroundColor: '#5a3217', color: 'white' }}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-white uppercase">
            Invite Players to {tournament?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search for players to invite..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          </div>

          {/* Selected Users Summary */}
          {selectedUsers.length > 0 && (
            <div className="p-3 bg-white/10 rounded-lg">
              <p className="text-sm text-white/80 mb-2">Selected ({selectedUsers.length}):</p>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(user => (
                  <Badge
                    key={user.user_id}
                    variant="secondary"
                    className="cursor-pointer hover:bg-red-500"
                    onClick={() => toggleUserSelection(user)}
                  >
                    {user.username} ✕
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* User List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-white/70">Loading players...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="space-y-2">
                {filteredUsers.map(user => {
                  const isSelected = selectedUsers.some(u => u.user_id === user.user_id);
                  return (
                    <div
                      key={user.user_id}
                      onClick={() => toggleUserSelection(user)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-green-600/20 border border-green-400' : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.profile_picture_url} alt={user.username} />
                          <AvatarFallback className="bg-[#007e81] text-white">
                            {user.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-white">{user.username}</p>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400" />
                            <span className="text-xs text-white/70">{user.rating || 1500}</span>
                          </div>
                        </div>
                      </div>
                      {isSelected ? (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm">✓</span>
                        </div>
                      ) : (
                        <div className="w-6 h-6 border-2 border-white/30 rounded-full"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-white/70">
                {searchTerm ? 'No players found matching your search.' : 'No players available to invite.'}
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="text-white border-white/30 hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendInvitations}
            disabled={selectedUsers.length === 0 || sending}
            style={{ backgroundColor: '#f26222', color: 'white' }}
            className="flex items-center gap-2"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {sending ? 'Sending...' : `Invite ${selectedUsers.length} Player${selectedUsers.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}