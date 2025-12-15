import React, { createContext, useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { User } from '@/entities/User';
import { Plan } from '@/entities/Plan';
import { PlayerStats } from '@/entities/PlayerStats';
import { setUserOffline } from '@/functions/setUserOffline';

const UserContext = createContext({ 
    user: null, 
    plan: null, 
    loading: true, 
    refetchUser: () => {}, 
    pendingInvitesCount: 0, 
    refetchPendingInvites: async () => {}, 
    unreadMessagesCount: 0, 
    refetchUnreadMessages: async () => {},
    leagueProposalsCount: 0,
    refetchLeagueProposals: async () => {}
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const [leagueProposalsCount, setLeagueProposalsCount] = useState(0);
    
    // Use refs instead of state to avoid dependency issues
    const lastInviteFetch = useRef(0);
    const lastMessageFetch = useRef(0);
    const lastLeagueProposalsFetch = useRef(0);
    const fetchUserAndPlanRef = useRef(null);

    const fetchUnreadMessages = useCallback(async (currentUser) => {
        if (!currentUser) {
            setUnreadMessagesCount(0);
            return;
        }
        
        const now = Date.now();
        if (now - lastMessageFetch.current < 30000) {
            return;
        }
        lastMessageFetch.current = now;
        
        try {
            const { Message } = await import('@/entities/Message');
            const messages = await Message.filter({ recipient_id: currentUser.id, status: 'unread' });
            setUnreadMessagesCount(messages.length);
        } catch (error) {
            if (error.response?.status === 429) {
                lastMessageFetch.current = now + 60000;
                console.warn("Rate limited on messages, will retry later");
            } else {
                console.warn("Could not fetch unread messages count:", error.message);
            }
        }
    }, []);

    const fetchPendingInvites = useCallback(async (currentUser) => {
        if (!currentUser) {
            setPendingInvitesCount(0);
            return;
        }
        
        const now = Date.now();
        if (now - lastInviteFetch.current < 30000) {
            return;
        }
        lastInviteFetch.current = now;
        
        try {
            const { ClubMember } = await import('@/entities/ClubMember');
            const members = await ClubMember.filter({ user_id: currentUser.id, status: 'pending' });
            const uniqueInvites = Array.from(new Map(members.map(item => [item.club_id, item])).values());
            setPendingInvitesCount(uniqueInvites.length);
        } catch (error) {
            if (error.response?.status === 429) {
                lastInviteFetch.current = now + 60000;
                console.warn("Rate limited on invites, will retry later");
            } else {
                console.warn("Could not fetch pending invites count:", error.message);
            }
        }
    }, []);

    const fetchLeagueProposals = useCallback(async (currentUser) => {
        if (!currentUser) {
            setLeagueProposalsCount(0);
            return;
        }
        
        const now = Date.now();
        if (now - lastLeagueProposalsFetch.current < 30000) {
            return;
        }
        lastLeagueProposalsFetch.current = now;
        
        try {
            const { getLeagueProposalsForUser } = await import('@/functions/getLeagueProposalsForUser');
            const response = await getLeagueProposalsForUser();
            const proposals = response.data || [];
            const pendingProposals = proposals.filter(p => p.status === 'pending');
            setLeagueProposalsCount(pendingProposals.length);
        } catch (error) {
            if (error.response?.status === 429) {
                lastLeagueProposalsFetch.current = now + 60000;
                console.warn("Rate limited on league proposals, will retry later");
            } else {
                console.warn("Could not fetch league proposals count:", error.message);
            }
        }
    }, []);

    const fetchUserAndPlan = useCallback(async () => {
        setLoading(true);
        let currentUser = null;
        try {
            currentUser = await User.me();
            setUser(currentUser);
            
            // Only update last_active once per session load
            if (currentUser?.id) {
                try {
                    const stats = await PlayerStats.filter({ user_id: currentUser.id });
                    if (stats.length > 0) {
                        await PlayerStats.update(stats[0].id, { last_active: new Date().toISOString() });
                    }
                } catch (error) {
                    console.warn("Could not update last_active status:", error.message);
                }
            }
            
        } catch (e) {
            setUser(null);
            setPlan(null);
            setPendingInvitesCount(0);
            setUnreadMessagesCount(0);
            setLeagueProposalsCount(0);
            setLoading(false);
            return;
        }
        
        try {
            if (currentUser && currentUser.plan_id) {
                const plans = await Plan.list();
                const userPlan = plans.find(p => p.id === currentUser.plan_id);
                setPlan(userPlan || null);
            } else if (currentUser) {
                setPlan({ name: 'FREE', features: [] });
            }
        } catch (e) {
            if (e.response?.status === 429) {
                console.warn('[UserProvider] Rate limited on plans fetch, using FREE plan');
            } else {
                console.error('[UserProvider] Error fetching plans:', e.message || e);
            }
            setPlan({ name: 'FREE', features: [] });
        } finally {
            setLoading(false);
        }

        // Fetch counts after user is loaded, with staggered timing
        if (currentUser) {
            setTimeout(() => fetchPendingInvites(currentUser), 100);
            setTimeout(() => fetchUnreadMessages(currentUser), 200);
            setTimeout(() => fetchLeagueProposals(currentUser), 300);
        }
    }, [fetchPendingInvites, fetchUnreadMessages, fetchLeagueProposals]);

    // Store ref for stable access
    fetchUserAndPlanRef.current = fetchUserAndPlan;

    // Single useEffect for initial load
    useEffect(() => {
        fetchUserAndPlanRef.current();
    }, []); // Only run once on mount
    
    // Separate useEffect for intervals
    useEffect(() => {
        if (!user) return;

        const messagesInterval = setInterval(() => fetchUnreadMessages(user), 300000); // 5 minutes
        const proposalsInterval = setInterval(() => fetchLeagueProposals(user), 600000); // 10 minutes

        const heartbeatInterval = setInterval(async () => {
            try {
                const stats = await PlayerStats.filter({ user_id: user.id });
                if (stats.length > 0) {
                    await PlayerStats.update(stats[0].id, { last_active: new Date().toISOString() });
                }
            } catch (error) {
                if (error.response?.status !== 429) {
                    console.warn("Could not update last_active status:", error.message);
                }
            }
        }, 120000); // 2 minutes

        return () => {
            clearInterval(messagesInterval);
            clearInterval(proposalsInterval);
            clearInterval(heartbeatInterval);
        };
    }, [user, fetchUnreadMessages, fetchLeagueProposals]);

    // Handle browser close
    useEffect(() => {
        if (!user) return;

        const handleUnload = () => {
            try {
                setUserOffline({});
            } catch (e) {
                // Suppress errors during unload
            }
        };

        window.addEventListener('unload', handleUnload);
        return () => window.removeEventListener('unload', handleUnload);
    }, [user]);

    const refetchPendingInvitesCallback = useCallback(async () => {
        const currentUser = user || await User.me().catch(() => null);
        if (currentUser) {
            lastInviteFetch.current = 0;
            await fetchPendingInvites(currentUser);
        }
    }, [user, fetchPendingInvites]);

    const refetchUnreadMessagesCallback = useCallback(async () => {
        const currentUser = user || await User.me().catch(() => null);
        if (currentUser) {
            lastMessageFetch.current = 0;
            await fetchUnreadMessages(currentUser);
        }
    }, [user, fetchUnreadMessages]);

    const refetchLeagueProposalsCallback = useCallback(async () => {
        const currentUser = user || await User.me().catch(() => null);
        if (currentUser) {
            lastLeagueProposalsFetch.current = 0;
            await fetchLeagueProposals(currentUser);
        }
    }, [user, fetchLeagueProposals]);

    const value = useMemo(() => ({
        user, 
        plan, 
        loading, 
        refetchUser: fetchUserAndPlan,
        pendingInvitesCount,
        refetchPendingInvites: refetchPendingInvitesCallback,
        unreadMessagesCount,
        refetchUnreadMessages: refetchUnreadMessagesCallback,
        leagueProposalsCount,
        refetchLeagueProposals: refetchLeagueProposalsCallback
    }), [user, plan, loading, fetchUserAndPlan, pendingInvitesCount, refetchPendingInvitesCallback, unreadMessagesCount, refetchUnreadMessagesCallback, leagueProposalsCount, refetchLeagueProposalsCallback]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};