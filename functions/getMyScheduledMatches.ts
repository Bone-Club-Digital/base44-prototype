import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Get the authenticated user
        let user;
        try {
            user = await base44.auth.me();
        } catch (authError) {
            console.error('[getMyScheduledMatches] Failed to get user:', authError);
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { "Content-Type": "application/json" }
            });
        }

        if (!user || !user.id) {
            return new Response(JSON.stringify({ error: 'User not found' }), {
                status: 401, headers: { "Content-Type": "application/json" }
            });
        }

        console.log('[getMyScheduledMatches] User authenticated:', user.id, user.username);

        // Use service role to bypass RLS and fetch all scheduled matches
        const allScheduledMatches = await base44.asServiceRole.entities.ScheduledMatch.list('-created_date');

        // Manually filter for matches where the current user is either organizer or opponent
        const userScheduledMatches = allScheduledMatches.filter(match => 
            match.organizer_id === user.id || match.opponent_id === user.id
        );

        console.log('[getMyScheduledMatches] Found', userScheduledMatches.length, 'scheduled matches for user');

        return new Response(JSON.stringify(userScheduledMatches), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('[getMyScheduledMatches] Error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to fetch scheduled matches',
            details: error.message
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});