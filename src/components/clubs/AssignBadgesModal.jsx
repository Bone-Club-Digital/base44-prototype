import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge as BadgeEntity } from '@/entities/Badge';
import { UserBadge } from '@/entities/UserBadge';
import { useUser } from '../auth/UserProvider';
import { Award, Dices, Shield, TrendingUp, Trophy, Users } from 'lucide-react';

const icons = { TrendingUp, Dices, Users, Trophy, Shield, Award };

// A simple component to render a badge for the select list
const BadgeDisplay = ({ name, icon, color }) => {
    const IconComponent = icons[icon] || icons.Award;
    return (
        <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-5 h-5 rounded-full text-white ${color}`}>
                <IconComponent className="w-3 h-3" />
            </div>
            <span>{name}</span>
        </div>
    );
};

export default function AssignBadgesModal({ isOpen, onClose, members, clubBadges, userBadges, onAssignmentComplete }) {
  const { user: adminUser } = useUser();
  const [availableBadges, setAvailableBadges] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedBadgeId, setSelectedBadgeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchBadges = async () => {
        setLoading(true);
        setError('');
        try {
          const allBadges = await BadgeEntity.list();
          // Filter to only show badges that club admins can award
          const awardableBadges = allBadges.filter(b => b.category === 'club_admin');
          setAvailableBadges(awardableBadges);
        } catch (err) {
          console.error("Failed to fetch badges:", err);
          setError("Could not load available badges.");
        } finally {
          setLoading(false);
        }
      };
      fetchBadges();
    } else {
      setSelectedMemberId('');
      setSelectedBadgeId('');
      setError('');
    }
  }, [isOpen]);

  // Get available badges for selected member (exclude ones they already have)
  const getAvailableBadgesForMember = () => {
    if (!selectedMemberId) return availableBadges;
    
    const memberBadgeIds = new Set(
      userBadges
        .filter(ub => ub.user_id === selectedMemberId)
        .map(ub => ub.badge_id)
    );
    
    return availableBadges.filter(badge => !memberBadgeIds.has(badge.id));
  };

  const selectedMember = members.find(m => m.user_id === selectedMemberId);
  const availableBadgesForMember = getAvailableBadgesForMember();

  const handleAssignBadge = async () => {
    if (!selectedMemberId || !selectedBadgeId || !adminUser) {
      setError("Please select both a member and a badge to assign.");
      return;
    }

    setSending(true);
    setError('');

    try {
      await UserBadge.create({
        user_id: selectedMemberId,
        badge_id: selectedBadgeId,
        assigned_by_id: adminUser.id,
      });

      alert("Badge assigned successfully!");
      if (onAssignmentComplete) {
        onAssignmentComplete();
      }
      onClose();
    } catch (e) {
      console.error("Failed to assign badge:", e);
      setError("An error occurred while assigning the badge.");
    } finally {
      setSending(false);
    }
  };

  // Filter active members only
  const activeMembers = members.filter(m => m.status === 'active');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]" style={{ backgroundColor: '#5a3217', color: 'white' }}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-white uppercase">Assign Badge</DialogTitle>
          <DialogDescription className="text-bone-color-faded">
            Select a member and award them a badge for their achievements.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-bone-color mb-2">Select Member</label>
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger className="w-full bg-[#e5e4cd] text-[#5a3217] border-transparent focus:ring-[#5a3217]">
                <SelectValue placeholder="Choose a member..." />
              </SelectTrigger>
              <SelectContent>
                {activeMembers.length > 0 ? (
                  activeMembers.map(member => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.username}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-members" disabled>No active members available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedMemberId && (
            <div>
              <label className="block text-sm font-medium text-bone-color mb-2">Select Badge</label>
              <Select value={selectedBadgeId} onValueChange={setSelectedBadgeId}>
                <SelectTrigger className="w-full bg-[#e5e4cd] text-[#5a3217] border-transparent focus:ring-[#5a3217]">
                  <SelectValue placeholder={loading ? "Loading badges..." : "Select a badge to award"} />
                </SelectTrigger>
                <SelectContent>
                  {loading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : availableBadgesForMember.length > 0 ? (
                    availableBadgesForMember.map(badge => (
                      <SelectItem key={badge.id} value={badge.id}>
                        <BadgeDisplay {...badge} />
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-badges" disabled>
                      {selectedMember ? `${selectedMember.username} has all available badges` : 'No badges available'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-bone-color border-bone-color hover:bg-white/10">
            Cancel
          </Button>
          <Button
            onClick={handleAssignBadge}
            disabled={!selectedMemberId || !selectedBadgeId || sending || loading}
            style={{ backgroundColor: '#f26222', color: 'white' }}
          >
            {sending ? 'Assigning...' : 'Assign Badge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}