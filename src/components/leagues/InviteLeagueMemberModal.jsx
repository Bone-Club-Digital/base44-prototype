
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { sendBulkLeagueInvitations } from '@/functions/sendBulkLeagueInvitations';
import { getAvailableUsersForLeagueInvite } from '@/functions/getAvailableUsersForLeagueInvite'; // Updated import

export default function InviteLeagueMemberModal({ isOpen, onClose, league, onInvitesSent }) {
    const [availableUsers, setAvailableUsers] = useState([]);
    const [loading, setLoading] = useState(true); // Renamed from loadingUsers in outline to match existing state
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchAvailableUsers = useCallback(async () => {
        if (!league || !league.id) {
            console.error('[InviteLeagueMemberModal] No league or league.id provided:', league);
            setAvailableUsers([]);
            setLoading(false); // Using setLoading as per existing state variable
            return;
        }

        setLoading(true); // Using setLoading as per existing state variable
        try {
            console.log('[InviteLeagueMemberModal] Fetching users for league ID:', league.id);
            const response = await getAvailableUsersForLeagueInvite({ league_id: league.id });
            
            if (response && response.data) {
                setAvailableUsers(response.data.users || []);
                console.log('[InviteLeagueMemberModal] Diagnostic:', response.data.diagnostic);
            } else {
                console.error('[InviteLeagueMemberModal] Invalid response format:', response);
                setAvailableUsers([]);
            }
        } catch (error) {
            console.error('[InviteLeagueMemberModal] Error fetching available users:', error);
            console.error('[InviteLeagueMemberModal] Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                leagueId: league?.id
            });
            setAvailableUsers([]);
        } finally {
            setLoading(false); // Using setLoading as per existing state variable
        }
    }, [league]);

    useEffect(() => {
        if (isOpen) {
            fetchAvailableUsers();
            setSelectedMembers([]);
            setSearchTerm('');
        }
    }, [isOpen, fetchAvailableUsers]);

    const handleSelectUser = (user) => {
        setSelectedMembers(prev =>
            prev.some(u => u.user_id === user.user_id)
                ? prev.filter(u => u.user_id !== user.user_id)
                : [...prev, user]
        );
    };

    const filteredUsers = availableUsers.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectAll = () => {
        if (selectedMembers.length === filteredUsers.length) {
            setSelectedMembers([]);
        } else {
            setSelectedMembers(filteredUsers);
        }
    };

    const handleInvite = async () => {
        if (selectedMembers.length === 0) {
            alert("Please select at least one member to invite.");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await sendBulkLeagueInvitations({
                league_id: league.id,
                user_ids: selectedMembers.map(m => m.user_id)
            });

            const result = response.data;
            console.log('Bulk league invitation result:', result);

            if (result.success) {
                // Create detailed success message
                let successMessage = '';
                
                if (result.messages_sent > 0) {
                    successMessage = `Successfully sent ${result.messages_sent} league invitations!`;
                }
                
                if (result.bogus_users_auto_registered > 0) {
                    successMessage += ` ${result.bogus_users_auto_registered} test members were automatically registered.`;
                }
                
                if (result.admin_joined) {
                    successMessage += ' You have been automatically added to the league.';
                }

                if (!successMessage) {
                    successMessage = `Successfully processed ${result.invited_count} invitations.`;
                }

                console.log('Sending success message:', successMessage);

                // Clear form
                setSelectedMembers([]);
                setSearchTerm('');

                // Call the success callback
                if (onInvitesSent) {
                    onInvitesSent(successMessage);
                }

                onClose(); // Close the modal on successful invite
            } else {
                alert(`Error: ${result.error || 'Failed to send invitations'}`);
            }
        } catch (error) {
            console.error("Error inviting members:", error);
            alert(`Failed to send invitations: ${error.response?.data?.error || error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md text-white" style={{ backgroundColor: '#5a3217' }}>
                <DialogHeader>
                    <DialogTitle className="text-xl text-white uppercase">Invite Participants</DialogTitle>
                    <DialogDescription className="text-bone-color-faded">
                        Select club members to invite to the league.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <Input
                        placeholder="Search for members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin text-bone-color" />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="select-all"
                                    checked={filteredUsers.length > 0 && selectedMembers.length === filteredUsers.length}
                                    onCheckedChange={handleSelectAll}
                                />
                                <label htmlFor="select-all" className="text-sm font-medium leading-none text-bone-color">
                                    Select All Filtered
                                </label>
                            </div>
                            <ScrollArea className="h-64 border border-white/20 rounded-md p-2">
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map(user => (
                                        <div key={user.user_id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-white/10">
                                            <Checkbox
                                                id={`user-${user.user_id}`}
                                                checked={selectedMembers.some(u => u.user_id === user.user_id)}
                                                onCheckedChange={() => handleSelectUser(user)}
                                            />
                                            <label htmlFor={`user-${user.user_id}`} className="flex items-center gap-3 cursor-pointer flex-grow">
                                                <Avatar className="w-8 h-8">
                                                    <AvatarImage src={user.profile_picture_url} />
                                                    <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-bone-color">{user.username}</span>
                                            </label>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-bone-color-faded py-10">No available members found.</div>
                                )}
                            </ScrollArea>
                        </>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button
                        onClick={handleInvite}
                        disabled={isSubmitting || selectedMembers.length === 0}
                        style={{ backgroundColor: '#f26222', color: 'white' }}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            `Send Invites (${selectedMembers.length})`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
