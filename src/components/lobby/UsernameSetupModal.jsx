
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "@/entities/User";
import { PlayerStats } from "@/entities/PlayerStats";
import { ProfileAvatar } from "@/entities/ProfileAvatar";
import { UploadFile } from "@/integrations/Core";
import { Upload, Image as ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";

export default function UsernameSetupModal({ isOpen, onComplete }) {
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [profileOption, setProfileOption] = useState('avatar'); // Start with avatar option selected
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [avatars, setAvatars] = useState([]);
  const [avatarsLoading, setAvatarsLoading] = useState(false);
  const [openToInvites, setOpenToInvites] = useState(true);
  const [publicProfile, setPublicProfile] = useState(false); // New state for public profile
  const [allowFriendRequests, setAllowFriendRequests] = useState(true); // New state for friend requests

  // Fetch available avatars when component mounts and set random default
  useEffect(() => {
    const fetchAvatars = async () => {
      setAvatarsLoading(true);
      try {
        const avatarsResult = await ProfileAvatar.filter({ is_active: true });
        const sortedAvatars = avatarsResult.sort((a, b) => a.sort_order - b.sort_order);
        setAvatars(sortedAvatars);
        
        // Set a random avatar as default
        if (sortedAvatars.length > 0) {
          const randomIndex = Math.floor(Math.random() * sortedAvatars.length);
          setSelectedAvatarUrl(sortedAvatars[randomIndex].file_url);
        }
      } catch (error) {
        console.error("Failed to fetch avatars:", error);
      } finally {
        setAvatarsLoading(false);
      }
    };
    fetchAvatars();
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return;
    }

    setIsUploading(true);
    setError('');
    
    try {
      const { file_url } = await UploadFile({ file });
      setUploadedImageUrl(file_url);
      setProfileOption('upload');
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim() || username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError('Username must be 3-20 characters and contain only letters, numbers, hyphens, or underscores.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    const trimmedUsername = username.trim();
    
    // Determine the profile picture URL based on selection
    let profilePictureUrl = null;
    if (profileOption === 'avatar' && selectedAvatarUrl) {
      profilePictureUrl = selectedAvatarUrl;
    } else if (profileOption === 'upload' && uploadedImageUrl) {
      profilePictureUrl = uploadedImageUrl;
    }

    try {
      // Get the current user to ensure we have the ID for explicit payload
      const currentUser = await User.me();
      if (!currentUser) {
        throw new Error("Could not identify current user. Please log in again.");
      }

      // Step 1: Update the private User entity with username, balance, and profile picture
      await User.updateMyUserData({
        username: trimmedUsername,
        bones_balance: 100,
        profile_picture_url: profilePictureUrl,
        open_to_club_invites: openToInvites,
        public_profile: publicProfile,
        allow_friend_requests: allowFriendRequests // Added allow_friend_requests
      });
      
      // Step 2: Create the public PlayerStats record with public stats
      const playerStatsPayload = {
          user_id: currentUser.id, 
          username: trimmedUsername,
          rating: 1500,
          games_played: 0,
          games_won: 0,
          last_active: new Date().toISOString(),
          profile_picture_url: profilePictureUrl,
          public_profile: publicProfile,
          allow_friend_requests: allowFriendRequests // Added allow_friend_requests
      };
      
      await PlayerStats.create(playerStatsPayload);

      onComplete(trimmedUsername);
    } catch (error) {
      console.error('Error during user setup:', error);
      const errorMessage = error.response?.data?.error || error.message;
      if (errorMessage.includes('duplicate key value')) {
        setError('This username is already taken. Please choose another one.');
      } else {
        setError(`Failed to set up user: ${errorMessage}. Please check console for details.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUserInitials = () => {
    if (username.length >= 2) {
      return username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getCurrentProfileUrl = () => {
    if (profileOption === 'avatar' && selectedAvatarUrl) return selectedAvatarUrl;
    if (profileOption === 'upload' && uploadedImageUrl) return uploadedImageUrl;
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px] text-white max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#5a3217' }}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-white uppercase">Profile</DialogTitle>
          <DialogDescription className="text-bone-color-faded">
            Pick a unique username and profile picture that will represent you in games and on the leaderboard.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Input */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-bone-color">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              disabled={isSubmitting}
            />
            <p className="text-xs text-bone-color-faded">
              3-20 characters. Letters, numbers, hyphens, and underscores only.
            </p>
          </div>

          {/* Profile Picture Section */}
          <div className="space-y-4">
            <Label className="text-bone-color">Profile Picture</Label>
            
            {/* Current Selection Preview */}
            <div className="flex items-center gap-4 p-4 bg-white/10 rounded-lg">
              <Avatar className="w-16 h-16">
                <AvatarImage 
                  src={getCurrentProfileUrl()} 
                  alt="Profile preview"
                  className="object-cover"
                />
                <AvatarFallback 
                  className="text-lg font-bold"
                  style={{ backgroundColor: '#5a3217', color: '#e5e4cd' }}
                >
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-bone-color font-medium">
                  {profileOption === 'avatar' && 'Selected Avatar'}
                  {profileOption === 'upload' && 'Custom Upload'}
                </p>
                <p className="text-xs text-bone-color-faded">
                  This is how you'll appear to other players
                </p>
              </div>
            </div>

            {/* Profile Picture Options */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProfileOption('avatar')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  profileOption === 'avatar' 
                    ? 'border-bone-color bg-white/20' 
                    : 'border-white/20 hover:border-white/40'
                }`}
                style={profileOption === 'avatar' ? { backgroundColor: '#007e81' } : {}}
              >
                <ImageIcon className="w-6 h-6 mx-auto mb-2 text-bone-color" />
                <span className="text-xs text-bone-color">Choose Avatar</span>
              </button>

              <div className="relative">
                <input
                  type="file"
                  id="profile-upload"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading || isSubmitting}
                />
                <label
                  htmlFor="profile-upload"
                  className={`block p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                    profileOption === 'upload' 
                      ? 'border-bone-color bg-white/20' 
                      : 'border-white/20 hover:border-white/40'
                  }`}
                  style={profileOption === 'upload' ? { backgroundColor: '#007e81' } : {}}
                >
                  {isUploading ? (
                    <div className="w-6 h-6 mx-auto mb-2 border-2 border-bone-color border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Upload className="w-6 h-6 mx-auto mb-2 text-bone-color" />
                  )}
                  <span className="text-xs text-bone-color">Or Upload Image</span>
                </label>
              </div>
            </div>

            {/* Avatar Selection Grid */}
            {profileOption === 'avatar' && (
              <div className="space-y-3">
                <p className="text-sm text-bone-color">Choose from available avatars:</p>
                {avatarsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-bone-color border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-6 gap-3 max-h-48 overflow-y-auto p-2">
                    {avatars.map(avatar => (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => setSelectedAvatarUrl(avatar.file_url)}
                        className={`aspect-square rounded-full overflow-hidden border-3 transition-all ${
                          selectedAvatarUrl === avatar.file_url 
                            ? 'border-bone-color ring-2 ring-bone-color' 
                            : 'border-transparent hover:border-white/40'
                        }`}
                      >
                        <img src={avatar.file_url} alt={avatar.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Open to Invites Checkbox */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="open-to-invites"
              checked={openToInvites}
              onCheckedChange={setOpenToInvites}
              className="data-[state=checked]:bg-[#007e81]"
            />
            <label
              htmlFor="open-to-invites"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-bone-color"
            >
              Open to Club invitations
            </label>
          </div>

          {/* Public Profile Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="public-profile"
              checked={publicProfile}
              onCheckedChange={setPublicProfile}
              className="data-[state=checked]:bg-[#007e81]"
            />
            <label
              htmlFor="public-profile"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-bone-color"
            >
              Make my profile publicly viewable
            </label>
          </div>

          {/* Allow Friend Requests Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="allow-friend-requests"
              checked={allowFriendRequests}
              onCheckedChange={setAllowFriendRequests}
              className="data-[state=checked]:bg-[#007e81]"
            />
            <label
              htmlFor="allow-friend-requests"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-bone-color"
            >
              Allow others to send me friend requests
            </label>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
          
          <Button 
            type="submit" 
            disabled={isSubmitting || isUploading}
            className="w-full"
            style={{ backgroundColor: '#f26222', color: 'white' }}
          >
            {isSubmitting ? 'Setting Up Profile...' : 'Complete Setup'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
