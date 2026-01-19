import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video } from "lucide-react";

import { createDailyRoom } from '@/functions/createDailyRoom'; 

export default function CreateGameModal({ isOpen, onClose, onCreate, user, refetchUser }) {
  const [targetScore, setTargetScore] = useState("3");
  const [useClock, setUseClock] = useState(false);
  const [useVideoChat, setUseVideoChat] = useState(false);
  const [bonesStake, setBonesStake] = useState("0");
  const [isRated, setIsRated] = useState(true); // NEW STATE for rated match
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false); // State to manage loading during match creation

  const isFreeUser = user?.plan?.name === 'FREE';
  const userBones = user?.bones_balance || 0;

  const handleCreateClick = async () => {
    setIsLoading(true); // Set loading state to true when creation process starts
    setError(""); // Clear any previous errors

    try {
      const stake = parseInt(bonesStake);
      if (userBones < stake) {
        setError(`You don't have enough bones. You have ${userBones} bones.`);
        setIsLoading(false); // Set loading to false before returning
        return; // Stop execution if user doesn't have enough bones
      }

      let videoRoomUrl = null;
      // Create video chat room if enabled
      if (useVideoChat) {
        console.log('Creating video chat room...');
        try {
          const { data: roomData, error: roomError } = await createDailyRoom();
          if (roomError || !roomData?.url) {
            console.warn('Error creating video room:', roomError);
            // Don't block match creation, just disable video chat
            setUseVideoChat(false);
            videoRoomUrl = null;
          } else {
            videoRoomUrl = roomData.url;
            console.log('Video room created:', videoRoomUrl);
          }
        } catch (roomErr) {
          console.warn('Exception creating video room:', roomErr);
          // Don't block match creation, just disable video chat
          setUseVideoChat(false);
          videoRoomUrl = null;
        }
      }

      // Fixed defaults: 2 minutes per point, 12 seconds grace period
      const minutesPerPoint = 2;
      const graceSeconds = 12;
      // Calculate initial time based on target score and whether clock is used
      const totalInitialTime = useClock ? parseInt(targetScore) * minutesPerPoint * 60 : 0;
      
      const settings = {
        target_score: parseInt(targetScore), // Use consistent field name
        use_clock: useClock,
        use_video_chat: useVideoChat,
        video_chat_url: videoRoomUrl, // Pass the created video room URL
        initial_time_seconds: totalInitialTime,
        increment_seconds: useClock ? graceSeconds : 0, // Increment only if clock is used
        player_teal_time_remaining: totalInitialTime,
        player_bone_time_remaining: totalInitialTime,
        bones_stake: stake,
        is_rated: isRated, // ADD rated setting
      };

      console.log('Creating game with settings:', settings);
      onCreate(settings); // Call the onCreate prop with the compiled settings
    } catch (err) {
      console.error("An unexpected error occurred during match creation setup:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false); // Always set loading state to false when process finishes
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] text-white" style={{ backgroundColor: '#5a3217' }}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-white uppercase">Create New Match</DialogTitle>
          <DialogDescription className="text-bone-color-faded">
            Configure the settings for your new multiplayer match.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="match-length" className="text-right text-bone-color">
              Match To
            </Label>
            <Select value={targetScore} onValueChange={setTargetScore}>
                <SelectTrigger id="match-length" className="col-span-3 bg-[#e5e4cd] text-[#5a3217] border-transparent focus:ring-[#5a3217]">
                    <SelectValue placeholder="Select length" />
                </SelectTrigger>
                <SelectContent>
                    {[1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25].map(score => (
                        <SelectItem key={score} value={String(score)}>{score} points</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bones-stake" className="text-right text-bone-color">
              Bones Stake
            </Label>
            <Select value={bonesStake} onValueChange={setBonesStake}>
                <SelectTrigger id="bones-stake" className="col-span-3 bg-[#e5e4cd] text-[#5a3217] border-transparent focus:ring-[#5a3217]">
                    <SelectValue placeholder="Select stake" />
                </SelectTrigger>
                <SelectContent>
                    {[0, 5, 10, 25, 50, 100].map(stake => (
                        <SelectItem 
                            key={stake} 
                            value={String(stake)} 
                            disabled={userBones !== undefined && userBones < stake}
                        >
                            {stake === 0 ? "No Stakes" : `${stake} Bones`} {userBones !== undefined && userBones < stake && "(Not enough)"}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="use-clock" className="text-right text-bone-color">
              Use Clock
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Switch
                id="use-clock"
                checked={useClock}
                onCheckedChange={setUseClock}
              />
              {useClock && (
                <span className="text-sm text-bone-color-faded">
                  2 min/point + 12s grace
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="use-video-chat" className="text-right text-bone-color">
              Video
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Switch
                id="use-video-chat"
                checked={useVideoChat}
                onCheckedChange={setUseVideoChat}
                disabled={isFreeUser || isLoading} // Disable switch while loading
              />
              <Video className="w-4 h-4 text-bone-color-faded" />
              {isFreeUser && (
                <span className="text-xs text-amber-300 flex items-center gap-1">
                  Members/VIP only
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
              <span className="text-sm text-bone-color-faded">
                {isRated ? 'Affects ratings' : 'Casual play'}
              </span>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm col-span-4 text-center">{error}</p>}
        </div>
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose} 
            disabled={isLoading} // Disable cancel button while loading
            className="text-bone-color border-bone-color hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateClick} 
            style={{ backgroundColor: '#f26222', color: 'white' }} 
            disabled={isLoading} // Disable create button while loading
          >
            {isLoading ? 'Creating...' : 'Create Match'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}