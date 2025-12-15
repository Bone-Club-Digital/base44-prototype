
import React, { useState, useEffect } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, Package, Users, BarChart3, ArrowLeft, LayoutGrid, User as UserIcon,
  Award, ClipboardList, Video, Mail, Image, Shuffle, Trash2, Loader2,
  ServerCrash, Trophy, Store, Settings2, SlidersHorizontal, Images // Added Images for Media Management
} from 'lucide-react';
import { randomizeBogusRatings } from '@/functions/randomizeBogusRatings';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteAllGameAndLeagueData } from "@/functions/deleteAllGameAndLeagueData";
import { debugLeagueProposals } from "@/functions/debugLeagueProposals";

export default function AdminPage() {
  const { user, loading: userLoading } = useUser();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setError] = useState('');
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugResults, setDebugResults] = useState(null);

  useEffect(() => {
    if (!userLoading && (!user || user.role !== 'admin')) {
      navigate(createPageUrl('Home'));
    }
  }, [user, userLoading, navigate]);

  const handleRandomizeBogusRatings = async () => {
    if (!confirm('This will randomize the ratings of all bogus test members between 1000-2000. Continue?')) {
      return;
    }
    setSuccessMessage('');
    setError('');
    setLoading(true);
    try {
      const { data } = await randomizeBogusRatings();
      setSuccessMessage(data.message);
      console.log('Randomization details:', data.details);
    } catch (error) {
      console.error('Error randomizing bogus ratings:', error);
      setError(`Failed to randomize ratings: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDataReset = async () => {
    setIsDeleting(true);
    try {
      const { data } = await deleteAllGameAndLeagueData();
      if (data.success) {
        const counts = data.deletedCounts;
        alert(`Successfully deleted all data:\n- Leagues: ${counts.leagues}\n- League Matches: ${counts.matches}\n- Proposals: ${counts.proposals}\n- Game Sessions: ${counts.gameSessions}\n- Scheduled Matches: ${counts.scheduledMatches}`);
      } else {
        throw new Error(data.error || 'Failed to delete data.');
      }
    } catch (error) {
      console.error("Failed to reset data:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDebugProposals = async () => {
    setIsDebugging(true);
    setDebugResults(null);
    try {
      const { data } = await debugLeagueProposals();
      console.log("[pages/Admin.js] Debug results:", data);
      setDebugResults(data);
      alert(`Debug completed. Found ${data.debug_info.all_proposals_count} total proposals, ${data.debug_info.user_proposals_count} visible to current user.`);
    } catch (error) {
      console.error("[pages/Admin.js] Failed to debug:", error);
      setError(`Failed to debug proposals: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsDebugging(false);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#5a3217] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="main-text">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <Card className="tool-card-bg border-0 elegant-shadow max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 main-text opacity-50 mx-auto mb-4" />
            <h2 className="text-2xl font-bold main-text mb-2">Access Denied</h2>
            <p className="main-text opacity-70">You must be an administrator to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e5e4cd' }}>
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Home")} className="flex items-center gap-2 hover:opacity-70 transition-colors" style={{ color: '#5a3217' }}>
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Lobby</span>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold main-text flex items-center justify-center gap-3">
            <Shield className="w-10 h-10" />
            Admin Dashboard
          </h1>
          <p className="main-text opacity-70 mt-2">Manage your Bone Club application</p>
          {successMessage && (
            <p className="text-green-600 font-semibold mt-4">{successMessage}</p>
          )}
          {errorMessage && (
            <p className="text-red-600 font-semibold mt-4">{errorMessage}</p>
          )}
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 lg:grid-cols-3 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4"/>Dashboard</TabsTrigger>
            <TabsTrigger value="shop" className="flex items-center gap-2"><Store className="w-4 h-4"/>Shop Management</TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2"><Settings2 className="w-4 h-4"/>System</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link to={createPageUrl("AdminHomeBanners")}>
                <Card className="tool-card-bg border-0 elegant-shadow hover:shadow-xl transition-all duration-300 cursor-pointer group">
                  <CardHeader><CardTitle className="main-text flex items-center gap-3 group-hover:text-[#f26222] transition-colors"><Image className="w-6 h-6" />Home Banners</CardTitle></CardHeader>
                  <CardContent><p className="main-text opacity-70">Manage the dynamic, text-over-image banners for the homepage.</p></CardContent>
                </Card>
              </Link>
              <Link to={createPageUrl("AdminMedia")}>
                <Card className="tool-card-bg border-0 elegant-shadow hover:shadow-xl transition-all duration-300 cursor-pointer group">
                  <CardHeader><CardTitle className="main-text flex items-center gap-3 group-hover:text-[#f26222] transition-colors"><Images className="w-6 h-6" />Media Management</CardTitle></CardHeader>
                  <CardContent><p className="main-text opacity-70">Upload, organize, and manage all media files including logos, banners, and images.</p></CardContent>
                </Card>
              </Link>
              <Link to={createPageUrl("AdminUsers")}>
                <Card className="tool-card-bg border-0 elegant-shadow hover:shadow-xl transition-all duration-300 cursor-pointer group">
                  <CardHeader><CardTitle className="main-text flex items-center gap-3 group-hover:text-[#f26222] transition-colors"><Users className="w-6 h-6" />User Management</CardTitle></CardHeader>
                  <CardContent><p className="main-text opacity-70">Manage user accounts, bones balances, and player statistics.</p></CardContent>
                </Card>
              </Link>
              <Link to={createPageUrl("AdminBadges")}>
                <Card className="tool-card-bg border-0 elegant-shadow hover:shadow-xl transition-all duration-300 cursor-pointer group">
                  <CardHeader><CardTitle className="main-text flex items-center gap-3 group-hover:text-[#f26222] transition-colors"><Award className="w-6 h-6" />Badge Management</CardTitle></CardHeader>
                  <CardContent><p className="main-text opacity-70">Create and assign custom badges to users.</p></CardContent>
                </Card>
              </Link>
              <Link to={createPageUrl("AdminPlans")}>
                <Card className="tool-card-bg border-0 elegant-shadow hover:shadow-xl transition-all duration-300 cursor-pointer group">
                  <CardHeader><CardTitle className="main-text flex items-center gap-3 group-hover:text-[#f26222] transition-colors"><ClipboardList className="w-6 h-6" />Plan Management</CardTitle></CardHeader>
                  <CardContent><p className="main-text opacity-70">Create and manage membership plans.</p></CardContent>
                </Card>
              </Link>
              <Link to={createPageUrl("AdminAvatars")}>
                <Card className="tool-card-bg border-0 elegant-shadow hover:shadow-xl transition-all duration-300 cursor-pointer group">
                  <CardHeader><CardTitle className="main-text flex items-center gap-3 group-hover:text-[#f26222] transition-colors"><UserIcon className="w-6 h-6" />Profile Avatars</CardTitle></CardHeader>
                  <CardContent><p className="main-text opacity-70">Upload and manage profile avatars that users can select.</p></CardContent>
                </Card>
              </Link>
              <Card className="tool-card-bg border-0 elegant-shadow opacity-50">
                <CardHeader><CardTitle className="main-text flex items-center gap-3"><BarChart3 className="w-6 h-6" />Analytics</CardTitle></CardHeader>
                <CardContent><p className="main-text opacity-70">View platform statistics and user activity. (Coming Soon)</p></CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Shop Management Tab */}
          <TabsContent value="shop">
            <Card className="tool-card-bg border-0 elegant-shadow">
                <CardHeader><CardTitle className="main-text">Shop Tools</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Link to={createPageUrl("AdminProducts")}>
                            <Card className="tool-card-bg border-0 elegant-shadow hover:shadow-xl transition-all duration-300 cursor-pointer group">
                                <CardHeader><CardTitle className="main-text flex items-center gap-3 group-hover:text-[#f26222] transition-colors"><Package className="w-6 h-6" />Product Management</CardTitle></CardHeader>
                                <CardContent><p className="main-text opacity-70">Add, edit, and manage shop products. Set prices, categories, and inventory.</p></CardContent>
                            </Card>
                        </Link>
                        <Link to={createPageUrl("AdminCategories")}>
                            <Card className="tool-card-bg border-0 elegant-shadow hover:shadow-xl transition-all duration-300 cursor-pointer group">
                                <CardHeader><CardTitle className="main-text flex items-center gap-3 group-hover:text-[#f26222] transition-colors"><LayoutGrid className="w-6 h-6" />Category Management</CardTitle></CardHeader>
                                <CardContent><p className="main-text opacity-70">Add, edit, and manage product categories for the shops.</p></CardContent>
                            </Card>
                        </Link>
                    </div>
                </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system">
            <div className="space-y-8">
              {/* Test Data Card */}
              <Card className="tool-card-bg border-0 elegant-shadow">
                  <CardHeader><CardTitle className="main-text flex items-center gap-3"><Users className="w-6 h-6" />Test Data Management</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-4">
                          <Button onClick={() => setIsAddMembersModalOpen(true)} style={{ backgroundColor: '#007e81', color: 'white' }}>
                              <Users className="w-4 h-4 mr-2" />Add 10 Test Members
                          </Button>
                          <Button onClick={handleRandomizeBogusRatings} disabled={loading} style={{ backgroundColor: '#f26222', color: 'white' }}>
                              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Shuffle className="w-4 h-4 mr-2" />}
                              {loading ? 'Randomizing...' : 'Randomize Bogus Ratings'}
                          </Button>
                          <DeleteAllMessagesButton />
                          <CleanupStaleLeagueInvitationsButton />
                      </div>
                  </CardContent>
              </Card>

              {/* Data Cleanup Cards */}
              <Card className="tool-card-bg border-0 elegant-shadow">
                  <CardHeader><CardTitle className="main-text flex items-center gap-3"><Trash2 className="w-6 h-6" />Data Cleanup</CardTitle></CardHeader>
                  <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <CleanupDuplicateInvitationsCard />
                          <CleanupPlayerStatsCard />
                          <TestDailyKeyCard />
                          <SyncProfilePicturesCard />
                      </div>
                  </CardContent>
              </Card>

              {/* System Actions Card */}
              <Card className="tool-card-bg border-0 elegant-shadow">
                <CardHeader><CardTitle className="main-text uppercase flex items-center gap-3"><ServerCrash className="w-6 h-6" />System Actions</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-4">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="flex items-center gap-2" disabled={isDeleting}>
                            {isDeleting ? (<><Loader2 className="w-4 h-4 animate-spin" />Deleting All Data...</>) : (<><Trash2 className="w-4 h-4" />Reset All Game & League Data</>)}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action is irreversible. It will permanently delete all leagues, league matches, proposals, active game sessions, and scheduled matches from the database. This is a complete reset.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDataReset} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">Yes, Delete Everything</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button onClick={handleDebugProposals} disabled={isDebugging} variant="outline" className="flex items-center gap-2">
                          {isDebugging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                          {isDebugging ? 'Debugging...' : 'Debug League Proposals (Any User)'}
                      </Button>
                    </div>
                    {debugResults && (
                        <div className="mt-4 p-4 bg-white/20 rounded-lg">
                            <h4 className="font-bold main-text mb-2">Debug Results:</h4>
                            <div className="text-sm main-text space-y-1">
                                <p>Current User: {debugResults.debug_info.current_username} ({debugResults.debug_info.current_user_id})</p>
                                <p>Total Proposals in DB: {debugResults.debug_info.all_proposals_count}</p>
                                <p>Proposals Visible to Current User: {debugResults.debug_info.user_proposals_count}</p>
                                {debugResults.debug_info.all_proposals.length > 0 && (
                                    <details className="mt-2"><summary className="cursor-pointer font-bold">Show All Proposals</summary><pre className="text-xs mt-1 whitespace-pre-wrap">{JSON.stringify(debugResults.debug_info.all_proposals, null, 2)}</pre></details>
                                )}
                            </div>
                        </div>
                    )}
                    <p className="text-xs text-center mt-2 main-text opacity-70">Use this to perform a hard reset on all user-created match and league data.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function DeleteAllMessagesButton() {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAllMessages = async () => {
    if (!confirm('This will permanently delete ALL messages in the system. This action cannot be undone. Are you sure?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const { deleteAllMessages } = await import('@/functions/deleteAllMessages');
      const { data } = await deleteAllMessages();

      if (data.success) {
        alert(`Successfully deleted ${data.deletedCount} messages out of ${data.totalFound} found.`);
      } else {
        throw new Error(data.error || 'Failed to delete messages.');
      }
    } catch (error) {
      console.error("Failed to delete messages:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      onClick={handleDeleteAllMessages}
      disabled={isDeleting}
      variant="destructive"
      className="flex items-center gap-2"
    >
      {isDeleting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Deleting Messages...
        </>
      ) : (
        <>
          <Mail className="w-4 h-4" />
          Delete All Messages
        </>
      )}
    </Button>
  );
}

function CleanupStaleLeagueInvitationsButton() {
  const [isCleaning, setIsCleaning] = useState(false);

  const handleCleanup = async () => {
    if (!confirm('This will clean up stale league invitation messages. Continue?')) {
      return;
    }

    setIsCleaning(true);
    try {
      const { cleanupStaleLeagueInvitations } = await import('@/functions/cleanupStaleLeagueInvitations');
      const { data } = await cleanupStaleLeagueInvitations();

      if (data.success) {
        alert(`Cleanup completed!\n\nDeleted: ${data.deletedMessages} stale messages\nKept: ${data.validMessages} valid messages\nErrors: ${data.errors}`);
      } else {
        throw new Error(data.error || 'Failed to cleanup league invitations.');
      }
    } catch (error) {
      console.error("Failed to cleanup league invitations:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <Button
      onClick={handleCleanup}
      disabled={isCleaning}
      style={{ backgroundColor: '#9fd3ba', color: '#5a3217' }}
      className="flex items-center gap-2"
    >
      {isCleaning ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Cleaning Up...
        </>
      ) : (
        <>
          <Trophy className="w-4 h-4" />
          Cleanup League Invitations
        </>
      )}
    </Button>
  );
}

function CleanupDuplicateInvitationsCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleCleanup = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const { ClubMember } = await import('@/entities/ClubMember');
      const { Message } = await import('@/entities/Message');

      const allMembers = await ClubMember.list();
      const pendingInvitations = allMembers.filter(member => member.status === 'pending');

      const invitationMap = new Map();
      const duplicatesToDelete = [];

      pendingInvitations.forEach(invitation => {
        const key = `${invitation.user_id}-${invitation.club_id}`;

        if (invitationMap.has(key)) {
          const existing = invitationMap.get(key);
          const existingDate = new Date(existing.created_date);
          const currentDate = new Date(invitation.created_date);

          if (currentDate > existingDate) {
            duplicatesToDelete.push(existing);
            invitationMap.set(key, invitation);
          } else {
            duplicatesToDelete.push(invitation);
          }
        } else {
          invitationMap.set(key, invitation);
        }
      });

      let deletedInvitations = 0;
      let deletedMessages = 0;

      for (const duplicate of duplicatesToDelete) {
        try {
          const allMessages = await Message.list();
          const relatedMessages = allMessages.filter(msg =>
            msg.related_entity_id === duplicate.id &&
            msg.related_entity_type === 'ClubMember' &&
            msg.type === 'notification'
          );

          await ClubMember.delete(duplicate.id);
          deletedInvitations++;

          for (const message of relatedMessages) {
            await Message.delete(message.id);
            deletedMessages++;
          }
        } catch (error) {
          console.error('Failed to delete duplicate:', error);
        }
      }

      setResult({
        success: true,
        message: `Deleted ${deletedInvitations} duplicate invitations and ${deletedMessages} messages`,
        details: {
          totalPending: pendingInvitations.length,
          duplicatesFound: duplicatesToDelete.length,
          deletedInvitations,
          deletedMessages
        }
      });

    } catch (error) {
      console.error('Error cleaning up duplicate invitations:', error);
      setResult({
        error: error.message || 'Cleanup failed',
        success: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="tool-card-bg border-0 elegant-shadow hover:shadow-xl transition-all duration-300 cursor-pointer group" onClick={handleCleanup}>
      <CardHeader>
        <CardTitle className="main-text flex items-center gap-3 group-hover:text-[#f26222] transition-colors">
          <Mail className="w-6 h-6" />
          Cleanup Duplicate Invitations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-[#5a3217] border-t-transparent rounded-full animate-spin"></div>
            <p className="main-text opacity-70">Cleaning up duplicates...</p>
          </div>
        ) : result ? (
          <div className="space-y-2">
            {result.error ? (
              <p className="text-sm text-red-600">{result.error}</p>
            ) : (
              <>
                <p className="text-sm main-text">
                  <strong>Invitations deleted:</strong> {result.details?.deletedInvitations || 0}
                </p>
                <p className="text-sm main-text">
                  <strong>Messages deleted:</strong> {result.details?.deletedMessages || 0}
                </p>
                <p className="text-sm main-text">
                  <strong>Duplicates found:</strong> {result.details?.duplicatesFound || 0}
                </p>
              </>
            )}
            <p className="text-xs main-text opacity-50">
              Last run: {new Date().toLocaleTimeString()}
            </p>
          </div>
        ) : (
          <p className="main-text opacity-70">Remove duplicate club invitations and their associated notification messages.</p>
        )}
      </CardContent>
    </Card>
  );
}

function CleanupPlayerStatsCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleCleanup = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const { cleanupOrphanedPlayerStats } = await import('@/functions/cleanupOrphanedPlayerStats');
      const response = await cleanupOrphanedPlayerStats();
      setResult(response.data);
    } catch (error) {
      console.error('Error cleaning up PlayerStats:', error);
      const errData = error.response ? error.response.data : { message: 'Cleanup failed' };
      setResult({ error: errData.message || 'Cleanup failed', ...errData });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="tool-card-bg border-0 elegant-shadow hover:shadow-xl transition-all duration-300 cursor-pointer group" onClick={handleCleanup}>
      <CardHeader>
        <CardTitle className="main-text flex items-center gap-3 group-hover:text-[#f26222] transition-colors">
          <Users className="w-6 h-6" />
          Cleanup PlayerStats
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="main-text opacity-70">Cleaning up orphaned records...</p>
        ) : result ? (
          <div className="space-y-2">
            {result.error ? (
              <p className="text-sm text-red-600">{result.error}</p>
            ) : (
              <>
                <p className="text-sm main-text">
                  <strong>Orphaned deleted:</strong> {result.details?.orphanedDeleted || 0}
                </p>
                <p className="text-sm main-text">
                  <strong>Duplicates deleted:</strong> {result.details?.duplicatesDeleted || 0}
                </p>
                <p className="text-sm main-text">
                  <strong>Total records processed:</strong> {result.details?.totalPlayerStats || 0}
                </p>
              </>
            )}
            <p className="text-xs main-text opacity-50">
              Last run: {new Date().toLocaleTimeString()}
            </p>
          </div>
        ) : (
          <p className="main-text opacity-70">Remove orphaned and duplicate PlayerStats records that don't have corresponding users.</p>
        )}
      </CardContent>
    </Card>
  );
}

function TestDailyKeyCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleTest = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const { testDailyKey } = await import('@/functions/testDailyKey');
      const response = await testDailyKey();
      setResult(response.data);
    } catch (error) {
      console.error('Error testing Daily key:', error);
      const errData = error.response ? error.response.data : { message: 'Test failed' };
      setResult({ error: errData.message || 'Test failed', ...errData });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="tool-card-bg border-0 elegant-shadow hover:shadow-xl transition-all duration-300 cursor-pointer group" onClick={handleTest}>
      <CardHeader>
        <CardTitle className="main-text flex items-center gap-3 group-hover:text-[#f26222] transition-colors">
          <Video className="w-6 h-6" />
          Test Daily.co API Key
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="main-text opacity-70">Testing API key...</p>
        ) : result ? (
          <div className="space-y-2">
            <p className="text-sm main-text">
              <strong>Key Exists:</strong> {result.keyExists ? 'Yes' : 'No'}
            </p>
            <p className={`text-sm font-bold ${result.isValid ? 'text-green-600' : 'text-red-600'}`}>
              <strong>API Authentication:</strong> {result.isValid ? 'Successful' : 'Failed'}
            </p>
            {result.status && (
                 <p className="text-sm main-text">
                    <strong>API Status:</strong> {result.status}
                </p>
            )}
            {result.apiResponse && result.apiResponse.info && (
                 <p className="text-sm main-text">
                    <strong>API Version:</strong> {result.apiResponse.info.version}
                </p>
            )}
            {result.error && !result.isValid && (
              <p className="text-sm text-red-600">{result.error || 'The API key is not valid.'}</p>
            )}
            <p className="text-xs main-text opacity-50">
              Last tested: {new Date(result.timestamp).toLocaleTimeString()}
            </p>
          </div>
        ) : (
          <p className="main-text opacity-70">Click to perform a live test of the Daily.co API key.</p>
        )}
      </CardContent>
    </Card>
  );
}

function SyncProfilePicturesCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const { User } = await import('@/entities/User');
      const { PlayerStats } = await import('@/entities/PlayerStats');

      const allUsers = await User.list();
      const allPlayerStats = await PlayerStats.list();

      let updatedCount = 0;

      for (const playerStat of allPlayerStats) {
        const correspondingUser = allUsers.find(u => u.id === playerStat.user_id);
        if (correspondingUser && correspondingUser.profile_picture_url && correspondingUser.profile_picture_url !== playerStat.profile_picture_url) {
          await PlayerStats.update(playerStat.id, {
            profile_picture_url: correspondingUser.profile_picture_url
          });
          updatedCount++;
        }
      }

      setLastSync(new Date().toLocaleTimeString());
      alert(`Success! Updated ${updatedCount} profile pictures.`);

    } catch (error) {
      console.error('Error syncing profile pictures:', error);
      alert(`Failed to sync profile pictures: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="tool-card-bg border-0 elegant-shadow hover:shadow-xl transition-all duration-300 cursor-pointer group" onClick={handleSync}>
      <CardHeader>
        <CardTitle className="main-text flex items-center gap-3 group-hover:text-[#f26222] transition-colors">
          <UserIcon className="w-6 h-6" />
          Sync Profile Pictures
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="main-text opacity-70">
          {isLoading ? 'Syncing profile pictures...' : 'Update PlayerStats records with current profile pictures from User records.'}
        </p>
        {lastSync && (
          <p className="text-sm main-text opacity-50 mt-2">Last synced: {lastSync}</p>
        )}
      </CardContent>
    </Card>
  );
}
