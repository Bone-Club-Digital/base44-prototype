
import React, { useState, useEffect } from 'react';
import { useUser } from '../auth/UserProvider';
import { ClubMember } from '@/entities/ClubMember';
import { Message } from '@/entities/Message';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, UserMinus, LogOut, Shield, RefreshCw, Award, Star, Trophy, TrendingUp, Dices } from 'lucide-react';
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

const icons = { TrendingUp, Dices, Users, Trophy, Shield, Award, Star };

const BadgeDisplay = ({ badge }) => {
  if (!badge) return null;
  const IconComponent = icons[badge.icon] || icons.Award; // Fallback to Award if icon name is not found
  
  // Handle both hex colors and Tailwind class names
  const getBackgroundColor = (colorValue) => {
    // If it's already a hex color, use it directly
    if (colorValue && colorValue.startsWith('#')) {
      return colorValue;
    }
    
    // Otherwise, try to map from Tailwind classes (for backward compatibility)
    const colorMap = {
      'bg-blue-500': '#3b82f6',
      'bg-green-500': '#10b981',
      'bg-red-500': '#ef4444',
      'bg-yellow-500': '#f59e0b',
      'bg-purple-500': '#8b5cf6',
      'bg-pink-500': '#ec4899',
      'bg-indigo-500': '#6366f1',
      'bg-gray-500': '#6b7280',
      'bg-orange-500': '#f97316',
      'bg-teal-500': '#14b8a6',
    };
    
    // Try to extract the color from the class string
    const match = colorValue?.match(/bg-(\w+-\d+)/);
    if (match) {
      const fullClass = `bg-${match[1]}`;
      return colorMap[fullClass] || '#6b7280'; // fallback to gray if class found but not in map
    }
    
    return '#6b7280'; // default fallback if no class match
  };

  return (
    <div 
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-white text-xs font-medium"
      style={{ backgroundColor: getBackgroundColor(badge.color) }}
      title={badge.description}
    >
      <IconComponent className="w-3 h-3" />
      <span>{badge.name}</span>
    </div>
  );
};

export default function ClubMembersList({ club, clubMembers, playerStats, userBadges, badges, isAdmin, onMemberUpdate, onLeaveClub }) {
  const { user } = useUser();
  const [members, setMembers] = useState([]);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    if (!clubMembers || !playerStats || !club) {
      setMembers([]); // Ensure members state is empty if data is not ready
      return;
    }

    // Combine member data with stats
    const enrichedMembers = clubMembers.map(member => {
      const stats = playerStats.find(s => s.user_id === member.user_id);
      return {
        ...member,
        profile_picture_url: stats?.profile_picture_url,
        rating: stats?.rating || 1500
      };
    });

    // Sort members: admin first, then by join date
    enrichedMembers.sort((a, b) => {
      const aIsAdmin = club.admin_id === a.user_id || (club.admin_ids && club.admin_ids.includes(a.user_id));
      const bIsAdmin = club.admin_id === b.user_id || (club.admin_ids && club.admin_ids.includes(b.user_id));
      
      if (aIsAdmin && !bIsAdmin) return -1;
      if (!aIsAdmin && bIsAdmin) return 1;
      return new Date(a.created_date) - new Date(b.created_date);
    });

    setMembers(enrichedMembers);
  }, [club, clubMembers, playerStats]); // Dependencies: Re-run when club, clubMembers, or playerStats change

  const handleRemoveMember = async (member) => {
    if (!window.confirm(`Are you sure you want to remove ${member.username} from the club?`)) {
      return;
    }

    setActionLoading(`remove-${member.id}`);
    try {
      await ClubMember.delete(member.id);
      
      // Send notification to removed member
      await Message.create({
        sender_id: 'system',
        sender_username: 'Bone Club',
        recipient_id: member.user_id,
        recipient_username: member.username,
        type: 'notification',
        subject: `Removed from ${club.name}`,
        body: `You have been removed from the club "${club.name}" by a club administrator.`,
        status: 'unread',
        club_id: club.id,
        club_name: club.name
      });

      if (onMemberUpdate) onMemberUpdate(); // Notify parent to re-fetch members
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Failed to remove member. Please try again.");
    } finally {
      setActionLoading('');
    }
  };

  const handleLeaveClub = async () => {
    if (!window.confirm(`Are you sure you want to leave ${club.name}?`)) {
      return;
    }

    setActionLoading(`leave-${user.id}`);
    try {
      const myMembership = members.find(m => m.user_id === user.id);
      if (!myMembership) {
        alert("Could not find your membership in this club.");
        return;
      }

      await ClubMember.delete(myMembership.id);

      // Send notification to admin
      const adminMessage = {
        sender_id: user.id,
        sender_username: user.username,
        recipient_id: club.admin_id,
        type: 'notification',
        subject: `Member Left Club: ${club.name}`,
        body: `${user.username} has left the club "${club.name}".`,
        status: 'unread',
        club_id: club.id,
        club_name: club.name
      };

      // Find admin username for the message
      const adminMember = members.find(m => m.user_id === club.admin_id);
      if (adminMember) {
        adminMessage.recipient_username = adminMember.username;
      }

      await Message.create(adminMessage);

      // Trigger success notification and navigate away
      if (onLeaveClub) {
        onLeaveClub(club.name);
      }
    } catch (error) {
      console.error("Error leaving club:", error);
      alert("Failed to leave club. Please try again.");
    } finally {
      setActionLoading('');
    }
  };

  // If clubMembers are not yet provided, show a loading state
  if (!clubMembers) {
    return (
      <Card className="tool-card-bg border-0 elegant-shadow">
        <CardContent className="flex items-center justify-center p-12">
          <RefreshCw className="w-6 h-6 animate-spin main-text" />
        </CardContent>
      </Card>
    );
  }

  // Create badge map for efficient lookup
  const badgeMap = new Map(badges?.map(b => [b.id, b]) || []);

  return (
    <Card className="tool-card-bg border-0 elegant-shadow">
      <CardHeader>
        <CardTitle className="main-text uppercase flex items-center gap-3">
          <Users className="w-6 h-6" />
          Club Members ({members.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.length > 0 ? (
          <div className="space-y-3">
            {members.map(member => {
              const memberIsAdmin = club.admin_id === member.user_id || (club.admin_ids && club.admin_ids.includes(member.user_id));
              const isCurrentUser = user && member.user_id === user.id;
              const canRemove = isAdmin && !memberIsAdmin && !isCurrentUser;
              const canLeave = isCurrentUser && !memberIsAdmin;

              // Get member's badges
              const memberBadges = userBadges?.filter(ub => ub.user_id === member.user_id) || [];

              return (
                <div key={member.id} className="flex items-center justify-between p-4 rounded-lg bg-white/30">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={member.profile_picture_url} alt={member.username} className="object-cover" />
                      <AvatarFallback style={{ backgroundColor: '#5a3217', color: '#e5e4cd' }}>
                        {member.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold main-text">{member.username}</p>
                        {memberIsAdmin && (
                          <Badge className="bg-yellow-500 text-white text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <p className="text-sm main-text opacity-70 mb-2">★{member.rating}</p>
                      
                      {/* Display member badges */}
                      {memberBadges.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {memberBadges.map(userBadge => {
                            const badge = badgeMap.get(userBadge.badge_id);
                            return badge ? (
                              <BadgeDisplay key={userBadge.id} badge={badge} />
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {canLeave && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading === `leave-${user.id}`}
                            className="text-red-600 hover:text-red-700"
                          >
                            {actionLoading === `leave-${user.id}` ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <LogOut className="w-4 h-4 mr-1" />
                                Leave Club
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent style={{ backgroundColor: '#e5e4cd' }}>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="main-text">Leave Club</AlertDialogTitle>
                            <AlertDialogDescription className="main-text">
                              Are you sure you want to leave "{club.name}"? This action cannot be undone and you'll need to be re-invited to rejoin.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleLeaveClub}
                              style={{ backgroundColor: '#dc2626', color: 'white' }}
                            >
                              Leave Club
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {canRemove && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading === `remove-${member.id}`}
                            className="text-red-600 hover:text-red-700"
                          >
                            {actionLoading === `remove-${member.id}` ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <UserMinus className="w-4 h-4 mr-1" />
                                Remove
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent style={{ backgroundColor: '#e5e4cd' }}>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="main-text">Remove Member</AlertDialogTitle>
                            <AlertDialogDescription className="main-text">
                              Are you sure you want to remove {member.username} from the club? They will be notified of this action.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveMember(member)}
                              style={{ backgroundColor: '#dc2626', color: 'white' }}
                            >
                              Remove Member
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-8">
            <Users className="w-12 h-12 main-text opacity-50 mx-auto mb-3" />
            <p className="main-text opacity-70">No active members in this club.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
