
import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Club } from '@/entities/Club';
import { ClubMember } from '@/entities/ClubMember';
import { ClubEvent } from '@/entities/ClubEvent';
import { Tournament } from '@/entities/Tournament';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Settings, Trash2, Save, AlertTriangle, RefreshCw, Camera, Users, Image, TestTube2 } from 'lucide-react';
import ClubLogoUploadModal from '../components/clubs/ClubLogoUploadModal';
import ClubMastheadUploadModal from '../components/clubs/ClubMastheadUploadModal';
import { addTestMembersToClub } from '../functions/addTestMembersToClub';

export default function ClubSettingsPage() {
  const { user, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const clubId = new URLSearchParams(location.search).get('id');

  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    strapline: '',
    description: ''
  });

  // New state for controlling upload modals
  const [showLogoUpload, setShowLogoUpload] = useState(false);
  const [showMastheadUpload, setShowMastheadUpload] = useState(false);
  const [isAddingTestMembers, setIsAddingTestMembers] = useState(false);
  const [testMemberMessage, setTestMemberMessage] = useState('');

  const fetchClub = useCallback(async () => {
    if (!clubId) {
      navigate(createPageUrl('Clubs'));
      return;
    }
    setLoading(true);
    try {
      const clubData = await Club.get(clubId);
      if (!clubData) {
        throw new Error("Club not found.");
      }
      setClub(clubData);
      setFormData({
        name: clubData.name,
        strapline: clubData.strapline || '',
        description: clubData.description || ''
      });
    } catch (err) {
      console.error("Failed to fetch club:", err);
      setError(`Failed to fetch club: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [clubId, navigate]);

  useEffect(() => {
    if (!userLoading && clubId) {
      fetchClub();
    }
  }, [userLoading, clubId, fetchClub]);

  const handleSaveBasicInfo = async () => {
    setSaving(true);
    setError('');
    try {
      await Club.update(clubId, {
        name: formData.name,
        strapline: formData.strapline,
        description: formData.description
      });

      setClub(prev => ({
        ...prev,
        name: formData.name,
        strapline: formData.strapline,
        description: formData.description
      }));

      alert('Club information updated successfully!');
    } catch (err) {
      console.error('Error updating club:', err);
      setError('Failed to update club information.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClub = async () => {
    if (deleteConfirmText !== club.name) {
      setError(`You must type "${club.name}" to confirm deletion.`);
      return;
    }

    setDeleting(true);
    setError('');

    try {
      // 1. Fetch all related data
      const [members, events, tournaments] = await Promise.all([
        ClubMember.filter({ club_id: clubId }),
        ClubEvent.filter({ club_id: clubId }),
        Tournament.filter({ club_id: clubId })
      ]);

      // 2. Deep delete all tournaments associated with the club
      const { TournamentParticipant } = await import('@/entities/TournamentParticipant');
      const { TournamentMatch } = await import('@/entities/TournamentMatch');

      for (const tournament of tournaments) {
        // Delete participants for this tournament
        const participants = await TournamentParticipant.filter({ tournament_id: tournament.id });
        const participantDeletes = participants.map(p => TournamentParticipant.delete(p.id));
        await Promise.all(participantDeletes);

        // Delete matches for this tournament
        const matches = await TournamentMatch.filter({ tournament_id: tournament.id });
        const matchDeletes = matches.map(m => TournamentMatch.delete(m.id));
        await Promise.all(matchDeletes);

        // Finally, delete the tournament itself
        await Tournament.delete(tournament.id);
      }

      // 3. Delete club members
      const memberDeletePromises = members.map(member => ClubMember.delete(member.id));
      await Promise.all(memberDeletePromises);

      // 4. Delete club events and their RSVPs
      const { ClubEventRSVP } = await import('@/entities/ClubEventRSVP');
      const eventRSVPs = await ClubEventRSVP.filter({ club_id: clubId });
      const rsvpDeletePromises = eventRSVPs.map(rsvp => ClubEventRSVP.delete(rsvp.id));
      await Promise.all(rsvpDeletePromises);

      const eventDeletePromises = events.map(event => ClubEvent.delete(event.id));
      await Promise.all(eventDeletePromises);

      // 5. Delete club messages
      const { Message } = await import('@/entities/Message');
      const clubMessages = await Message.filter({ club_id: clubId });
      const messageDeletePromises = clubMessages.map(message => Message.delete(message.id));
      await Promise.all(messageDeletePromises);

      // 6. Finally, delete the club
      await Club.delete(clubId);

      alert(`Club "${club.name}" has been permanently deleted along with all associated data.`);
      navigate(createPageUrl('Clubs'));
    } catch (err) {
      console.error('Error deleting club:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete club. Please try again.';
      setError(`Deletion failed: ${errorMessage}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleImageUpload = async () => {
    // Just refetch the club data to get the new URL
    await fetchClub();
  };

  const handleAddTestMembers = async () => {
    if (!club) return;
    setIsAddingTestMembers(true);
    setTestMemberMessage('');
    try {
      const { data, error: addError } = await addTestMembersToClub({ clubName: club.name });
      if (addError) {
        throw new Error(addError.message || 'An unknown error occurred');
      }
      setTestMemberMessage(data.message || 'Test members added successfully!');
    } catch (err) {
      console.error('Failed to add test members:', err);
      setTestMemberMessage(`Error: ${err.message}`);
    } finally {
      setIsAddingTestMembers(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <RefreshCw className="w-12 h-12 animate-spin main-text" />
      </div>
    );
  }

  if (!user || !club) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#e5e4cd' }}>
        <Card className="tool-card-bg border-0 elegant-shadow text-center max-w-lg">
          <CardHeader>
            <CardTitle className="main-text">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="main-text opacity-70 mb-6">Club not found or you don't have permission to access settings.</p>
            <Button asChild style={{ backgroundColor: '#f26222', color: 'white' }}>
              <Link to={createPageUrl('Clubs')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Clubs
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is primary admin (only primary admin can access settings)
  const isPrimaryAdmin = club.admin_id === user.id;

  if (!isPrimaryAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#e5e4cd' }}>
        <Card className="tool-card-bg border-0 elegant-shadow text-center max-w-lg">
          <CardHeader>
            <CardTitle className="main-text">Primary Admin Only</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="main-text opacity-70 mb-6">Only the primary admin can access club settings.</p>
            <Button asChild style={{ backgroundColor: '#f26222', color: 'white' }}>
              <Link to={createPageUrl(`ClubDetails?id=${clubId}`)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Club
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link
            to={createPageUrl(`ClubDetails?id=${clubId}`)}
            className="inline-flex items-center gap-2 text-[#5a3217] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {club.name}
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold main-text flex items-center justify-center gap-3">
            <Settings className="w-10 h-10" />
            Club Settings
          </h1>
          <p className="main-text opacity-70 mt-2">Manage {club.name} settings and preferences</p>
        </div>

        {error && !showDeleteConfirm && ( // Show general error only if not in delete confirmation flow
          <Card className="tool-card-bg border-0 elegant-shadow mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <p className="font-medium">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-8">
          {/* Basic Club Information */}
          <Card className="tool-card-bg border-0 elegant-shadow">
            <CardHeader>
              <CardTitle className="main-text">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="block text-sm font-medium main-text mb-2">Club Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter club name"
                  className="bg-white/80"
                />
              </div>
              <div>
                <Label className="block text-sm font-medium main-text mb-2">Strapline</Label>
                <Input
                  value={formData.strapline}
                  onChange={(e) => setFormData(prev => ({ ...prev, strapline: e.target.value }))}
                  placeholder="Enter a short tagline or motto"
                  className="bg-white/80"
                />
              </div>
              <div>
                <Label className="block text-sm font-medium main-text mb-2">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter detailed club description"
                  rows={4}
                  className="bg-white/80"
                />
              </div>
              <Button
                onClick={handleSaveBasicInfo}
                disabled={saving}
                style={{ backgroundColor: '#007e81', color: 'white' }}
                className="flex items-center gap-2"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Club Branding Section */}
          <Card className="tool-card-bg border-0 elegant-shadow">
            <CardHeader>
              <CardTitle className="main-text">Club Branding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold main-text mb-3">Club Logo</h4>
                  {club.logo_url ? (
                    <img
                      src={club.logo_url}
                      alt={`${club.name} logo`}
                      className="w-32 h-32 object-contain rounded-lg mb-3 bg-white/20"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gray-300 rounded-lg flex items-center justify-center mb-3">
                      <Users className="w-16 h-16 text-gray-500" />
                    </div>
                  )}
                  <Button
                    onClick={() => setShowLogoUpload(true)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Change Logo
                  </Button>
                </div>

                <div>
                  <h4 className="font-semibold main-text mb-3">Club Masthead</h4>
                  {club.masthead_url ? (
                    <img
                      src={club.masthead_url}
                      alt={`${club.name} masthead`}
                      className="w-64 h-32 object-cover rounded-lg mb-3"
                    />
                  ) : (
                    <div className="w-64 h-32 bg-gray-300 rounded-lg flex items-center justify-center mb-3">
                      <Image className="w-16 h-16 text-gray-500" />
                    </div>
                  )}
                  <Button
                    onClick={() => setShowMastheadUpload(true)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Image className="w-4 h-4" />
                    Change Masthead
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Testing Tools Section */}
          <Card className="tool-card-bg border-0 elegant-shadow">
            <CardHeader>
              <CardTitle className="main-text">Testing Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                <div className="flex items-center gap-2 mb-3">
                  <TestTube2 className="w-5 h-5 text-yellow-600" />
                  <h4 className="font-bold text-yellow-800">Add Test Members</h4>
                </div>
                <p className="text-sm text-yellow-700 mb-4">
                  This tool creates 10 test members with fake usernames and random ratings to help test league functionality and invitations.
                </p>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={handleAddTestMembers}
                    disabled={isAddingTestMembers}
                    className="flex items-center gap-2 text-white font-medium px-4 py-2"
                    style={{ backgroundColor: '#f26222' }}
                  >
                    <TestTube2 className="w-4 h-4" />
                    {isAddingTestMembers ? 'Adding...' : 'Add 10 Test Members'}
                  </Button>
                  {testMemberMessage && (
                    <p className={`text-sm font-semibold ${testMemberMessage.startsWith('Error') ? 'text-red-700' : 'text-green-700'}`}>
                      {testMemberMessage}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200 bg-red-50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-md">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h4 className="font-bold text-red-700">Delete Club Permanently</h4>
                </div>
                <p className="text-sm text-red-600 mb-3">
                  This action will permanently delete the club and ALL associated data including:
                </p>
                <ul className="text-sm text-red-600 mb-3 list-disc list-inside space-y-1">
                  <li>All club memberships (members will be removed)</li>
                  <li>All club events and RSVPs</li>
                  <li>All club tournaments and matches</li>
                  <li>All club messages and conversations</li>
                  <li>Club logo and settings</li>
                </ul>
                <p className="text-sm text-red-600 font-bold mb-4">
                  This action cannot be undone!
                </p>

                {!showDeleteConfirm ? (
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Club Forever
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label className="block text-sm font-medium text-red-700 mb-2">
                        Type "{club.name}" to confirm deletion:
                      </Label>
                      <Input
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={club.name}
                        className="bg-red-50 border-red-300"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleDeleteClub}
                        disabled={deleting || deleteConfirmText !== club.name}
                        variant="destructive"
                        className="flex items-center gap-2"
                      >
                        {deleting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Delete Forever
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                          setError('');
                        }}
                        variant="outline"
                        disabled={deleting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {error && showDeleteConfirm && ( // Show delete-specific error only when delete confirmation is active
                  <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Modals */}
        {club && (
          <>
            <ClubLogoUploadModal
              isOpen={showLogoUpload}
              onClose={() => setShowLogoUpload(false)}
              club={club}
              onUploadComplete={handleImageUpload}
            />
            <ClubMastheadUploadModal
              isOpen={showMastheadUpload}
              onClose={() => setShowMastheadUpload(false)}
              club={club}
              onUploadComplete={handleImageUpload}
            />
          </>
        )}
      </div>
    </div>
  );
}
