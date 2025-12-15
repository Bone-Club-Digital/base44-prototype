import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Video, Star, Mail } from "lucide-react";
import { ScheduledMatch } from "@/entities/ScheduledMatch";
import { Message } from "@/entities/Message";
import { sendScheduledMatchEmail } from '@/functions/sendScheduledMatchEmail';

export default function ArrangeMatchModal({ isOpen, onClose, friend, friends, user, onMatchArranged }) {
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [selectedFriendData, setSelectedFriendData] = useState(null);
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('19:00');
  const [targetScore, setTargetScore] = useState("3");
  const [useClock, setUseClock] = useState(false);
  const [useVideoChat, setUseVideoChat] = useState(false);
  const [bonesStake, setBonesStake] = useState("0");
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRated, setIsRated] = useState(true); // NEW STATE for rated match

  const isFreeUser = user?.plan?.name === 'FREE';
  const userBones = user?.bones_balance || 0;

  useEffect(() => {
    if (friend) {
      setSelectedOpponent(friend.friend_id);
      setSelectedFriendData(friend);
    } else {
      setSelectedOpponent('');
      setSelectedFriendData(null);
    }
    // Set default date to today if not already set or if opening for the first time
    if (!proposedDate && isOpen) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      setProposedDate(`${year}-${month}-${day}`);
    }
  }, [friend, isOpen, proposedDate]);

  useEffect(() => {
    if (selectedOpponent && friends) {
      const friendData = friends.find(f => f.friend_id === selectedOpponent);
      setSelectedFriendData(friendData);
    } else {
      setSelectedFriendData(null);
    }
  }, [selectedOpponent, friends]);

  const resetForm = () => {
    if (!friend) {
      setSelectedOpponent('');
      setSelectedFriendData(null);
    }
    setProposedDate('');
    setProposedTime('19:00');
    setTargetScore("3");
    setUseClock(false);
    setUseVideoChat(false);
    setBonesStake("0");
    setCustomMessage('');
    setIsLoading(false);
    setError('');
    setIsRated(true); // Reset isRated to true
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleArrangeMatch = async () => {
    if (!selectedOpponent || !proposedDate || !proposedTime) {
      setError('Please select an opponent and propose a date and time.');
      return;
    }

    if (parseInt(bonesStake) > userBones) {
      setError(`You do not have enough bones. You have ${userBones} bones, but are trying to stake ${bonesStake}.`);
      return;
    }

    setIsLoading(true);
    setError('');

    const selectedFriendDetails = friends.find(f => f.friend_id === selectedOpponent);
    if (!selectedFriendDetails) {
        setError('Could not find selected friend details.');
        setIsLoading(false);
        return;
    }

    try {
      const proposedDateTime = new Date(`${proposedDate}T${proposedTime}`);

      const matchDetails = {
        target_score: parseInt(targetScore),
        use_clock: useClock,
        use_video_chat: useVideoChat,
        initial_time_seconds: useClock ? parseInt(targetScore) * 2 * 60 : 0, // 2 minutes per point
        increment_seconds: useClock ? 12 : 0, // 12 seconds increment
        is_rated: isRated // Include new isRated field
      };
      
      // Step 1: Create the ScheduledMatch entity
      const payload = {
        organizer_id: user.id,
        organizer_username: user.username,
        opponent_id: selectedFriendDetails.friend_id,
        opponent_username: selectedFriendDetails.friend_username,
        proposed_datetime: proposedDateTime.toISOString(),
        status: 'pending',
        match_details: JSON.stringify(matchDetails),
        bones_stake: parseInt(bonesStake),
        custom_message: customMessage.trim() || null
      };

      const scheduledMatch = await ScheduledMatch.create(payload);

      // Step 2: Create a notification message for the invitee
      await Message.create({
        sender_id: user.id,
        sender_username: user.username,
        recipient_id: selectedFriendDetails.friend_id,
        recipient_username: selectedFriendDetails.friend_username,
        type: 'notification',
        subject: `Backgammon match invitation from ${user.username}`,
        body: `${user.username} has challenged you to a backgammon match on ${proposedDateTime.toLocaleDateString()} at ${proposedDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        status: 'unread',
        related_entity_id: scheduledMatch.id,
        related_entity_type: 'ScheduledMatch'
      });

      // Step 3: (Optional) Send an email notification
      await sendScheduledMatchEmail({
        organizer_email: user.email,
        organizer_name: user.username,
        opponent_id: selectedFriendDetails.friend_id,
        opponent_name: selectedFriendDetails.friend_username,
        proposed_datetime: proposedDateTime.toISOString(),
        match_details: JSON.stringify(matchDetails),
        custom_message: customMessage,
        bones_stake: parseInt(bonesStake)
      });

      // Store success message in localStorage for My Games page, including action button details
      const successMessage = `Your match invitation has been sent to ${selectedFriendDetails.friend_username}. Waiting for them to accept.`;
      localStorage.setItem('scheduledMatchSuccess', JSON.stringify({
        message: successMessage,
        timestamp: Date.now(),
        buttonText: "Go to My Games", // Added for action button
        buttonLink: "/my-games"      // Added for action button
      }));

      if (onMatchArranged) {
        onMatchArranged(selectedFriendDetails.friend_username);
      }
      handleClose();

    } catch (err) {
      console.error("Failed to arrange match:", err);
      setError(`Failed to arrange match: ${err.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] text-white" style={{ backgroundColor: '#5a3217' }}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-white uppercase flex items-center gap-3">
            <Calendar className="w-6 h-6" />
            Arrange Match
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="friend-select" className="text-right text-bone-color">Challenge</Label>
            <Select
              value={selectedOpponent}
              onValueChange={setSelectedOpponent}
              disabled={!!friend}
            >
              <SelectTrigger id="friend-select" className="col-span-3 bg-[#e5e4cd] text-[#5a3217] border-transparent focus:ring-[#5a3217]">
                <SelectValue placeholder="Select a friend..." />
              </SelectTrigger>
              <SelectContent>
                {friends.map(f => (
                  <SelectItem key={f.friend_id} value={f.friend_id}>{f.friend_username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedFriendData && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10 col-span-full">
              <Avatar className="w-10 h-10">
                <AvatarImage src={selectedFriendData.profile_picture_url} />
                <AvatarFallback>{selectedFriendData.friend_username.substring(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-bone-color">{selectedFriendData.friend_username}</p>
                <p className="text-xs text-bone-color-faded flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{selectedFriendData.rating}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right text-bone-color">Date</Label>
            <Input id="date" type="date" value={proposedDate} onChange={e => setProposedDate(e.target.value)} className="col-span-3 bg-[#e5e4cd] text-[#5a3217] border-transparent" />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="time" className="text-right text-bone-color">Time</Label>
            <Input id="time" type="time" value={proposedTime} onChange={e => setProposedTime(e.target.value)} className="col-span-3 bg-[#e5e4cd] text-[#5a3217] border-transparent" />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="match-length" className="text-right text-bone-color">Match To</Label>
            <Select value={targetScore} onValueChange={setTargetScore}>
                <SelectTrigger id="match-length" className="col-span-3 bg-[#e5e4cd] text-[#5a3217] border-transparent"><SelectValue /></SelectTrigger>
                <SelectContent>{[1,3,5,7,9,11,13,15,17,19,21,25].map(s=><SelectItem key={s} value={String(s)}>{s} points</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bones-stake" className="text-right text-bone-color">Bones Stake</Label>
            <Select value={bonesStake} onValueChange={setBonesStake}>
                <SelectTrigger id="bones-stake" className="col-span-3 bg-[#e5e4cd] text-[#5a3217] border-transparent"><SelectValue /></SelectTrigger>
                <SelectContent>{[0,5,10,25,50,100].map(s=><SelectItem key={s} value={String(s)}>{s === 0 ? "No Stakes" : `${s} Bones`}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="use-clock" className="text-right text-bone-color">Use Clock</Label>
            <div className="col-span-3 flex items-center gap-2">
              <Switch id="use-clock" checked={useClock} onCheckedChange={setUseClock} />
              <Clock className="w-4 h-4 text-bone-color-faded"/>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="use-video-chat" className="text-right text-bone-color">Video</Label>
            <div className="col-span-3 flex items-center gap-2">
              <Switch
                id="use-video-chat"
                checked={useVideoChat}
                onCheckedChange={setUseVideoChat}
              />
              <Video className="w-4 h-4 text-bone-color-faded" />
               {isFreeUser && (
                <span className="text-xs text-amber-300 flex items-center gap-1">
                  (Opponent must have Member/VIP plan to start)
                </span>
              )}
            </div>
          </div>
          
          {/* NEW: Rated Match Toggle */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="is-rated" className="text-right text-bone-color">
              Rated Match
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Switch
                id="is-rated"
                checked={isRated}
                onCheckedChange={setIsRated}
                disabled={isLoading}
              />
              <span className="text-sm text-bone-color opacity-70">
                {isRated ? 'Affects ratings' : 'Casual play'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="custom-message" className="text-right text-bone-color">Message</Label>
            <Textarea
              id="custom-message"
              placeholder="Add a personal message..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="col-span-3 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          </div>

          {error && <p className="text-red-400 text-sm col-span-full text-center">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleArrangeMatch} disabled={isLoading} style={{ backgroundColor: '#f26222', color: 'white' }}>
            <Mail className="w-4 h-4 mr-2" />
            {isLoading ? 'Arranging...' : 'Arrange Match'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}