
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Club } from '@/entities/Club';
import { ClubMember } from '@/entities/ClubMember';
import { Badge as BadgeEntity } from '@/entities/Badge';
import { UserBadge } from '@/entities/UserBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, Users, Shield, Award, Check, X, Plus, Star, Dices, Trophy, TrendingUp, Search, UserMinus, Crown, UserPlus } from 'lucide-react';
import InviteMemberModal from '../components/clubs/InviteMemberModal';
import AssignBadgesModal from '../components/clubs/AssignBadgesModal';
import SuccessNotification from '../components/notifications/SuccessNotification';

// Badge display component for consistency
const icons = { TrendingUp, Dices, Users, Trophy, Shield, Award, Star };
const BadgeDisplay = ({ badge, onRemove, userBadgeId }) => {
    if (!badge) return null;
    const IconComponent = icons[badge.icon] || icons.Award;
    return (
        <div className={`inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-full text-white text-xs font-medium ${badge.color}`} title={badge.description}>
            <IconComponent className="w-3 h-3" />
            <span>{badge.name}</span>
            <button onClick={() => onRemove(userBadgeId)} className="ml-1 p-0.5 rounded-full hover:bg-black/20">
              <X className="w-3 h-3" />
            </button>
        </div>
    );
};

export default function ManageMembersPage() {
  const { user, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const clubId = new URLSearchParams(location.search).get('club_id');

  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [badges, setBadges] = useState([]);
  const [userBadges, setUserBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assigningBadge, setAssigningBadge] = useState({});
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAssignBadgesModal, setShowAssignBadgesModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLetter, setSelectedLetter] = useState('All');
  const [sortOrder, setSortOrder] = useState('asc');
  const [successMessage, setSuccessMessage] = useState('');

  // Use a single isLoading state for all actions
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!clubId) {
      setError("No Club ID provided.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const clubData = await Club.get(clubId);
      if (!clubData) throw new Error("Club not found.");
      setClub(clubData);
      
      const membersData = await ClubMember.filter({ club_id: clubId });
      setMembers(membersData || []);

    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch management data:", err);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    if (!userLoading && user) {
      fetchData();
    }
  }, [userLoading, user, fetchData]);

  useEffect(() => {
    const fetchBadgeData = async () => {
      try {
        const [allBadges, allUserBadges] = await Promise.all([
          BadgeEntity.list(),
          UserBadge.list()
        ]);
        
        const clubAdminBadges = allBadges.filter(badge => badge.category === 'club_admin');
        setBadges(clubAdminBadges);
        setUserBadges(allUserBadges);
      } catch (error) {
        console.error('Error fetching badge data:', error);
      }
    };

    if (user && club) {
      fetchBadgeData();
    }
  }, [user, club]);

  const handleMemberStatusChange = async (memberId, status) => {
    setIsLoading(true);
    const member = members.find(m => m.id === memberId);
    if (!member) {
        setIsLoading(false);
        return;
    }
    try {
      if (status === 'active') {
        await ClubMember.update(memberId, { status: 'active' });
        setSuccessMessage(`${member.username} has been approved and is now an active member.`);
      } else {
        await ClubMember.delete(memberId);
        setSuccessMessage(`The request from ${member.username} has been successfully declined.`);
      }
      fetchData();
    } catch (err) {
      alert(`Failed to update member: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!window.confirm(`Are you sure you want to remove ${member.username} from the club? This action cannot be undone.`)) {
      return;
    }
    setIsLoading(true);
    try {
      await ClubMember.delete(member.id);
      
      // Send notification to the removed member
      const { Message } = await import('@/entities/Message');
      await Message.create({
        sender_id: 'system',
        sender_username: 'Bone Club',
        recipient_id: member.user_id,
        recipient_username: member.username,
        type: 'notification',
        subject: `Removed from ${club.name}`,
        body: `You have been removed from the club "${club.name}" by an administrator.`,
        status: 'unread',
        related_entity_type: 'ClubMemberRemoval',
        club_name: club.name,
        club_id: club.id
      });
      
      setSuccessMessage(`${member.username} has been removed from the club.`);
      fetchData();
    } catch (err) {
      alert(`Failed to remove member: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBadgeAssignmentComplete = async () => {
    setIsLoading(true);
    try {
      const allUserBadges = await UserBadge.list();
      setUserBadges(allUserBadges);
    } catch (error) {
      console.error('Error refreshing user badges:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignBadge = async (memberUserId) => {
    const badgeId = assigningBadge[memberUserId];
    if (!badgeId) {
      alert("Please select a badge to assign.");
      return;
    }
    setIsLoading(true);
    try {
      await UserBadge.create({
        user_id: memberUserId,
        badge_id: badgeId,
        assigned_by_id: user.id
      });
      handleBadgeAssignmentComplete();
      setAssigningBadge(prev => ({...prev, [memberUserId]: ''}));
    } catch (err) {
      alert(`Failed to assign badge: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveUserBadge = async (userBadgeId) => {
    if (window.confirm("Are you sure you want to remove this badge from the member?")) {
      setIsLoading(true);
      try {
        await UserBadge.delete(userBadgeId);
        handleBadgeAssignmentComplete();
      } catch (err) {
        alert(`Failed to remove badge: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleMakeAdmin = async (member) => {
    if (!window.confirm(`Are you sure you want to make ${member.username} an admin? They will have full administrative privileges for this club.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const currentAdminIds = Array.isArray(club.admin_ids) ? [...club.admin_ids] : (club.admin_id ? [club.admin_id] : []);
      
      if (!currentAdminIds.includes(member.user_id)) {
        const updatedAdminIds = [...currentAdminIds, member.user_id];
        
        await Club.update(club.id, {
          admin_ids: updatedAdminIds
        });

        setSuccessMessage(`${member.username} is now an admin of ${club.name}.`);
        fetchData();
      } else {
        alert(`${member.username} is already an admin of this club.`);
      }
    } catch (error) {
      console.error('Error making member admin:', error);
      alert('Failed to make member admin. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAdmin = async (member) => {
    if (member.user_id === club.admin_id) {
      alert('Cannot remove the primary admin. The primary admin role must be transferred to another member first.');
      return;
    }

    if (!window.confirm(`Are you sure you want to remove admin privileges from ${member.username}?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const currentAdminIds = Array.isArray(club.admin_ids) ? [...club.admin_ids] : (club.admin_id ? [club.admin_id] : []);
      const updatedAdminIds = currentAdminIds.filter(id => id !== member.user_id);
      
      await Club.update(club.id, {
        admin_ids: updatedAdminIds
      });

      setSuccessMessage(`${member.username} is no longer an admin of ${club.name}.`);
      fetchData();
    } catch (error) {
      console.error('Error removing admin privileges:', error);
      alert('Failed to remove admin privileges. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInviteModalClose = () => {
    setShowInviteModal(false);
    fetchData(); // Refresh members list after invites are sent
  };

  const handleInviteSent = (results) => {
    setShowInviteModal(false);
    fetchData(); // Refresh members list after invites are sent
    
    // Show success notification
    if (results && results.sent && results.sent.length > 0) {
      const invitedNames = results.sent.join(', ');
      const message = results.sent.length === 1 
        ? `Invitation sent to ${invitedNames}.`
        : `Invitations sent to ${invitedNames}.`;
      setSuccessMessage(message);
    }
  };

  const handleLetterSelect = (letter) => {
    setSelectedLetter(letter);
    setSearchTerm('');
  };
  
  const availableLetters = useMemo(() => {
    const letters = new Set();
    members.forEach(member => {
      if (member.username) {
        letters.add(member.username[0].toUpperCase());
      }
    });
    return Array.from(letters).sort();
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members
      .filter(member => {
        if (selectedLetter !== 'All' && (!member.username || member.username[0].toUpperCase() !== selectedLetter)) {
          return false;
        }
        if (searchTerm && (!member.username || !member.username.toLowerCase().includes(searchTerm.toLowerCase()))) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aValue = a.username || '';
        const bValue = b.username || '';
        const comparison = aValue.localeCompare(bValue, undefined, { sensitivity: 'base' });
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [members, selectedLetter, searchTerm, sortOrder]);
  
  if (loading || userLoading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}><RefreshCw className="w-12 h-12 animate-spin main-text" /></div>;
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4" style={{ backgroundColor: '#e5e4cd' }}>
        <div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">{error}</h2>
          <Button onClick={() => navigate(createPageUrl(`ClubDetails?id=${clubId}`))}>
            <ArrowLeft className="w-4 h-4 mr-2"/> Back to Club
          </Button>
        </div>
      </div>
    );
  }

  if (!user || !club) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <RefreshCw className="w-12 h-12 animate-spin main-text" />
      </div>
    );
  }

  const isCurrentUserAdmin = club.admin_id === user.id || (Array.isArray(club.admin_ids) && club.admin_ids.includes(user.id));

  if (!isCurrentUserAdmin && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4" style={{ backgroundColor: '#e5e4cd' }}>
        <div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">You are not an administrator of this club.</h2>
          <Button onClick={() => navigate(createPageUrl(`ClubDetails?id=${clubId}`))}>
            <ArrowLeft className="w-4 h-4 mr-2"/> Back to Club
          </Button>
        </div>
      </div>
    );
  }

  const pendingMembers = filteredMembers.filter(m => m.status === 'pending');
  const activeMembers = filteredMembers.filter(m => m.status === 'active');
  const badgeMap = new Map(badges.map(b => [b.id, b]));

  const isMemberAdmin = (memberId) => {
    return memberId === club.admin_id || (Array.isArray(club.admin_ids) && club.admin_ids.includes(memberId));
  };

  const MemberList = ({ list, isPending = false }) => (
    <div className="space-y-4">
      {list.length === 0 ? (
        <p className="text-center py-8 main-text opacity-70">
          {isPending ? "No pending requests." : "No active members."}
        </p>
      ) : (
        list.map(member => {
          const membersBadges = userBadges.filter(ub => ub.user_id === member.user_id);
          const memberHasBadgeIds = new Set(membersBadges.map(mb => mb.badge_id));
          const availableBadgesToAssign = badges.filter(b => !memberHasBadgeIds.has(b.id));
          const memberIsAdmin = isMemberAdmin(member.user_id);
          const isPrimaryAdmin = member.user_id === club.admin_id;

          return (
            <Card key={member.id} className="bg-white/30 border-0">
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-bold main-text text-lg">{member.username}</p>
                      {isPrimaryAdmin && (
                        <Badge className="bg-yellow-600 text-white">Primary Admin</Badge>
                      )}
                      {memberIsAdmin && !isPrimaryAdmin && (
                        <Badge className="bg-blue-600 text-white">Admin</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isPending ? (
                      <>
                        <Button size="sm" onClick={() => handleMemberStatusChange(member.id, 'active')} style={{ backgroundColor: '#007e81', color: 'white' }} disabled={isLoading}>
                          <Check className="w-4 h-4 mr-2" />Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleMemberStatusChange(member.id, 'declined')} disabled={isLoading}>
                          <X className="w-4 h-4 mr-2" />Decline
                        </Button>
                      </>
                    ) : (
                      isCurrentUserAdmin && (
                        <>
                          {!memberIsAdmin ? (
                            <Button
                              size="sm"
                              onClick={() => handleMakeAdmin(member)}
                              className="flex items-center gap-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                              disabled={isLoading}
                            >
                              <Crown className="w-4 h-4" />
                              Make Admin
                            </Button>
                          ) : !isPrimaryAdmin && (
                            <Button
                              size="sm"
                              onClick={() => handleRemoveAdmin(member)}
                              className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white"
                              disabled={isLoading}
                            >
                              <Crown className="w-4 h-4" />
                              Remove Admin
                            </Button>
                          )}
                          {!isPrimaryAdmin && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveMember(member)}
                              disabled={isLoading}
                            >
                              <UserMinus className="w-4 h-4 mr-2" />Remove Member
                            </Button>
                          )}
                        </>
                      )
                    )}
                  </div>
                </div>

                {!isPending && (
                  <div>
                    <h4 className="font-semibold main-text text-sm mb-2">Badges</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {membersBadges.length > 0 ? (
                        membersBadges.map(userBadge => (
                           <BadgeDisplay 
                              key={userBadge.id}
                              userBadgeId={userBadge.id}
                              badge={badgeMap.get(userBadge.badge_id)}
                              onRemove={handleRemoveUserBadge}
                           />
                        ))
                      ) : (
                        <p className="text-xs main-text opacity-70">No badges assigned.</p>
                      )}
                    </div>

                    <h4 className="font-semibold main-text text-sm mb-2">Assign New Badge</h4>
                     {availableBadgesToAssign.length > 0 ? (
                      <div className="flex items-center gap-2">
                          <Select 
                            value={assigningBadge[member.user_id] || ''}
                            onValueChange={(value) => setAssigningBadge(prev => ({...prev, [member.user_id]: value}))}
                            disabled={isLoading}
                          >
                            <SelectTrigger className="flex-grow">
                              <SelectValue placeholder="Select a badge..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableBadgesToAssign.map(badge => (
                                <SelectItem key={badge.id} value={badge.id}>{badge.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        <Button size="sm" onClick={() => handleAssignBadge(member.user_id)} disabled={isLoading}><Plus className="w-4 h-4 mr-2" />Assign</Button>
                      </div>
                    ) : (
                        <p className="text-xs main-text opacity-70">Member has all available badges.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
      <div className="max-w-4xl mx-auto">
        <Link to={createPageUrl(`ClubDetails?id=${clubId}`)} className="inline-flex items-center gap-2 text-[#5a3217] hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Club
        </Link>

        <SuccessNotification
          title="Action Successful"
          message={successMessage}
          onClose={() => setSuccessMessage('')}
        />
        
        <Card className="tool-card-bg border-0 elegant-shadow mb-6">
          <CardHeader>
            <CardTitle className="main-text flex items-center gap-3">
              <Users className="w-5 h-5" />
              <div>
                Admin Controls
                <p className="text-lg font-normal opacity-80">{club?.name}</p>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="tool-card-bg border-0 elegant-shadow mb-8">
          <CardHeader>
            <CardTitle className="main-text flex items-center gap-3">
              <Shield className="w-6 h-6" />
              Admin Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={() => setShowInviteModal(true)} style={{ backgroundColor: '#007e81', color: 'white' }} className="w-full flex items-center gap-2" disabled={isLoading}>
              <UserPlus className="w-4 h-4" /> Invite Members
            </Button>
            <Button onClick={() => setShowAssignBadgesModal(true)} style={{ backgroundColor: '#007e81', color: 'white' }} className="w-full flex items-center gap-2" disabled={isLoading}>
                <Award className="w-4 h-4" /> Assign Badges
            </Button>
            <Button onClick={() => navigate(createPageUrl(`ClubDetails?id=${clubId}`))} style={{ backgroundColor: '#007e81', color: 'white' }} className="w-full flex items-center gap-2" disabled={isLoading}>
                <ArrowLeft className="w-4 h-4" /> Back to Club Details
            </Button>
          </CardContent>
        </Card>
        
        <Card className="tool-card-bg border-0 elegant-shadow mb-6">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center space-x-1 overflow-x-auto pb-2">
              <Button
                variant={selectedLetter === 'All' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleLetterSelect('All')}
                style={selectedLetter === 'All' ? { backgroundColor: '#5a3217', color: '#e5e4cd' } : {}}
                className="flex-shrink-0"
                disabled={isLoading}
              >
                All
              </Button>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                <Button
                  key={letter}
                  variant={selectedLetter === letter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLetterSelect(letter)}
                  disabled={!availableLetters.includes(letter) || isLoading}
                  className="w-8 h-8 p-0 flex-shrink-0"
                  style={
                    selectedLetter === letter 
                        ? { backgroundColor: '#5a3217', color: '#e5e4cd' } 
                        : !availableLetters.includes(letter) 
                            ? { opacity: 0.5, cursor: 'not-allowed' } 
                            : {}
                  }
                >
                  {letter}
                </Button>
              ))}
            </div>
            <div className="flex-grow relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Search members by username..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedLetter('All');
                }}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card className="tool-card-bg border-0 elegant-shadow">
          <CardContent className="p-4">
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active" disabled={isLoading}>Active ({activeMembers.length})</TabsTrigger>
                <TabsTrigger value="pending" disabled={isLoading}>Pending ({pendingMembers.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="active" className="pt-4">
                <MemberList 
                  list={activeMembers} 
                />
              </TabsContent>
              <TabsContent value="pending" className="pt-4">
                <MemberList 
                  list={pendingMembers} 
                  isPending 
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <InviteMemberModal 
          isOpen={showInviteModal} 
          onClose={() => setShowInviteModal(false)}
          club={club}
          onInviteSent={handleInviteSent} 
        />

        <AssignBadgesModal
          isOpen={showAssignBadgesModal}
          onClose={() => setShowAssignBadgesModal(false)}
          members={members}
          clubBadges={badges}
          userBadges={userBadges}
          onAssignmentComplete={handleBadgeAssignmentComplete}
        />
      </div>
    </div>
  );
}
