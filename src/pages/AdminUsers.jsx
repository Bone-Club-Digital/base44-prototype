
import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/entities/User';
import { PlayerStats } from '@/entities/PlayerStats';
import { Badge as BadgeEntity } from '@/entities/Badge'; // Import Badge entity
import { UserBadge } from '@/entities/UserBadge'; // Import UserBadge entity
import { Plan } from '@/entities/Plan'; // Import Plan entity
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, Users, Edit, Save, X, Search, ChevronLeft, ChevronRight, Award, ClipboardList,
  TrendingUp, Dices, Trophy, Shield // Added for badge icons
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns'; // Import format from date-fns

// Define a map of icons available for badges
const icons = { TrendingUp, Dices, Users, Trophy, Shield, Award };

const BadgeDisplay = ({ badge }) => {
    if (!badge) return null;
    // Dynamically get icon component from the icons map, with Award as a fallback
    const IconComponent = icons[badge.icon] || icons.Award;
    return (
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-xs font-medium ${badge.color}`} title={badge.description}>
            <IconComponent className="w-3 h-3" />
            <span>{badge.name}</span>
        </div>
    );
};

export default function AdminUsersPage() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [playerStats, setPlayerStats] = useState([]);
  const [badges, setBadges] = useState([]); // State for badge types
  const [userBadges, setUserBadges] = useState([]); // State for user badge assignments
  const [plans, setPlans] = useState([]); // State for plans
  const [usersLoading, setUsersLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  // Initialize editData with new is_forum_admin field
  const [editData, setEditData] = useState({ bones_balance: '', username: '', plan_id: '', is_forum_admin: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('username');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(20);
  const [selectedLetter, setSelectedLetter] = useState('All');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate(createPageUrl('Home'));
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchUsersData();
    }
  }, [user]);

  const fetchUsersData = async () => {
    try {
      const [usersResult, statsResult, badgeTypesResult, userBadgesResult, plansResult] = await Promise.allSettled([
        User.list(),
        PlayerStats.list(),
        BadgeEntity.list(), // Fetch badge types
        UserBadge.list(),    // Fetch user badge assignments
        Plan.list() // Fetch plans
      ]);

      const allUsers = usersResult.status === 'fulfilled' ? usersResult.value : [];
      const allStats = statsResult.status === 'fulfilled' ? statsResult.value : [];
      setBadges(badgeTypesResult.status === 'fulfilled' ? badgeTypesResult.value : []); // Set badge types
      setUserBadges(userBadgesResult.status === 'fulfilled' ? userBadgesResult.value : []); // Set user badge assignments
      setPlans(plansResult.status === 'fulfilled' ? plansResult.value : []); // Set plans

      // Create a map of user stats for quick lookup
      const statsMap = {};
      allStats.forEach(stat => {
        statsMap[stat.user_id] = stat;
      });

      // Combine user data with their stats
      const usersWithStats = allUsers.map(u => ({
        ...u,
        stats: statsMap[u.id] || null
      }));

      setUsers(usersWithStats);
      setPlayerStats(allStats);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleEdit = (userData) => {
    setEditingUser(userData.id);
    setEditData({
      bones_balance: userData.bones_balance?.toString() || '0',
      username: userData.username || '',
      plan_id: userData.plan_id || '',
      is_forum_admin: userData.is_forum_admin || false, // Populate is_forum_admin
    });
  };

  const handleSave = async () => {
    try {
      const selectedPlan = plans.find(p => p.id === editData.plan_id);
      let subscriptionEndDate = null;

      if (selectedPlan && selectedPlan.name !== 'FREE') {
        const now = new Date();
        now.setFullYear(now.getFullYear() + 1); // Set renewal date to one year from now
        subscriptionEndDate = now.toISOString();
      }

      const updateData = {
        bones_balance: parseInt(editData.bones_balance) || 0,
        username: editData.username || null,
        plan_id: editData.plan_id || null,
        subscription_end_date: subscriptionEndDate,
        is_forum_admin: editData.is_forum_admin, // Added is_forum_admin
      };

      await User.update(editingUser, updateData);

      // Also update PlayerStats if it exists and username changed
      const userStats = playerStats.find(s => s.user_id === editingUser);
      if (userStats && editData.username && editData.username !== userStats.username) {
        await PlayerStats.update(userStats.id, { username: editData.username });
      }

      await fetchUsersData();
      setEditingUser(null);
      alert('User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user. Please try again.');
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
    setEditData({ bones_balance: '', username: '', plan_id: '', is_forum_admin: false }); // Reset is_forum_admin
  };

  const handleLetterSelect = (letter) => {
    setSelectedLetter(letter);
    setCurrentPage(1);
    setSearchTerm(''); // Reset search when letter changes
  };

  const getSortValue = (userData, sortField) => {
    switch (sortField) {
      case 'username': return userData.username || '';
      case 'full_name': return userData.full_name || '';
      case 'email': return userData.email || '';
      case 'first_name': return userData.full_name ? userData.full_name.split(' ')[0] : '';
      case 'last_name': return userData.full_name ? userData.full_name.split(' ').slice(-1)[0] : '';
      default: return userData.username || '';
    }
  };
  
  const availableLetters = useMemo(() => {
    const letters = new Set();
    users.forEach(user => {
      const value = getSortValue(user, sortBy);
      if (value) {
        letters.add(value[0].toUpperCase());
      }
    });
    return letters;
  }, [users, sortBy]);

  // Filter and sort users
  const filteredAndSortedUsers = users
    .filter(userData => {
      // Letter filter applied first
      if (selectedLetter !== 'All') {
        const value = getSortValue(userData, sortBy);
        if (!value || value[0].toUpperCase() !== selectedLetter) {
          return false;
        }
      }

      // Then search term filter
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        (userData.username && userData.username.toLowerCase().includes(searchLower)) ||
        (userData.full_name && userData.full_name.toLowerCase().includes(searchLower)) ||
        (userData.email && userData.email.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => {
      let aValue = getSortValue(a, sortBy);
      let bValue = getSortValue(b, sortBy);
      
      const comparison = aValue.localeCompare(bValue);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = filteredAndSortedUsers.slice(startIndex, endIndex);

  // Generate pagination letters/numbers
  const generatePaginationItems = () => {
    const items = [];
    const maxItems = 10;
    
    if (totalPages <= maxItems) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      // More complex pagination logic for many pages
      if (currentPage <= 5) {
        for (let i = 1; i <= 7; i++) items.push(i);
        items.push('...');
        items.push(totalPages);
      } else if (currentPage >= totalPages - 4) {
        items.push(1);
        items.push('...');
        for (let i = totalPages - 6; i <= totalPages; i++) items.push(i);
      } else {
        items.push(1);
        items.push('...');
        for (let i = currentPage - 2; i <= currentPage + 2; i++) items.push(i);
        items.push('...');
        items.push(totalPages);
      }
    }
    return items;
  };

  // Create a map for quick plan lookup
  const planMap = useMemo(() => {
      const map = new Map();
      plans.forEach(p => map.set(p.id, p));
      return map;
  }, [plans]);

  // Create a map for quick badge lookup
  const badgeMap = useMemo(() => {
      const map = new Map();
      badges.forEach(b => map.set(b.id, b));
      return map;
  }, [badges]);

  if (loading || usersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#5a3217] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="main-text">Loading users...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to={createPageUrl("Admin")} className="flex items-center gap-2 hover:opacity-70 transition-colors" style={{ color: '#5a3217' }}>
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Admin</span>
          </Link>
        </div>

        <h1 className="text-4xl font-bold main-text mb-8">User Management</h1>

        {/* Search and Sort Controls */}
        <Card className="tool-card-bg border-0 elegant-shadow mb-6">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap justify-center gap-1">
              <Button
                variant={selectedLetter === 'All' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleLetterSelect('All')}
                style={selectedLetter === 'All' ? { backgroundColor: '#5a3217', color: '#e5e4cd' } : {}}
              >
                All
              </Button>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                <Button
                  key={letter}
                  variant={selectedLetter === letter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLetterSelect(letter)}
                  disabled={!availableLetters.has(letter)}
                  className="w-8 h-8 p-0"
                  style={
                    selectedLetter === letter 
                        ? { backgroundColor: '#5a3217', color: '#e5e4cd' } 
                        : !availableLetters.has(letter) 
                            ? { opacity: 0.5, cursor: 'not-allowed' } 
                            : {}
                  }
                >
                  {letter}
                </Button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-grow relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder={`Search users by username, name, or email...`}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset to first page when searching
                    setSelectedLetter('All'); // Reset letter filter when typing
                  }}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="username">Username</SelectItem>
                    <SelectItem value="full_name">Full Name</SelectItem>
                    <SelectItem value="first_name">First Name</SelectItem>
                    <SelectItem value="last_name">Last Name</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">A-Z</SelectItem>
                    <SelectItem value="desc">Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-3 text-sm main-text opacity-70">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedUsers.length)} of {filteredAndSortedUsers.length} users
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          {currentUsers.map(userData => {
            const assignedBadgeIds = userBadges.filter(ub => ub.user_id === userData.id).map(ub => ub.badge_id);
            const assignedBadges = assignedBadgeIds.map(id => badgeMap.get(id)).filter(Boolean); // filter(Boolean) removes undefined/null if badge not found
            const currentPlan = userData.plan_id ? planMap.get(userData.plan_id) : null;

            return (
              <Card key={userData.id} className="tool-card-bg border-0 elegant-shadow">
                <CardContent className="p-6">
                  {editingUser === userData.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium main-text mb-2">Username</label>
                          <Input
                            value={editData.username}
                            onChange={(e) => setEditData({...editData, username: e.target.value})}
                            placeholder="Enter username"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium main-text mb-2">Bones Balance</label>
                          <Input
                            type="number"
                            value={editData.bones_balance}
                            onChange={(e) => setEditData({...editData, bones_balance: e.target.value})}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium main-text mb-2">Membership Plan</label>
                          <Select value={editData.plan_id} onValueChange={(value) => setEditData({...editData, plan_id: value})}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a plan" />
                            </SelectTrigger>
                            <SelectContent>
                                {plans.map(plan => (
                                    <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* New field for is_forum_admin */}
                        <div className="col-span-full">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id={`is_forum_admin_${userData.id}`}
                                    checked={editData.is_forum_admin}
                                    onChange={(e) => setEditData({ ...editData, is_forum_admin: e.target.checked })}
                                    className="form-checkbox h-4 w-4 text-[#5a3217] rounded"
                                />
                                <label htmlFor={`is_forum_admin_${userData.id}`} className="text-sm font-medium main-text">
                                    Forum Administrator
                                </label>
                            </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSave}
                          style={{ backgroundColor: '#007e81', color: 'white' }}
                          className="flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Save Changes
                        </Button>
                        <Button
                          onClick={handleCancel}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-xl font-bold main-text">
                            {userData.username || userData.full_name || 'Anonymous User'}
                          </h3>
                          <Badge variant={userData.role === 'admin' ? 'destructive' : 'default'}>
                            {userData.role || 'user'}
                          </Badge>
                          {userData.is_forum_admin && ( // Display Forum Admin badge if true
                            <Badge style={{backgroundColor: '#b8860b', color: 'white'}}>
                                <Users className="w-3 h-3 mr-1" />
                                Forum Admin
                            </Badge>
                          )}
                          {currentPlan && (
                            <Badge style={{backgroundColor: '#007e81', color: 'white'}}>
                                <ClipboardList className="w-3 h-3 mr-1" />
                                {currentPlan.name}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm main-text opacity-70">{userData.email}</p>
                        {currentPlan && currentPlan.name !== 'FREE' && userData.subscription_end_date && (
                           <p className="text-xs main-text opacity-60">
                             Renews: {format(new Date(userData.subscription_end_date), 'dd MMM yyyy')}
                           </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm main-text">
                          <div className="flex items-center gap-1">
                            <span className="font-bold highlight-text">{userData.bones_balance || 0}</span>
                            <span className="highlight-text">🦴 Bones</span>
                          </div>
                          
                          {userData.stats && (
                            <>
                              <div>Rating: {userData.stats.rating || 1500}</div>
                              <div>Games: {userData.stats.games_played || 0}</div>
                              <div>Wins: {userData.stats.games_won || 0}</div>
                            </>
                          )}
                        </div>

                        {/* Display assigned badges here */}
                        {assignedBadges.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {assignedBadges.map(badge => (
                              <BadgeDisplay key={badge.id} badge={badge} />
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEdit(userData)}
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card className="tool-card-bg border-0 elegant-shadow mt-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                {generatePaginationItems().map((item, index) => (
                  <React.Fragment key={index}>
                    {item === '...' ? (
                      <span className="px-2 py-1 text-sm main-text opacity-50">...</span>
                    ) : (
                      <Button
                        variant={currentPage === item ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(item)}
                        style={currentPage === item ? { backgroundColor: '#5a3217', color: '#e5e4cd' } : {}}
                        className="w-10 h-8"
                      >
                        {item}
                      </Button>
                    )}
                  </React.Fragment>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="text-center mt-2 text-sm main-text opacity-70">
                Page {currentPage} of {totalPages}
              </div>
            </CardContent>
          </Card>
        )}

        {currentUsers.length === 0 && (
          <Card className="tool-card-bg border-0 elegant-shadow text-center py-12">
            <CardContent>
              <Users className="w-16 h-16 main-text opacity-50 mx-auto mb-4" />
              <h3 className="text-xl font-bold main-text mb-2">
                {searchTerm || selectedLetter !== 'All' ? 'No Users Found' : 'No Users Yet'}
              </h3>
              <p className="main-text opacity-70">
                {searchTerm 
                  ? `No users match your search for "${searchTerm}"`
                  : selectedLetter !== 'All' 
                    ? `No users match the selected filter.`
                    : 'Users will appear here as they sign up.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
