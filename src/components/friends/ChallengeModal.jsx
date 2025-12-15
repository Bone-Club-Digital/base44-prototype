
import React, { useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GameSession } from "@/entities/GameSession";
import { Message } from "@/entities/Message";
import { User } from "@/entities/User";
import { Gamepad2, Star, Clock, Video } from "lucide-react";
import { createDailyRoom } from '@/functions/createDailyRoom';
// cleanupStuckChallenges is dynamically imported as per outline, so no top-level import here.

export default function ChallengeModal({ isOpen, onClose, friend, user, onChallengeSent }) {
  const [targetScore, setTargetScore] = useState("3");
  const [useClock, setUseClock] = useState(false);
  const [useVideoChat, setUseVideoChat] = useState(false);
  const [bonesStake, setBonesStake] = useState("0");
  const [isRated, setIsRated] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);
  const isFreeUser = user?.plan?.name === 'FREE';

  const STARTING_POSITION = {
    24: { color: 'teal', count: 2 }, 13: { color: 'teal', count: 5 }, 8: { color: 'teal', count: 3 }, 6: { color: 'teal', count: 5 },
    1: { color: 'bone', count: 2 }, 12: { color: 'bone', count: 5 }, 17: { color: 'bone', count: 3 }, 19: { color: 'bone', count: 5 }
  };

  const resetForm = () => {
    setTargetScore("3");
    setUseClock(false);
    setUseVideoChat(false);
    setBonesStake("0");
    setIsRated(true);
    setIsSubmitting(false);
    setError('');
    setSuccessMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSendChallenge = async () => {
    if (isSubmitting) return; // Prevent multiple submissions

    if (!friend || !user) {
      setError('Missing player information');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccessMessage(null);

    const bonesToStake = parseInt(bonesStake);

    // Pre-check for bones balance
    if (bonesToStake > 0 && bonesToStake > (user.bones_balance || 0)) {
      setError(`You don't have enough bones. You have ${user.bones_balance || 0} bones.`);
      setIsSubmitting(false);
      return;
    }
    
    try {
      // First cleanup any stuck challenges
      try {
        const { cleanupStuckChallenges } = await import('@/functions/cleanupStuckChallenges');
        await cleanupStuckChallenges();
      } catch (cleanupError) {
        console.warn('Could not cleanup stuck challenges:', cleanupError);
        // Continue anyway, as this is not critical
      }

      let videoRoomUrl = null;
      if (useVideoChat) {
        console.log('Creating video chat room for challenge...');
        try {
          const { data: roomData, error: roomError } = await createDailyRoom();
          if (roomError || !roomData?.url) {
            console.error('Error creating video room:', roomError);
            setError('Failed to create video chat room. Please try without video chat.');
            setIsSubmitting(false);
            return;
          }
          videoRoomUrl = roomData.url;
          console.log('Video room created for challenge:', videoRoomUrl);
        } catch (roomErr) {
          console.error('Exception creating video room:', roomErr);
          setError('Failed to create video chat room. Please try without video chat.');
          setIsSubmitting(false);
          return;
        }
      }

      const minutesPerPoint = 2; // Fixed default
      const graceSeconds = 12; // Fixed default
      const initialTimeSeconds = useClock ? parseInt(targetScore) * minutesPerPoint * 60 : 0;
      const incrementSeconds = useClock ? graceSeconds : 0;

      const matchState = {
        target_score: parseInt(targetScore),
        use_clock: useClock,
        use_video_chat: useVideoChat,
        video_chat_url: videoRoomUrl,
        initial_time_seconds: initialTimeSeconds,
        increment_seconds: incrementSeconds,
        player_teal_score: 0,
        player_bone_score: 0,
        isCrawfordGame: false, 
        player_teal_ready: false,
        player_bone_ready: false,
        is_rated: isRated,
        player_teal_time_remaining: initialTimeSeconds, 
        player_bone_time_remaining: initialTimeSeconds, 
        player_teal_username: user.username,
        player_bone_username: friend.friend_username,
      };

      // Deduct bones if there's a stake
      if (bonesToStake > 0) {
        await User.updateMyUserData({
          bones_balance: user.bones_balance - bonesToStake,
        });
        // Note: The 'user' prop itself might not update immediately if it's
        // from a context. A refresh might be needed for the UI to reflect this.
      }

      // Create the game session
      const gamePayload = {
        player_teal_id: user.id,
        player_bone_id: friend.friend_id,
        status: 'waiting_for_start',
        bones_stake: bonesToStake,
        is_from_scheduled_match: false, // New field added as per outline
        game_state: {
          board: STARTING_POSITION,
          dice: [0, 0],
          turn: null, // Turn is decided by initial roll
          last_roll: null,
          moves: [],
          winner: null,
          bornOff: { teal: 0, bone: 0 }, // CORRECTED: was checkers_off, now bornOff
          doubling_cube: {
              value: 1,
              owner: null,
              position: 'center',
          },
        },
        match_state: matchState
      };

      console.log("[components/friends/ChallengeModal.js] Creating challenge with game payload:", gamePayload);
      const newGame = await GameSession.create(gamePayload);

      // Send notification to the challenged friend
      await Message.create({
        sender_id: user.id,
        sender_username: user.username,
        recipient_id: friend.friend_id,
        recipient_username: friend.friend_username,
        type: 'notification',
        subject: `Game Challenge from ${user.username}`,
        body: `${user.username} has challenged you to a ${targetScore}-point match.`,
        status: 'unread',
        related_entity_id: newGame.id,
        related_entity_type: 'GameSession'
      });

      setSuccessMessage(`Your challenge has been sent to ${friend.friend_username}.`);
      setIsSubmitting(false);

      if (onChallengeSent) {
        onChallengeSent(friend.friend_username);
      }
      // Delay closing the modal slightly to allow success message to be seen
      setTimeout(() => {
        onClose();
      }, 2000);


    } catch (error) {
      console.error('[components/friends/ChallengeModal.js] Error sending challenge:', error);
      
      // Refund bones if game creation failed and bones were deducted
      if (bonesToStake > 0) {
        try {
          await User.updateMyUserData({
            bones_balance: user.bones_balance + bonesToStake, // Add back the staked bones
          });
        } catch (refundError) {
          console.error('Failed to refund bones:', refundError);
        }
      }
      
      setError(`Failed to send challenge: ${error.message || 'Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!friend) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] text-white" style={{ backgroundColor: '#5a3217' }}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-white uppercase flex items-center gap-3">
            <Gamepad2 className="w-6 h-6" />
            Challenge Friend
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Friend Info */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-white/10">
            <Avatar className="w-12 h-12">
              <AvatarImage src={friend.profile_picture_url} alt={friend.friend_username} className="object-cover" />
              <AvatarFallback style={{ backgroundColor: '#e5e4cd', color: '#5a3217' }}>
                {friend.friend_username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-bold text-white text-lg">{friend.friend_username}</p>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-bone-color-faded">{friend.rating}</span>
                {friend.available && (
                  <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">Available</span>
                )}
              </div>
            </div>
          </div>

          {/* Game Settings */}
          <div className="space-y-4">
            {error && (
                <div className="p-3 bg-red-500/20 text-red-300 border border-red-500/30 rounded-md text-sm text-center">
                    {error}
                </div>
            )}
            {successMessage && ( 
                <div className="p-3 bg-green-500/20 text-green-300 border border-green-500/30 rounded-md text-sm text-center">
                    {successMessage}
                </div>
            )}
            <div>
              <Label className="text-bone-color mb-2 block">Match Length</Label>
              <Select value={targetScore} onValueChange={setTargetScore}>
                <SelectTrigger className="bg-[#e5e4cd] text-[#5a3217] border-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21].map(score => (
                    <SelectItem key={score} value={String(score)}>{score} points</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-bone-color mb-2 block">Bones Stake</Label>
              <Select value={bonesStake} onValueChange={setBonesStake}>
                <SelectTrigger className="bg-[#e5e4cd] text-[#5a3217] border-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 5, 10, 25, 50, 100].map(stake => (
                    <SelectItem 
                      key={stake} 
                      value={String(stake)} 
                      disabled={(user?.bones_balance ?? 0) < stake}
                    >
                      {stake === 0 ? "No Stakes" : `${stake} Bones`} 
                      {(user?.bones_balance ?? 0) < stake && " (Not enough)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-bone-color-faded" />
                <Label className="text-bone-color">Use Clock</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={useClock}
                  onCheckedChange={setUseClock}
                  disabled={isSubmitting || successMessage}
                />
                {useClock && (
                  <span className="text-xs text-bone-color-faded">2 min/point + 12s</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-bone-color-faded" />
                <Label className="text-bone-color">Video Chat</Label>
              </div>
              <Switch
                checked={useVideoChat}
                onCheckedChange={setUseVideoChat}
                disabled={isSubmitting || successMessage}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="is-rated" className="text-bone-color">
                Rated Match
              </Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="is-rated"
                  checked={isRated}
                  onCheckedChange={setIsRated}
                  disabled={isSubmitting || successMessage}
                />
                <span className="text-sm text-bone-color-faded">
                  {isRated ? 'Affects ratings' : 'Casual play'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={isSubmitting || successMessage} 
            className="text-bone-color border-bone-color hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSendChallenge}
            disabled={isSubmitting || !friend || successMessage} 
            style={{ backgroundColor: '#007e81', color: 'white' }}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Sending...
              </>
            ) : (
              <>
                <Gamepad2 className="w-4 h-4" />
                Send Challenge
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
