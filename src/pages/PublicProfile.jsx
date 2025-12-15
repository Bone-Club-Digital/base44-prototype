
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlayerStats } from '@/entities/PlayerStats';
import { Badge as BadgeEntity } from '@/entities/Badge';
import { UserBadge } from '@/entities/UserBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, User as UserIcon, Trophy, Star, TrendingUp, Dices, Users, Shield, Award } from 'lucide-react';

// Define a map of icons available for badges
const icons = { TrendingUp, Dices, Users, Trophy, Shield, Award };

const BadgeDisplay = ({ badge }) => {
    if (!badge) return null;
    const IconComponent = icons[badge.icon] || icons.Award;
    
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
        
        // Extract the Tailwind color class, e.g., 'bg-blue-500' from 'bg-blue-500'
        const match = colorValue?.match(/bg-[a-zA-Z]+-\d+/);
        if (match) {
            const fullClass = match[0];
            return colorMap[fullClass] || '#6b7280'; // Fallback to gray if not in map
        }
        
        return '#6b7280'; // default fallback for invalid or no color value
    };
    
    return (
        <div 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-xs font-medium"
            style={{ backgroundColor: getBackgroundColor(badge.color) }}
            title={badge.description}
        >
            <IconComponent className="w-3 h-3" />
            <span>{badge.name}</span>
        </div>
    );
};

export default function PublicProfilePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [badges, setBadges] = useState([]);
  const [userBadges, setUserBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get username from URL params
  const urlParams = new URLSearchParams(location.search);
  const username = urlParams.get('username');

  const fetchPublicProfile = useCallback(async () => {
    try {
      setLoading(true);
      
      // First, find the player stats by username
      const playerStatsResults = await PlayerStats.filter({ username: username });
      if (playerStatsResults.length === 0) {
        setError('Profile not found');
        setLoading(false);
        return;
      }

      const stats = playerStatsResults[0];
      setPlayerStats(stats);

      // Check if profile is public
      if (!stats.public_profile) {
        setError('This profile is private');
        setLoading(false);
        return;
      }

      // Get all badges and user badge assignments
      const [badgeTypesResult, userBadgesResult] = await Promise.allSettled([
        BadgeEntity.list(),
        UserBadge.list()
      ]);

      setBadges(badgeTypesResult.status === 'fulfilled' ? badgeTypesResult.value : []);
      setUserBadges(userBadgesResult.status === 'fulfilled' ? userBadgesResult.value : []);

    } catch (error) {
      console.error('Error fetching public profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [username, setError, setLoading, setPlayerStats, setBadges, setUserBadges]); // Add all state setters as dependencies for useCallback

  useEffect(() => {
    if (!username) {
      setError('No username provided');
      setLoading(false);
      return;
    }
    
    fetchPublicProfile();
  }, [username, fetchPublicProfile]);

  const getUserInitials = () => {
    if (username) {
      return username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getWinRate = () => {
    if (!playerStats || playerStats.games_played === 0) return 0;
    return Math.round((playerStats.games_won / playerStats.games_played) * 100);
  };

  // Create a map for quick badge lookup
  const badgeMap = new Map();
  badges.forEach(b => badgeMap.set(b.id, b));

  // Get assigned badges for this user
  const assignedBadgeIds = userBadges.filter(ub => ub.user_id === playerStats?.user_id).map(ub => ub.badge_id);
  const assignedBadges = assignedBadgeIds.map(id => badgeMap.get(id)).filter(Boolean);

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <Card className="tool-card-bg border-0 elegant-shadow text-center p-8">
          <UserIcon className="w-16 h-16 main-text opacity-50 mx-auto mb-4" />
          <h2 className="text-2xl font-bold main-text mb-2">{error}</h2>
          <p className="main-text opacity-70 mb-6">The profile you're looking for may not exist or is set to private.</p>
          <Button onClick={() => navigate(-1)} style={{ backgroundColor: '#007e81', color: 'white' }}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button 
            onClick={() => navigate(-1)} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold main-text">{username}'s Profile</h1>
          <p className="main-text opacity-70 mt-2">Public member profile</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Picture and Basic Info */}
          <div className="lg:col-span-1">
            <Card className="tool-card-bg border-0 elegant-shadow">
              <CardContent className="p-6 text-center">
                <Avatar className="w-32 h-32 mx-auto mb-4">
                  <AvatarImage 
                    src={playerStats?.profile_picture_url} 
                    alt={username}
                    className="object-cover"
                  />
                  <AvatarFallback 
                    className="text-2xl font-bold"
                    style={{ backgroundColor: '#5a3217', color: '#e5e4cd' }}
                  >
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                
                <h2 className="text-xl font-bold main-text mb-4">{username}</h2>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-lg main-text">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <span className="font-bold">{playerStats?.rating || 1500}</span>
                    <span className="text-sm opacity-70">Rating</span>
                  </div>
                </div>

                {/* Display assigned badges */}
                {assignedBadges.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {assignedBadges.map(badge => (
                      <BadgeDisplay key={badge.id} badge={badge} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Statistics */}
          <div className="lg:col-span-2">
            <Card className="tool-card-bg border-0 elegant-shadow">
              <CardHeader>
                <CardTitle className="main-text flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Game Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold main-text">{playerStats?.rating || 1500}</div>
                    <div className="text-sm main-text opacity-70">Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold main-text">{playerStats?.games_played || 0}</div>
                    <div className="text-sm main-text opacity-70">Games Played</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold main-text">{playerStats?.games_won || 0}</div>
                    <div className="text-sm main-text opacity-70">Games Won</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold main-text">{getWinRate()}%</div>
                    <div className="text-sm main-text opacity-70">Win Rate</div>
                  </div>
                </div>

                {playerStats?.last_active && (
                  <div className="mt-6 pt-6 border-t text-center">
                    <p className="text-sm main-text opacity-70">
                      Last active: {new Date(playerStats.last_active).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
