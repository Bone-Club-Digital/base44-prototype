
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { "Content-Type": "application/json" }
            });
        }

        const user = await base44.auth.me();
        const { league_id } = await req.json();

        if (!league_id) {
            return new Response(JSON.stringify({ error: 'league_id is required' }), {
                status: 400, headers: { "Content-Type": "application/json" }
            });
        }

        // Get the league and verify permissions
        const league = await base44.asServiceRole.entities.League.get(league_id);
        if (!league) {
            return new Response(JSON.stringify({ error: 'League not found' }), {
                status: 404, headers: { "Content-Type": "application/json" }
            });
        }

        // Check if user is admin of the league
        if (league.admin_user_id !== user.id && user.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'You do not have permission to invite participants to this league.' }), {
                status: 403, headers: { "Content-Type": "application/json" }
            });
        }

        // Get all active club members (these are the people who CAN be invited to leagues)
        const clubMembers = await base44.asServiceRole.entities.ClubMember.filter({ 
            club_id: league.club_id, 
            status: 'active' 
        });

        // Get existing league participants to exclude them
        const existingParticipants = await base44.asServiceRole.entities.LeagueParticipant.filter({ 
            league_id: league_id 
        });
        const participantUserIds = new Set(existingParticipants.map(p => p.user_id));

        // Filter club members to find those not already in the league
        const availableMembers = clubMembers
            .filter(member => !participantUserIds.has(member.user_id))
            .map(member => ({
                user_id: member.user_id,
                username: member.username,
                profile_picture_url: null, // We'll get this from PlayerStats if needed
                rating: 1500 // Default rating, will be updated from PlayerStats
            }));

        // Get PlayerStats for these users to get profile pictures and ratings
        if (availableMembers.length > 0) {
            const userIds = availableMembers.map(m => m.user_id);
            const playerStats = await base44.asServiceRole.entities.PlayerStats.filter({ 
                user_id: { '$in': userIds } 
            });
            
            const statsMap = new Map();
            playerStats.forEach(stat => statsMap.set(stat.user_id, stat));
            
            availableMembers.forEach(member => {
                const stats = statsMap.get(member.user_id);
                if (stats) {
                    member.profile_picture_url = stats.profile_picture_url;
                    member.rating = stats.rating || 1500;
                }
            });
        }

        return new Response(JSON.stringify({ 
            users: availableMembers,
            diagnostic: `Found ${clubMembers.length} club members, ${existingParticipants.length} already in league, ${availableMembers.length} available to invite.`
        }), {
            status: 200, headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('[getAvailableUsersForLeagueInvite] Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
});
