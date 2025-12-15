
import React, { useState, useEffect } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Save, X, User as UserIcon, Mail, Trophy, Star, Image as ImageIcon, UploadCloud, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { UploadFile } from '@/integrations/Core';
import ImageCropModal from '../components/profile/ImageCropModal';
import { PlayerStats } from '@/entities/PlayerStats';
import { ProfileAvatar } from '@/entities/ProfileAvatar';
import { format } from 'date-fns';
import DeleteAccountModal from '../components/profile/DeleteAccountModal';

export default function ProfilePage() {
  const { user, plan, loading, refetchUser } = useUser();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    profile_picture_url: '',
    open_to_club_invites: true,
    public_profile: false,
    allow_friend_requests: true,
  });

  // New state for delete modal
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

  // New state for avatar selection
  const [selectionMode, setSelectionMode] = useState('upload'); // 'upload' or 'select'
  const [avatars, setAvatars] = useState([]);
  const [avatarCategories, setAvatarCategories] = useState([]);
  const [avatarsLoading, setAvatarsLoading] = useState(false);


  useEffect(() => {
    if (!loading && !user) {
      navigate(createPageUrl('Home'));
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      // Parse full name into first and last name
      const nameParts = (user.full_name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        username: user.username || '',
        first_name: firstName,
        last_name: lastName,
        profile_picture_url: user.profile_picture_url || '',
        open_to_club_invites: user.open_to_club_invites !== false, // Defaults to true if undefined or explicitly false
        public_profile: user.public_profile || false,
        allow_friend_requests: user.allow_friend_requests !== false,
      });
    }
  }, [user]);

  // Fetch avatars when editing starts
  useEffect(() => {
    if (isEditing) {
      const fetchAvatars = async () => {
        setAvatarsLoading(true);
        try {
          const avatarsResult = await ProfileAvatar.filter({ is_active: true });
          const sortedAvatars = avatarsResult.sort((a, b) => a.sort_order - b.sort_order);
          setAvatars(sortedAvatars);
          
          const categories = [...new Set(sortedAvatars.map(a => a.category).filter(Boolean))];
          setAvatarCategories(categories);

        } catch (error) {
          console.error("Failed to fetch avatars:", error);
          alert("Could not load available avatars.");
        } finally {
          setAvatarsLoading(false);
        }
      };
      fetchAvatars();
    }
  }, [isEditing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Combine first and last name back into full_name
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim();
      
      const updateData = {
        full_name: fullName || null,
        username: formData.username.trim() || null,
        profile_picture_url: formData.profile_picture_url || null,
        open_to_club_invites: formData.open_to_club_invites,
        public_profile: formData.public_profile,
        allow_friend_requests: formData.allow_friend_requests,
      };

      // Note: Email typically can't be changed in most auth systems
      // We'll include it but it might be ignored by the backend
      if (formData.email !== user.email) {
        updateData.email = formData.email;
      }

      // 1. Update the private User entity
      await User.updateMyUserData(updateData);

      // 2. Update the public PlayerStats entity to keep it in sync
      const stats = await PlayerStats.filter({ user_id: user.id });
      if (stats && stats.length > 0) {
        const playerStatsId = stats[0].id;
        await PlayerStats.update(playerStatsId, { 
          profile_picture_url: updateData.profile_picture_url,
          username: updateData.username, // Also keep username in sync
          public_profile: updateData.public_profile,
          allow_friend_requests: updateData.allow_friend_requests
        });
      }

      await refetchUser();
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original user data
    if (user) {
      const nameParts = (user.full_name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        username: user.username || '',
        first_name: firstName,
        last_name: lastName,
        profile_picture_url: user.profile_picture_url || '',
        open_to_club_invites: user.open_to_club_invites !== false,
        public_profile: user.public_profile || false,
        allow_friend_requests: user.allow_friend_requests !== false,
      });
    }
    setIsEditing(false);
    setSelectionMode('upload'); // Reset selection mode
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB.');
      return;
    }

    // Create temporary URL for cropping
    const tempUrl = URL.createObjectURL(file);
    setTempImageUrl(tempUrl);
    setShowCropModal(true);
  };

  const handleCropComplete = async (croppedBlob) => {
    setIsUploading(true);
    setShowCropModal(false);
    
    try {
      // Convert blob to file
      const croppedFile = new File([croppedBlob], 'profile-picture.png', { type: 'image/png' });
      
      const { file_url } = await UploadFile({ file: croppedFile });
      setFormData(prev => ({ ...prev, profile_picture_url: file_url }));
    } catch (error) {
      console.error('Error uploading cropped image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      if (tempImageUrl) {
        URL.revokeObjectURL(tempImageUrl);
        setTempImageUrl(null);
      }
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    if (tempImageUrl) {
      URL.revokeObjectURL(tempImageUrl);
      setTempImageUrl(null);
    }
  };
  
  const handleDowngradeSuccess = () => {
    setDeleteModalOpen(false);
    refetchUser();
  };
  
  const handleDeleteSuccess = async () => {
    setDeleteModalOpen(false);
    try {
        await User.logout();
        navigate(createPageUrl('Home'));
    } catch (e) {
        console.error("Logout failed after deletion:", e);
        // Force redirect even if logout fails
        window.location.href = createPageUrl('Home');
    }
  };

  const getUserInitials = () => {
    if (formData.first_name && formData.last_name) {
      return `${formData.first_name[0]}${formData.last_name[0]}`.toUpperCase();
    } else if (formData.username) {
      return formData.username.substring(0, 2).toUpperCase();
    } else if (formData.full_name) {
      const parts = formData.full_name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return formData.full_name.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#5a3217] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="main-text">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <ImageCropModal
        isOpen={showCropModal}
        onClose={handleCropCancel}
        imageUrl={tempImageUrl}
        onCropComplete={handleCropComplete}
      />
      
      <DeleteAccountModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        plan={plan}
        onDowngradeSuccess={handleDowngradeSuccess}
        onDeleteSuccess={handleDeleteSuccess}
      />

      <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold main-text">My Profile</h1>
            <p className="main-text opacity-70 mt-2">Manage your account information and preferences</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Picture and Basic Info */}
            <div className="lg:col-span-1 space-y-8">
              <Card className="tool-card-bg border-0 elegant-shadow">
                <CardContent className="p-6 text-center">
                  <div className="relative inline-block mb-4">
                    <Avatar className="w-32 h-32 mx-auto">
                      <AvatarImage 
                        src={formData.profile_picture_url} 
                        alt={formData.full_name || formData.username}
                        className="object-cover"
                      />
                      <AvatarFallback 
                        className="text-2xl font-bold"
                        style={{ backgroundColor: '#5a3217', color: '#e5e4cd' }}
                      >
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    
                    {isEditing && selectionMode === 'upload' && (
                      <div className="absolute bottom-0 right-0">
                        <input
                          type="file"
                          id="profile-picture"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="profile-picture"
                          className="flex items-center justify-center w-10 h-10 bg-[#f26222] text-white rounded-full cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          {isUploading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Camera className="w-4 h-4" />
                          )}
                        </label>
                      </div>
                    )}
                  </div>

                  <h2 className="text-base font-bold main-text mb-6">
                    {formData.username || 'Anonymous User'}
                  </h2>
                  
                  <div className="space-y-2">
                    <Badge 
                      variant={user.role === 'admin' ? 'destructive' : 'default'}
                      className="mb-2"
                    >
                      {user.role || 'user'}
                    </Badge>
                    
                    <div className="flex items-center justify-center gap-2 text-sm main-text">
                      <Trophy className="w-4 h-4 highlight-text" />
                      <span>{user.bones_balance || 0} Bones</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {plan && (
                <Card className="tool-card-bg border-0 elegant-shadow">
                  <CardHeader>
                    <CardTitle className="main-text flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      Membership
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold main-text">{plan.name}</h3>
                      <p className="text-sm main-text opacity-70">
                        {plan.name !== 'Free' && user.subscription_end_date 
                          ? `Renews on ${format(new Date(user.subscription_end_date), 'MMMM d, yyyy')}`
                          : 'Basic access plan'}
                      </p>
                    </div>
                    <Button 
                      onClick={() => navigate(createPageUrl('Membership'))}
                      style={{ backgroundColor: '#007e81', color: 'white' }}
                      className="w-full"
                    >
                      Manage Membership
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Danger Zone Card */}
              <Card className="border-red-500/50 bg-red-500/10 elegant-shadow">
                  <CardHeader>
                      <CardTitle className="text-red-700">Danger Zone</CardTitle>
                      <CardDescription className="text-red-600/80">
                          Irreversible account actions.
                      </CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Button variant="destructive" className="w-full" onClick={() => setDeleteModalOpen(true)}>
                          <Trash2 className="w-4 h-4 mr-2"/>
                          Delete Account
                      </Button>
                  </CardContent>
              </Card>

            </div>

            {/* Editable Information */}
            <div className="lg:col-span-2">
              <Card className="tool-card-bg border-0 elegant-shadow">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="main-text">Personal Information</CardTitle>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          onClick={handleSave}
                          disabled={isSaving}
                          style={{ backgroundColor: '#007e81', color: 'white' }}
                          className="flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button
                          onClick={handleCancel}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => setIsEditing(true)}
                        style={{ backgroundColor: '#f26222', color: 'white' }}
                        className="flex items-center gap-2"
                      >
                        <UserIcon className="w-4 h-4" />
                        Edit Profile
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="p-6 space-y-6">
                  {isEditing && (
                    <div className="flex border-b border-gray-400 mb-6">
                      <button
                        onClick={() => setSelectionMode('upload')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                          selectionMode === 'upload'
                            ? 'border-b-2 border-[#f26222] main-text'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <UploadCloud className="w-4 h-4" />
                        Upload Custom
                      </button>
                      <button
                        onClick={() => setSelectionMode('select')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                          selectionMode === 'select'
                            ? 'border-b-2 border-[#f26222] main-text'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <ImageIcon className="w-4 h-4" />
                        Choose Avatar
                      </button>
                    </div>
                  )}

                  {isEditing && selectionMode === 'select' ? (
                    <div className="space-y-6">
                      <h3 className="text-lg font-bold main-text">Select an Avatar</h3>
                      {avatarsLoading ? (
                        <div className="flex justify-center items-center h-48">
                          <div className="w-8 h-8 border-4 border-[#5a3217] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                          {avatarCategories.length > 0 ? avatarCategories.map(categoryName => {
                            const categoryAvatars = avatars.filter(a => a.category === categoryName);
                            if (categoryAvatars.length === 0) return null;
                            
                            return (
                              <div key={categoryName}>
                                <h4 className="font-bold main-text capitalize mb-2">{categoryName}</h4>
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
                                  {categoryAvatars.map(avatar => (
                                    <button
                                      key={avatar.id}
                                      onClick={() => setFormData(prev => ({...prev, profile_picture_url: avatar.file_url}))}
                                      className={`aspect-square rounded-full overflow-hidden border-4 transition-all ${formData.profile_picture_url === avatar.file_url ? 'border-[#f26222] ring-2 ring-[#f26222]' : 'border-transparent hover:border-gray-400'}`}
                                    >
                                      <img src={avatar.file_url} alt={avatar.name} className="w-full h-full object-cover"/>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )
                          }) : <p className="main-text opacity-70">No avatars available.</p>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Form fields are only shown when not selecting an avatar */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="first-name" className="main-text font-medium">
                            First Name
                          </Label>
                          <Input
                            id="first-name"
                            value={formData.first_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                            disabled={!isEditing}
                            placeholder="Enter your first name"
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="last-name" className="main-text font-medium">
                            Last Name
                          </Label>
                          <Input
                            id="last-name"
                            value={formData.last_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                            disabled={!isEditing}
                            placeholder="Enter your last name"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="username" className="main-text font-medium">
                          Username
                        </Label>
                        <Input
                          id="username"
                          value={formData.username}
                          onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                          disabled={!isEditing}
                          placeholder="Choose a unique username"
                          className="mt-1"
                        />
                        <p className="text-xs main-text opacity-60 mt-1">
                          This is how you'll appear in games and on leaderboards.
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="email" className="main-text font-medium flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          disabled={true} // Email changes usually require verification
                          className="mt-1 opacity-60"
                        />
                        <p className="text-xs main-text opacity-60 mt-1">
                          Email changes may require verification. Contact support if needed.
                        </p>
                      </div>

                      {/* Privacy Settings - updated to include public profile */}
                      {isEditing ? (
                        <div className="space-y-3 pt-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="open-to-invites-profile"
                              checked={formData.open_to_club_invites}
                              onCheckedChange={(checked) => setFormData(prev => ({...prev, open_to_club_invites: checked }))}
                              className="data-[state=checked]:bg-[#007e81]"
                            />
                            <label
                              htmlFor="open-to-invites-profile"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 main-text"
                            >
                              Open to receiving Club invitations
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="public-profile-setting"
                              checked={formData.public_profile}
                              onCheckedChange={(checked) => setFormData(prev => ({...prev, public_profile: checked }))}
                              className="data-[state=checked]:bg-[#007e81]"
                            />
                            <label
                              htmlFor="public-profile-setting"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 main-text"
                            >
                              Make my profile publicly viewable
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="allow-friend-requests-setting"
                              checked={formData.allow_friend_requests}
                              onCheckedChange={(checked) => setFormData(prev => ({...prev, allow_friend_requests: checked }))}
                              className="data-[state=checked]:bg-[#007e81]"
                            />
                            <label
                              htmlFor="allow-friend-requests-setting"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 main-text"
                            >
                              Allow others to send me friend requests
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-4 border-t">
                          <h4 className="text-sm font-medium main-text mb-2">Privacy Settings</h4>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={formData.open_to_club_invites}
                                disabled={true}
                                className="data-[state=checked]:bg-[#007e81] opacity-60"
                              />
                              <span className="text-sm main-text opacity-70">
                                Open to receiving Club invitations
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={formData.public_profile}
                                disabled={true}
                                className="data-[state=checked]:bg-[#007e81] opacity-60"
                              />
                              <span className="text-sm main-text opacity-70">
                                Profile is publicly viewable
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={formData.allow_friend_requests}
                                disabled={true}
                                className="data-[state=checked]:bg-[#007e81] opacity-60"
                              />
                              <span className="text-sm main-text opacity-70">
                                Accepts friend requests
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Account Statistics */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-bold main-text mb-4">Account Statistics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold highlight-text">{user.bones_balance || 0}</div>
                        <div className="text-sm main-text opacity-70">Bones Balance</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold main-text">{user.stats?.games_played || 0}</div>
                        <div className="text-sm main-text opacity-70">Games Played</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold main-text">{user.stats?.games_won || 0}</div>
                        <div className="text-sm main-text opacity-70">Games Won</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold main-text">{user.stats?.rating || 1500}</div>
                        <div className="text-sm main-text opacity-70">Rating</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
