
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Info } from "lucide-react"; // Added Info icon
import { Checkbox } from "@/components/ui/checkbox";
import { sendBulkClubInvitations } from '@/functions/sendBulkClubInvitations';
import { getAvailableUsersForInvite } from '@/functions/getAvailableUsersForInvite';

export default function InviteMemberModal({ isOpen, onClose, club, onInviteSent }) {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLetter, setSelectedLetter] = useState('All');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  const fetchAvailableUsers = useCallback(async () => {
    if (!club || !club.id) {
      console.error('[InviteMemberModal] No club or club.id provided:', club);
      setAvailableUsers([]);
      setLoadingUsers(false);
      return;
    }

    setLoadingUsers(true);
    setDebugInfo(''); // Clear previous debug info
    try {
      console.log('[InviteMemberModal] Fetching users for club ID:', club.id);
      const response = await getAvailableUsersForInvite({ club_id: club.id });
      
      if (response && response.data) {
        const users = response.data.users || []; 
        const diagnosticMessage = response.data.diagnostic || 'No diagnostic message received.';
        setAvailableUsers(users.sort((a, b) => (a.username || '').localeCompare(b.username || '')));
        setDebugInfo(diagnosticMessage); // Set diagnostic message
      } else {
        console.error('[InviteMemberModal] Invalid response format:', response);
        setAvailableUsers([]);
        setDebugInfo('Invalid response format received from server.'); // Set error message for invalid format
      }
    } catch (error) {
      console.error('[InviteMemberModal] Error fetching users:', error);
      console.error('[InviteMemberModal] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        clubId: club?.id
      });
      const errorMsg = error.response?.data?.error || error.message;
      const diagnosticMsg = error.response?.data?.diagnostic; // Capture diagnostic from error response
      setAvailableUsers([]);
      setDebugInfo(diagnosticMsg || `Error: ${errorMsg}`); // Set error message, prioritizing diagnostic if available
    } finally {
      setLoadingUsers(false);
    }
  }, [club]);

  useEffect(() => {
    if (isOpen && club) {
      console.log('[InviteMemberModal] Modal opened with club:', { id: club.id, name: club.name });
      fetchAvailableUsers();
    }
  }, [isOpen, club, fetchAvailableUsers]);

  useEffect(() => {
    let filtered = availableUsers;
    if (selectedLetter !== 'All') {
      filtered = filtered.filter(user => user.username && user.username.toLowerCase().startsWith(selectedLetter.toLowerCase()));
    }
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(user => user.username && user.username.toLowerCase().includes(searchLower));
    }
    setFilteredUsers(filtered);
  }, [availableUsers, searchTerm, selectedLetter]);

  const handleToggleUser = (user) => {
    setSelectedUsers(prev => {
      if (prev.some(u => u.user_id === user.user_id)) {
        return prev.filter(u => u.user_id !== user.user_id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedUsers.length === 0) {
      alert('Please select at least one user to invite.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await sendBulkClubInvitations({
        club_id: club.id,
        club_name: club.name,
        users_to_invite: selectedUsers
      });

      const { results } = response.data;
      
      let message = '';
      if (results.sent.length > 0) {
        message += `Successfully invited: ${results.sent.map(u => u.username).join(', ')}\n`;
      }
      if (results.skipped.length > 0) {
        message += `Skipped: ${results.skipped.map(s => `${s.username} (${s.reason})`).join(', ')}\n`;
      }
      if (results.failed.length > 0) {
        message += `Failed: ${results.failed.map(f => `${f.username} (${f.error})`).join(', ')}`;
      }
      
      alert(message || 'Invitations processed successfully!');
      
      if (results.sent.length > 0) {
        onInviteSent(results);
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send invitations';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableLetters = React.useMemo(() => {
    const letters = new Set();
    availableUsers.forEach(user => {
      if (user.username && user.username.length > 0) letters.add(user.username[0].toUpperCase());
    });
    return Array.from(letters).sort();
  }, [availableUsers]);
  
  if (!club) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col text-white" style={{ backgroundColor: '#5a3217' }}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-white uppercase">Invite Members to {club?.name || 'Club'}</DialogTitle>
          <DialogDescription className="text-bone-color-faded">
            Select one or more registered users to invite them to your club.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 flex-grow overflow-hidden flex flex-col">
           {loadingUsers ? (
            <div className="flex-grow flex items-center justify-center text-bone-color-faded">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
            </div>
          ) : availableUsers.length > 0 ? (
            <>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input placeholder="Search users by username..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-[#e5e4cd] text-[#5a3217] border-transparent focus:ring-[#5a3217]" />
                </div>
                <div className="flex flex-wrap gap-1">
                  <button onClick={() => setSelectedLetter('All')} className={`px-2 py-1 text-xs rounded ${selectedLetter === 'All' ? 'bg-[#f26222] text-white' : 'bg-[#e5e4cd] text-[#5a3217] hover:bg-[#e5e4cd]/80'}`}>All</button>
                  {availableLetters.map(letter => (
                    <button key={letter} onClick={() => setSelectedLetter(letter)} className={`px-2 py-1 text-xs rounded ${selectedLetter === letter ? 'bg-[#f26222] text-white' : 'bg-[#e5e4cd] text-[#5a3217] hover:bg-[#e5e4cd]/80'}`}>{letter}</button>
                  ))}
                </div>
              </div>

              <div className="flex-grow overflow-y-auto border border-white/20 rounded">
                {filteredUsers.length > 0 ? (
                  <div className="space-y-1 p-2">
                    {filteredUsers.map((user) => (
                      <label
                        key={user.user_id}
                        htmlFor={`user-invite-${user.user_id}`}
                        className={`w-full text-left p-3 rounded transition-colors flex items-center gap-4 cursor-pointer ${
                          selectedUsers.some(u => u.user_id === user.user_id)
                            ? 'bg-[#007e81]'
                            : 'bg-white/10 hover:bg-white/20'
                        }`}
                      >
                        <Checkbox
                          id={`user-invite-${user.user_id}`}
                          checked={selectedUsers.some(u => u.user_id === user.user_id)}
                          onCheckedChange={() => handleToggleUser(user)}
                        />
                        <div className="flex items-center justify-between flex-grow">
                          <div>
                            <div className="font-medium text-white">{user.username}</div>
                            <div className="text-sm opacity-70 text-bone-color-faded">Rating: {user.rating}</div>
                          </div>
                          {user.profile_picture_url ? (
                            <img src={user.profile_picture_url} alt={user.username} className="w-10 h-10 rounded-full object-cover"/>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-white/20 flex-shrink-0"></div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-bone-color-faded">No users match your search criteria.</div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center text-bone-color-faded p-4">
                <Info className="w-10 h-10 mb-4" />
                <p className="font-bold text-lg mb-2">No users available</p>
                <p className="text-sm mb-4">No users were found that can be invited to this club.</p>
                <div className="w-full bg-black/20 p-3 rounded-md text-left font-mono text-xs overflow-x-auto">
                    <p className="font-bold mb-1">Diagnostic Info:</p>
                    <p>{debugInfo || 'No diagnostic information available.'}</p>
                </div>
                <Button onClick={fetchAvailableUsers} variant="outline" size="sm" className="mt-4 bg-[#e5e4cd] text-[#5a3217] border-transparent hover:bg-[#e5e4cd]/80">
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="bg-[#e5e4cd] text-[#5a3217] border-transparent hover:bg-[#e5e4cd]/80">Cancel</Button>
          <Button type="submit" onClick={handleSubmit} disabled={selectedUsers.length === 0 || isSubmitting} style={{ backgroundColor: '#f26222', color: 'white' }}>
            {isSubmitting ? 'Sending...' : `Send ${selectedUsers.length} Invitation(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
