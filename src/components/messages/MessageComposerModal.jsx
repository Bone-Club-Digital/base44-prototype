import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ClubMember } from "@/entities/ClubMember";
import { sendMessage } from "@/functions/sendMessage";
import { sendClubwideMessage } from "@/functions/sendClubwideMessage";
import { useUser } from '../auth/UserProvider';
import { debounce } from 'lodash';
import { X, Users, UserCheck } from 'lucide-react';

export default function MessageComposerModal({ isOpen, onClose, onMessageSent, replyTo = null, initialClub = null }) {
  const { user } = useUser();
  const [recipients, setRecipients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  
  const [useClubMessaging, setUseClubMessaging] = useState(false);
  const [userClubs, setUserClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState('');
  const [clubMessagingMode, setClubMessagingMode] = useState('all'); // 'all' or 'select'
  const [clubMembers, setClubMembers] = useState([]);
  const [selectedClubMembers, setSelectedClubMembers] = useState([]);
  const [loadingClubMembers, setLoadingClubMembers] = useState(false);

  const fetchUserClubs = useCallback(async () => {
    if (!user) return;
    try {
      const memberships = (await ClubMember.filter({ user_id: user.id, status: 'active' })) || [];
      setUserClubs(memberships);
    } catch (error) {
      console.error("Error fetching user clubs:", error);
      setUserClubs([]);
    }
  }, [user]);

  const fetchClubMembers = useCallback(async (clubId) => {
    if (!clubId || !useClubMessaging) return;
    setLoadingClubMembers(true);
    try {
      const members = await ClubMember.filter({ club_id: clubId, status: 'active' });
      // Filter out current user from the list
      const otherMembers = members.filter(member => member.user_id !== user.id);
      setClubMembers(otherMembers);
    } catch (error) {
      console.error("Error fetching club members:", error);
      setClubMembers([]);
    } finally {
      setLoadingClubMembers(false);
    }
  }, [useClubMessaging, user]);

  const resetForm = useCallback(() => {
    setRecipients([]);
    setSearchTerm('');
    setSuggestions([]);
    setSubject('');
    setBody('');
    setError('');
    setUseClubMessaging(false);
    setSelectedClub('');
    setClubMessagingMode('all');
    setClubMembers([]);
    setSelectedClubMembers([]);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchUserClubs();
    }
  }, [isOpen, fetchUserClubs]);
  
  useEffect(() => {
    if (isOpen) {
      resetForm(); // Always reset first
      if (replyTo) {
        // This is a reply to an existing conversation
        setSubject(replyTo.subject || '');
        if (replyTo.club_name) {
          setUseClubMessaging(true);
          setSelectedClub(replyTo.club_id);
          setClubMessagingMode('all'); // Default to all for replies
        } else {
          setUseClubMessaging(false);
          setRecipients([{ user_id: replyTo.recipient_id, username: replyTo.recipient_username }]);
        }
      } else if (initialClub) {
        // This is a new message, pre-filled for a specific club
        setUseClubMessaging(true);
        setSelectedClub(initialClub.club_id);
        setClubMessagingMode('all');
      }
    }
  }, [isOpen, replyTo, initialClub, resetForm]);

  useEffect(() => {
    if (selectedClub && useClubMessaging && clubMessagingMode === 'select') {
      fetchClubMembers(selectedClub);
    }
  }, [selectedClub, useClubMessaging, clubMessagingMode, fetchClubMembers]);
  
  const debouncedSearch = useCallback(
    debounce(async (term) => {
      if (term.length < 2 || useClubMessaging) {
        setSuggestions([]);
        return;
      }
      try {
        const allMembers = await ClubMember.list();
        const uniqueMembers = Array.from(new Map(allMembers.map(member => [member.user_id, member])).values());
        const filtered = uniqueMembers
          .filter(member => member.username.toLowerCase().includes(term.toLowerCase()) && member.user_id !== user.id)
          .slice(0, 5);
        setSuggestions(filtered);
      } catch (e) {
        console.error("Failed to search for users:", e);
      }
    }, 300), 
    [useClubMessaging, user]
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  const handleAddRecipient = (member) => {
    if (!recipients.find(r => r.user_id === member.user_id)) {
      setRecipients([...recipients, member]);
    }
    setSearchTerm('');
    setSuggestions([]);
  };

  const handleRemoveRecipient = (userId) => {
    setRecipients(recipients.filter(r => r.user_id !== userId));
  };

  const handleToggleClubMember = (member) => {
    setSelectedClubMembers(prev => {
      if (prev.find(m => m.user_id === member.user_id)) {
        return prev.filter(m => m.user_id !== member.user_id);
      } else {
        return [...prev, member];
      }
    });
  };

  const handleSelectAllClubMembers = () => {
    setSelectedClubMembers(clubMembers);
  };

  const handleClearAllClubMembers = () => {
    setSelectedClubMembers([]);
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      setError("Subject is required.");
      return;
    }
    if (!body.trim()) {
      setError("Message body cannot be empty.");
      return;
    }
    
    setIsSending(true);
    setError('');

    try {
      if (useClubMessaging) {
        if (!selectedClub) {
            setError("Please select a club.");
            setIsSending(false);
            return;
        }
        const selectedClubData = userClubs.find(c => c.club_id === selectedClub);
        if (!selectedClubData) {
            setError("Could not find the details for the selected club. Please refresh and try again.");
            setIsSending(false);
            return;
        }

        if (clubMessagingMode === 'all') {
          // Send to all club members
          await sendClubwideMessage({
            club_id: selectedClub,
            club_name: selectedClubData.club_name,
            subject: subject,
            body: body,
            thread_id: replyTo?.thread_id || null
          });
        } else {
          // Send to selected club members
          if (selectedClubMembers.length === 0) {
            setError("Please select at least one club member to message.");
            setIsSending(false);
            return;
          }
          const sendPromises = selectedClubMembers.map(member =>
            sendMessage({
              recipient_id: member.user_id,
              subject: subject,
              body: body,
              thread_id: replyTo?.thread_id || null
            })
          );
          await Promise.all(sendPromises);
        }
      } else {
        if (recipients.length === 0) {
          setError("Please select at least one recipient.");
          setIsSending(false);
          return;
        }
        const sendPromises = recipients.map(recipient =>
          sendMessage({
            recipient_id: recipient.user_id,
            subject: subject,
            body: body,
            thread_id: replyTo?.thread_id || null
          })
        );
        await Promise.all(sendPromises);
      }
      
      onMessageSent();
      onClose();
    } catch (error) {
      console.error("Failed to send messages:", error.response?.data?.error || error.message);
      setError(error.response?.data?.error || "Could not send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };
  
  const isReply = !!replyTo;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col text-white" style={{ backgroundColor: '#5a3217' }}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-white uppercase">
            {isReply ? 'Reply to Message' : 'New Message'}
          </DialogTitle>
          <DialogDescription className="text-bone-color-faded">
            {isReply 
              ? (replyTo.club_name ? `Replying in ${replyTo.club_name}` : `Replying to ${replyTo.recipient_username}`)
              : 'Send a private message to other club members.'
            }
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 flex-grow overflow-y-auto">
          {!isReply && userClubs.length > 0 && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="club-messaging"
                checked={useClubMessaging}
                onCheckedChange={setUseClubMessaging}
                disabled={!!initialClub}
              />
              <Label htmlFor="club-messaging" className="text-bone-color">Message club members</Label>
            </div>
          )}

          {useClubMessaging && userClubs.length > 0 && (
            <>
              <div>
                <Label htmlFor="club-select" className="text-bone-color">Select Club</Label>
                <Select value={selectedClub} onValueChange={setSelectedClub} disabled={isReply || !!initialClub}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Choose a club..." />
                  </SelectTrigger>
                  <SelectContent>
                    {userClubs.map(club => (
                      <SelectItem key={club.club_id} value={club.club_id}>
                        {club.club_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClub && !isReply && (
                <div className="space-y-3">
                  <Label className="text-bone-color">Messaging Options</Label>
                  <RadioGroup value={clubMessagingMode} onValueChange={setClubMessagingMode} className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="all-members" />
                      <Label htmlFor="all-members" className="text-bone-color flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Message All Club Members
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="select" id="select-members" />
                      <Label htmlFor="select-members" className="text-bone-color flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        Select Specific Members
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {clubMessagingMode === 'select' && selectedClub && !isReply && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-bone-color">Select Club Members ({selectedClubMembers.length} selected)</Label>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline" 
                        onClick={handleSelectAllClubMembers}
                        className="text-xs bg-white/10 text-white border-white/20 hover:bg-white/20"
                      >
                        Select All
                      </Button>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline" 
                        onClick={handleClearAllClubMembers}
                        className="text-xs bg-white/10 text-white border-white/20 hover:bg-white/20"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  
                  {loadingClubMembers ? (
                    <div className="text-center py-4 text-bone-color-faded">Loading club members...</div>
                  ) : clubMembers.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto border border-white/20 rounded p-2 space-y-1">
                      {clubMembers.map(member => (
                        <label
                          key={member.user_id}
                          className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                            selectedClubMembers.find(m => m.user_id === member.user_id)
                              ? 'bg-[#007e81]'
                              : 'hover:bg-white/10'
                          }`}
                        >
                          <Checkbox
                            checked={selectedClubMembers.find(m => m.user_id === member.user_id) ? true : false}
                            onCheckedChange={() => handleToggleClubMember(member)}
                          />
                          <span className="text-white flex-grow">{member.username}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-bone-color-faded">No other members in this club.</div>
                  )}
                </div>
              )}
            </>
          )}

          {!isReply && !useClubMessaging && (
            <div className="relative">
              <Label htmlFor="recipient" className="text-bone-color">Add Recipients</Label>
              <Input
                id="recipient"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Start typing a username..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                autoComplete="off"
              />
              {suggestions.length > 0 && (
                <ul className="absolute z-10 w-full bg-[#9fd3ba] border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto">
                  {suggestions.map(member => (
                    <li key={member.user_id} onClick={() => handleAddRecipient(member)} className="p-2 cursor-pointer hover:bg-white/20 main-text">
                      {member.username}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {!useClubMessaging && recipients.length > 0 && (
            <div>
              <Label className="text-bone-color">Recipients ({recipients.length})</Label>
              <div className="flex flex-wrap gap-2 mt-2 p-2 bg-black/20 rounded-md">
                {recipients.map(recipient => (
                  <div key={recipient.user_id} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1">
                    <span className="text-white text-sm">{recipient.username}</span>
                    {!isReply && (
                      <button type="button" onClick={() => handleRemoveRecipient(recipient.user_id)} className="text-white/70 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="subject" className="text-bone-color">Subject</Label>
            <Input 
              id="subject" 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)} 
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50" 
              placeholder="Message subject" 
              disabled={isReply && replyTo.subject?.startsWith('Re:')}
            />
          </div>
          <div>
            <Label htmlFor="body" className="text-bone-color">Message</Label>
            <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/50" rows={5} placeholder="Type your message here..." />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="text-bone-color border-bone-color hover:bg-white/10">Cancel</Button>
          <Button 
            onClick={handleSend} 
            disabled={isSending || (useClubMessaging ? !selectedClub || (clubMessagingMode === 'select' && selectedClubMembers.length === 0) : recipients.length === 0)} 
            style={{ backgroundColor: '#f26222', color: 'white' }}
          >
            {isSending 
              ? 'Sending...' 
              : useClubMessaging 
                ? (clubMessagingMode === 'all' 
                    ? 'Send to All Club Members'
                    : `Send to ${selectedClubMembers.length} Member${selectedClubMembers.length !== 1 ? 's' : ''}`)
                : `Send to ${recipients.length} Recipient${recipients.length !== 1 ? 's' : ''}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}