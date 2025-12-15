
import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../components/auth/UserProvider';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge as BadgeEntity } from '@/entities/Badge';
import { UserBadge } from '@/entities/UserBadge';
import { User } from '@/entities/User';
import { PlayerStats } from '@/entities/PlayerStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Edit, Trash2, Save, X, Search } from 'lucide-react';
import { debounce } from 'lodash';
import ColorPickerModal from '../components/ui/ColorPickerModal';

// Expanded and CORRECTED icon collection
import {
  Award, Trophy, Shield, Star, Crown, Medal, Target, Flame, Zap, Heart,
  TrendingUp, TrendingDown, BarChart3, PieChart, Activity, Users, User as UserIcon,
  Calendar, Clock, Timer, Hourglass, CheckCircle, XCircle, AlertTriangle,
  Info, HelpCircle, Settings, Cog, Wrench, Hammer, Paintbrush,
  Palette, Image, Camera, Video, Music, Headphones, Mic, Speaker,
  Phone, Mail, MessageSquare, Send, Inbox, Archive, Folder, File,
  Download, Upload, Share, Link as LinkIcon, Copy, Scissors, Edit3, PenTool,
  Book, BookOpen, GraduationCap, School, Brain, Lightbulb, Rocket,
  Globe, Map, MapPin, Navigation, Compass, Car, Plane, Ship, Train,
  Home, Building, Store, Factory as FactoryIcon, Hospital, Church, Castle, Mountain,
  Sun, Moon, Cloud, CloudRain, Snowflake, Wind, Umbrella, Rainbow,
  Coffee, Pizza, Apple as AppleIcon, Carrot, Cake, Wine, Beer,
  Gamepad2, Dices,
  Flag, Bike, SwatchBook, Spline,
  Dumbbell, Weight, Crosshair, Sword, Axe, Wand,
  Key, Lock, Unlock, Eye, EyeOff, Fingerprint, CreditCard, Coins,
  DollarSign, PoundSterling, Euro, Bitcoin, Wallet, ShoppingCart, Gift,
  Package, Box, Truck, Warehouse, Briefcase,
  Laptop, Smartphone, Tablet, Monitor, Keyboard, Mouse, Printer, Wifi,
  Battery, Plug, Power, Cpu, HardDrive, Server, Database, Code,
  Terminal, Github, Chrome, Facebook, Twitter, Instagram, Youtube, Linkedin, Slack
} from 'lucide-react';

const iconOptions = {
  // Achievement & Recognition
  Award, Trophy, Shield, Star, Crown, Medal, Target, Flame, Zap, Heart,
  // Analytics & Progress  
  TrendingUp, TrendingDown, BarChart3, PieChart, Activity,
  // People & Social
  Users, UserIcon, 
  // Time & Scheduling
  Calendar, Clock, Timer, Hourglass,
  // Status & Feedback
  CheckCircle, XCircle, AlertTriangle, Info, HelpCircle,
  // Tools & Settings
  Settings, Cog, Wrench, Hammer, Paintbrush, Palette,
  // Media & Creative
  Image, Camera, Video, Music, Headphones, Mic, Speaker,
  // Communication
  Phone, Mail, MessageSquare, Send, Inbox, Archive,
  // Files & Documents  
  Folder, File, Download, Upload, Share, LinkIcon, Copy, Scissors, Edit3, PenTool,
  // Education & Knowledge
  Book, BookOpen, GraduationCap, School, Brain, Lightbulb, Rocket,
  // Location & Travel
  Globe, Map, MapPin, Navigation, Compass, Car, Plane, Ship, Train,
  // Buildings & Places
  Home, Building, Store, FactoryIcon, Hospital, Church, Castle, Mountain,
  // Weather & Nature
  Sun, Moon, Cloud, CloudRain, Snowflake, Wind, Umbrella, Rainbow,
  // Food & Drink
  Coffee, Pizza, AppleIcon, Carrot, Cake, Wine, Beer,
  // Gaming & Entertainment
  Gamepad2, Dices,
  // Sports & Fitness
  Flag, Bike, SwatchBook, Spline, Dumbbell, Weight,
  // Fantasy & Magic
  Crosshair, Sword, Axe, Wand,
  // Security & Privacy
  Key, Lock, Unlock, Eye, EyeOff, Fingerprint,
  // Finance & Commerce
  CreditCard, Coins, DollarSign, PoundSterling, Euro, Bitcoin, Wallet, ShoppingCart, Gift, Package, Box, Truck, Warehouse, Briefcase,
  // Technology & Devices
  Laptop, Smartphone, Tablet, Monitor, Keyboard, Mouse, Printer, Wifi, Battery, Plug, Power, Cpu, HardDrive, Server, Database, Code, Terminal,
  // Brands & Platforms
  Github, Chrome, Facebook, Twitter, Instagram, Youtube, Linkedin, Slack
};

// A simple component to render a badge preview
const BadgeDisplay = ({ name, icon, color }) => {
    const IconComponent = iconOptions[icon] || iconOptions.Award;
    return (
        <div 
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm font-medium"
            style={{ backgroundColor: color }}
        >
            <IconComponent className="w-4 h-4" />
            <span>{name}</span>
        </div>
    );
};

export default function AdminBadgesPage() {
    const { user, loading } = useUser();
    const navigate = useNavigate();
    const [badges, setBadges] = useState([]);
    const [userBadges, setUserBadges] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    
    // State for managing badge types
    const [editingBadge, setEditingBadge] = useState(null);
    const [isCreatingBadge, setIsCreatingBadge] = useState(false);
    const [badgeFormData, setBadgeFormData] = useState({ 
        name: '', 
        description: '', 
        icon: 'Award', 
        color: '#6b7280', 
        category: 'site_admin' 
    });
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [iconSearchTerm, setIconSearchTerm] = useState('');

    // State for assigning badges
    const [assigningUser, setAssigningUser] = useState(null);
    const [assigningBadgeId, setAssigningBadgeId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'admin')) {
            navigate(createPageUrl('Home'));
        }
    }, [user, loading, navigate]);

    useEffect(() => {
        if (user && user.role === 'admin') {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        setDataLoading(true);
        try {
            const [badgeList, userBadgeList] = await Promise.all([
                BadgeEntity.list(),
                UserBadge.list()
            ]);
            setBadges(badgeList);
            setUserBadges(userBadgeList);
        } catch (error) {
            console.error('Error fetching badge data:', error);
        } finally {
            setDataLoading(false);
        }
    };

    // --- Badge Type Management ---
    const resetBadgeForm = () => {
        setEditingBadge(null);
        setIsCreatingBadge(false);
        setBadgeFormData({ name: '', description: '', icon: 'Award', color: '#6b7280', category: 'site_admin' });
        setIconSearchTerm('');
    };

    const handleEditBadge = (badge) => {
        setEditingBadge(badge.id);
        setBadgeFormData({
            ...badge,
            // The color should already be in hex format from the color picker
            color: badge.color || '#6b7280'
        });
        setIsCreatingBadge(false);
        setIconSearchTerm('');
    };
    
    const handleSaveBadge = async () => {
        try {
            if (editingBadge) {
                await BadgeEntity.update(editingBadge, badgeFormData);
            } else {
                await BadgeEntity.create(badgeFormData);
            }
            await fetchData();
            resetBadgeForm();
        } catch (error) {
            console.error("Error saving badge type:", error);
            alert("Failed to save badge type.");
        }
    };

    const handleDeleteBadge = async (badgeId) => {
        if (!window.confirm("Are you sure? This will also remove this badge from all users.")) return;
        try {
            const assignmentsToDelete = userBadges.filter(ub => ub.badge_id === badgeId);
            const deletePromises = assignmentsToDelete.map(ub => UserBadge.delete(ub.id));
            await Promise.all(deletePromises);
            await BadgeEntity.delete(badgeId);
            await fetchData();
        } catch (error) {
            console.error("Error deleting badge type:", error);
            alert("Failed to delete badge type.");
        }
    };

    // --- Badge Assignment Logic ---
    // Modified searchForUsers to remove the check that will now be handled by debouncedSearch
    const searchForUsers = useCallback(async (term) => {
        const [users, stats] = await Promise.all([User.list(), PlayerStats.list()]);
        const allUsers = [...users, ...stats.map(s => ({id: s.user_id, username: s.username}))];
        const uniqueUsers = Array.from(new Set(allUsers.map(u => u.id))).map(id => allUsers.find(u => u.id === id));
        
        const filtered = uniqueUsers.filter(u => u.username && u.username.toLowerCase().includes(term.toLowerCase()));
        setSuggestions(filtered.slice(0, 5));
        setShowSuggestions(true);
    }, [setSuggestions, setShowSuggestions]); // setSuggestions and setShowSuggestions are stable setters, so empty deps for searchForUsers is fine.

    const debouncedSearch = useCallback(
        debounce((term) => {
            // This check now uses the fresh 'assigningUser' from the useCallback closure
            if (term.length < 2 || assigningUser) {
                setSuggestions([]);
                setShowSuggestions(false);
                return;
            }
            searchForUsers(term);
        }, 300),
        [assigningUser, searchForUsers, setSuggestions, setShowSuggestions] // Added searchForUsers and state setters for strict dependency adherence.
    );

    useEffect(() => {
        debouncedSearch(searchTerm);
    }, [searchTerm, debouncedSearch]);

    const handleSelectUser = (selectedUser) => {
        setAssigningUser(selectedUser);
        setSearchTerm(selectedUser.username);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleUserSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        setAssigningUser(null);
    };

    const handleAssignBadge = async () => {
        if (!assigningUser || !assigningBadgeId) {
            alert("Please select a user and a badge.");
            return;
        }
        try {
            const alreadyHasBadge = userBadges.some(ub => ub.user_id === assigningUser.id && ub.badge_id === assigningBadgeId);
            if (alreadyHasBadge) {
                alert(`${assigningUser.username} already has this badge.`);
                return;
            }

            await UserBadge.create({
                user_id: assigningUser.id,
                badge_id: assigningBadgeId,
                assigned_by_id: user.id
            });
            await fetchData();
            setAssigningUser(null);
            setAssigningBadgeId('');
            setSearchTerm('');
            setShowSuggestions(false);
            alert("Badge assigned successfully!");
        } catch (error) {
            console.error("Error assigning badge:", error);
            alert("Failed to assign badge.");
        }
    };

    const handleRemoveUserBadge = async (userBadgeId) => {
        if (window.confirm("Are you sure you want to remove this badge from the user?")) {
            try {
                await UserBadge.delete(userBadgeId);
                await fetchData();
            } catch (error) {
                console.error("Error removing user badge:", error);
                alert("Failed to remove badge.");
            }
        }
    };

    // Filter icons based on search term
    const filteredIcons = Object.keys(iconOptions).filter(iconName =>
        iconName.toLowerCase().includes(iconSearchTerm.toLowerCase())
    );
    
    if (loading || dataLoading) {
        return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e5e4cd' }}><div className="w-12 h-12 border-4 border-[#5a3217] border-t-transparent rounded-full animate-spin"></div></div>;
    }

    const siteAdminBadges = badges.filter(b => b.category === 'site_admin');
    const clubAdminBadges = badges.filter(b => b.category === 'club_admin');

    return (
        <div className="min-h-screen p-8" style={{ backgroundColor: '#e5e4cd' }}>
            <div className="max-w-7xl mx-auto">
                <Link to={createPageUrl("Admin")} className="flex items-center gap-2 hover:opacity-70 transition-colors mb-8" style={{ color: '#5a3217' }}>
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Admin</span>
                </Link>

                <h1 className="text-4xl font-bold main-text mb-8">Badge Management</h1>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Column 1: Manage and Assign */}
                    <div className="space-y-8">
                        {/* Assign Badge Section */}
                        <Card className="tool-card-bg border-0 elegant-shadow">
                            <CardHeader><CardTitle className="main-text">Assign Badge</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="relative">
                                    <label className="block text-sm font-medium main-text mb-2">User</label>
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                                        <Input
                                            placeholder="Search for user..."
                                            value={searchTerm}
                                            onChange={handleUserSearchChange}
                                            className="pl-10 h-10"
                                            style={{ backgroundColor: '#e5e4cd', borderColor: '#5a3217', color: '#5a3217' }}
                                        />
                                        {showSuggestions && suggestions.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 rounded-md shadow-lg" style={{ backgroundColor: '#e5e4cd', border: '1px solid #5a3217' }}>
                                                {suggestions.map(s => (
                                                    <div 
                                                        key={s.id} 
                                                        onClick={() => handleSelectUser(s)} 
                                                        className="px-4 py-2 hover:bg-[#9fd3ba] cursor-pointer text-[#5a3217] border-b border-[#5a3217]/20 last:border-b-0"
                                                    >
                                                        {s.username}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium main-text mb-2">Badge</label>
                                    <select 
                                        value={assigningBadgeId} 
                                        onChange={(e) => setAssigningBadgeId(e.target.value)} 
                                        className="w-full p-2 rounded-md h-10"
                                        style={{ backgroundColor: '#e5e4cd', borderColor: '#5a3217', color: '#5a3217', border: '1px solid #5a3217' }}
                                    >
                                        <option value="">Select a badge</option>
                                        {badges.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <Button onClick={handleAssignBadge} style={{ backgroundColor: '#f26222', color: 'white' }}>Assign Badge</Button>
                            </CardContent>
                        </Card>

                        {/* Create/Edit Badge Section */}
                        <Card className="tool-card-bg border-0 elegant-shadow">
                            <CardHeader><CardTitle className="main-text">{editingBadge ? "Edit Badge Type" : "Create New Badge Type"}</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <Input 
                                    placeholder="Badge Name (e.g., Top Player)" 
                                    value={badgeFormData.name} 
                                    onChange={(e) => setBadgeFormData({...badgeFormData, name: e.target.value})} 
                                    className="h-10"
                                    style={{ backgroundColor: '#e5e4cd', borderColor: '#5a3217', color: '#5a3217' }}
                                />
                                <Textarea 
                                    placeholder="Description" 
                                    value={badgeFormData.description} 
                                    onChange={(e) => setBadgeFormData({...badgeFormData, description: e.target.value})} 
                                    style={{ backgroundColor: '#e5e4cd', borderColor: '#5a3217', color: '#5a3217' }}
                                />
                                
                                {/* Icon Selection */}
                                <div>
                                    <label className="block text-sm font-medium main-text mb-2">Choose Icon</label>
                                    <Input
                                        placeholder="Search icons..."
                                        value={iconSearchTerm}
                                        onChange={(e) => setIconSearchTerm(e.target.value)}
                                        className="mb-3"
                                        style={{ backgroundColor: '#e5e4cd', borderColor: '#5a3217', color: '#5a3217' }}
                                    />
                                    <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto border border-[#5a3217]/20 rounded-lg p-3" style={{ backgroundColor: 'white/10' }}>
                                        {filteredIcons.slice(0, 60).map((iconName) => {
                                            const IconComponent = iconOptions[iconName];
                                            return (
                                                <button
                                                    key={iconName}
                                                    type="button"
                                                    onClick={() => setBadgeFormData({...badgeFormData, icon: iconName})}
                                                    className={`p-2 rounded-lg border-2 transition-all flex items-center justify-center ${
                                                        badgeFormData.icon === iconName 
                                                            ? 'border-[#f26222] bg-[#f26222]/20' 
                                                            : 'border-[#5a3217]/20 bg-white/20 hover:bg-white/30'
                                                    }`}
                                                    title={iconName}
                                                >
                                                    <IconComponent className="w-4 h-4 main-text" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-xs main-text opacity-60 mt-1">Selected: {badgeFormData.icon} ({filteredIcons.length} icons available)</p>
                                </div>

                                {/* Color Selection */}
                                <div>
                                    <label className="block text-sm font-medium main-text mb-2">Choose Color</label>
                                    <div className="flex items-center gap-4">
                                        <div 
                                            className="w-16 h-16 rounded-lg border-2 border-[#5a3217]/20 cursor-pointer flex items-center justify-center transition-all hover:scale-105"
                                            style={{ backgroundColor: badgeFormData.color }}
                                            onClick={() => setShowColorPicker(true)}
                                        >
                                            <span className="text-white text-xs font-bold">Click</span>
                                        </div>
                                        <div>
                                            <p className="text-sm main-text font-medium">Current Color: {badgeFormData.color}</p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowColorPicker(true)}
                                                className="mt-2"
                                            >
                                                Open Color Picker
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Preview */}
                                {badgeFormData.name && (
                                    <div>
                                        <label className="block text-sm font-medium main-text mb-2">Preview</label>
                                        <div className="p-4 bg-white/10 rounded-lg">
                                            <BadgeDisplay 
                                                name={badgeFormData.name} 
                                                icon={badgeFormData.icon} 
                                                color={badgeFormData.color} 
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium main-text mb-2">Category</label>
                                    <select 
                                        value={badgeFormData.category} 
                                        onChange={(e) => setBadgeFormData({...badgeFormData, category: e.target.value})} 
                                        className="w-full p-2 rounded-md h-10"
                                        style={{ backgroundColor: '#e5e4cd', borderColor: '#5a3217', color: '#5a3217', border: '1px solid #5a3217' }}
                                    >
                                        <option value="site_admin">Site Admin Only</option>
                                        <option value="club_admin">Club Admin Can Award</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleSaveBadge} style={{ backgroundColor: '#007e81', color: 'white' }}><Save className="w-4 h-4 mr-2" />Save</Button>
                                    {(editingBadge || isCreatingBadge) && <Button onClick={resetBadgeForm} variant="outline" style={{ backgroundColor: '#f0e9d6', color: '#5a3217', borderColor: '#5a3217' }}><X className="w-4 h-4 mr-2" />Cancel</Button>}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Column 2: View Existing by Category */}
                    <div className="space-y-8">
                        {/* Site Admin Badges */}
                        <Card className="tool-card-bg border-0 elegant-shadow">
                            <CardHeader><CardTitle className="main-text">Site Admin Badges ({siteAdminBadges.length})</CardTitle></CardHeader>
                            <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                                {siteAdminBadges.map(badge => (
                                    <div key={badge.id} className="flex items-center justify-between p-3 rounded-lg bg-white/30">
                                        <BadgeDisplay {...badge} />
                                        <div className="flex gap-2">
                                            <Button size="icon" variant="ghost" onClick={() => handleEditBadge(badge)}><Edit className="w-4 h-4" /></Button>
                                            <Button size="icon" variant="ghost" className="text-red-500" onClick={() => handleDeleteBadge(badge.id)}><Trash2 className="w-4 h-4" /></Button>
                                        </div>
                                    </div>
                                ))}
                                {siteAdminBadges.length === 0 && (
                                    <div className="text-center py-4 main-text opacity-70">No site admin badges yet.</div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Club Admin Badges */}
                        <Card className="tool-card-bg border-0 elegant-shadow">
                            <CardHeader><CardTitle className="main-text">Club Admin Badges ({clubAdminBadges.length})</CardTitle></CardHeader>
                            <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                                {clubAdminBadges.map(badge => (
                                    <div key={badge.id} className="flex items-center justify-between p-3 rounded-lg bg-white/30">
                                        <BadgeDisplay {...badge} />
                                        <div className="flex gap-2">
                                            <Button size="icon" variant="ghost" onClick={() => handleEditBadge(badge)}><Edit className="w-4 h-4" /></Button>
                                            <Button size="icon" variant="ghost" className="text-red-500" onClick={() => handleDeleteBadge(badge.id)}><Trash2 className="w-4 h-4" /></Button>
                                        </div>
                                    </div>
                                ))}
                                {clubAdminBadges.length === 0 && (
                                    <div className="text-center py-4 main-text opacity-70">No club admin badges yet.</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Color Picker Modal */}
            <ColorPickerModal
                isOpen={showColorPicker}
                onClose={() => setShowColorPicker(false)}
                initialColor={badgeFormData.color}
                onColorSelect={(color) => {
                    setBadgeFormData({...badgeFormData, color});
                    setShowColorPicker(false);
                }}
            />
        </div>
    );
}
