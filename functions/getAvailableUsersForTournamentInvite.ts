import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Ensure user is authenticated
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const callingUser = await base44.auth.me();
        const { tournament_id } = await req.json();

        if (!tournament_id) {
            return new Response(JSON.stringify({ error: 'Tournament ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Verify the calling user is the tournament admin
        const tournament = await base44.asServiceRole.entities.Tournament.get(tournament_id);
        if (!tournament) {
            return new Response(JSON.stringify({ error: 'Tournament not found' }), {
                status: 404, headers: { 'Content-Type': 'application/json' }
            });
        }

        const isAdmin = tournament.admin_user_id === callingUser.id;
        if (!isAdmin) {
            return new Response(JSON.stringify({ error: 'Forbidden: You are not the admin of this tournament.' }), {
                status: 403, headers: { 'Content-Type': 'application/json' }
            });
        }

        // Fetch all users, their stats, and existing tournament participants
        const [allUsers, allPlayerStats, existingParticipants] = await Promise.all([
            base44.asServiceRole.entities.User.list(),
            base44.asServiceRole.entities.PlayerStats.list(),
            base44.asServiceRole.entities.TournamentParticipant.filter({ tournament_id })
        ]);
        
        // Map stats by user ID for efficient lookup
        const statsMap = new Map();
        allPlayerStats.forEach(stat => statsMap.set(stat.user_id, stat));
        
        // Create a set of user IDs already in the tournament
        const participantUserIds = new Set(existingParticipants.map(p => p.user_id));
        
        // Process the full user list
        const availableForInvite = allUsers
            // Filter out users who are already participants
            .filter(user => !participantUserIds.has(user.id))
            // Filter out the admin themself
            .filter(user => user.id !== callingUser.id)
            // Only include users with usernames
            .filter(user => user.username || user.full_name)
            // Map to the format expected by the frontend
            .map(user => {
                const stats = statsMap.get(user.id);
                return {
                    user_id: user.id,
                    username: user.username || user.full_name,
                    rating: stats ? stats.rating : 1500,
                    profile_picture_url: user.profile_picture_url,
                };
            });
        
        return new Response(JSON.stringify({ availableUsers: availableForInvite }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[getAvailableUsersForTournamentInvite] Error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to fetch available users',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});