
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { "Content-Type": "application/json" }
            });
        }

        const adminUser = await base44.auth.me();
        const { club_id } = await req.json();

        if (!club_id) {
            return new Response(JSON.stringify({ error: 'club_id is required' }), {
                status: 400, headers: { "Content-Type": "application/json" }
            });
        }

        // --- Authorization ---
        const club = await base44.asServiceRole.entities.Club.get(club_id);
        if (!club) {
            return new Response(JSON.stringify({ error: 'Club not found' }), {
                status: 404, headers: { "Content-Type": "application/json" }
            });
        }

        const isAdmin = club.admin_id === adminUser.id || 
                       (club.admin_ids && club.admin_ids.includes(adminUser.id)) ||
                       adminUser.role === 'admin';
        
        if (!isAdmin) {
            return new Response(JSON.stringify({ error: 'You do not have permission to invite members to this club.' }), {
                status: 403, headers: { "Content-Type": "application/json" }
            });
        }

        // --- Refactored Data Gathering & Filtering ---
        const diagnosticLog = [];

        // 1. Get all PlayerStats
        const allPlayerStats = await base44.asServiceRole.entities.PlayerStats.list();
        diagnosticLog.push(`Found ${allPlayerStats.length} total PlayerStats records.`);

        // 2. Get existing members/invitees for THIS club
        const clubMembers = await base44.asServiceRole.entities.ClubMember.filter({ 
            club_id: club_id,
            status: { '$in': ['active', 'pending'] }
        });
        const existingMemberIds = new Set(clubMembers.map(m => m.user_id));
        diagnosticLog.push(`Found ${existingMemberIds.size} existing members/invitees for this club.`);

        // 3. Filter out existing members AND the admin performing the action
        const potentialInvites = allPlayerStats.filter(player => 
            !existingMemberIds.has(player.user_id) && player.user_id !== adminUser.id
        );
        diagnosticLog.push(`${potentialInvites.length} players remain after filtering out members and self.`);

        if (potentialInvites.length === 0) {
            return new Response(JSON.stringify({ users: [], diagnostic: diagnosticLog.join(' ') }), {
                status: 200, headers: { "Content-Type": "application/json" }
            });
        }

        // 4. Efficiently check 'open_to_club_invites' preference for the remaining players
        const potentialUserIds = potentialInvites.map(p => p.user_id);
        const usersWithPreferences = await base44.asServiceRole.entities.User.filter({ id: { '$in': potentialUserIds } });
        const openToInvitesUserIds = new Set(
            usersWithPreferences
                .filter(u => u.open_to_club_invites !== false)
                .map(u => u.id)
        );
        diagnosticLog.push(`${openToInvitesUserIds.size} of these players are open to invites.`);

        // 5. Final filter based on preferences
        const finalAvailableUsers = potentialInvites
            .filter(player => openToInvitesUserIds.has(player.user_id))
            .map(player => ({
                user_id: player.user_id,
                username: player.username,
                profile_picture_url: player.profile_picture_url,
                rating: player.rating || 1500
            }));
            
        diagnosticLog.push(`Returning final list of ${finalAvailableUsers.length} users.`);

        return new Response(JSON.stringify({ 
            users: finalAvailableUsers,
            diagnostic: diagnosticLog.join(' | ')
        }), {
            status: 200, headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('[getAvailableUsersForInvite] Unexpected error:', error);
        return new Response(JSON.stringify({ 
            error: error.message || 'Internal server error',
            diagnostic: 'An unexpected error occurred on the server.' 
        }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
});
