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
            return new Response(JSON.stringify({ error: 'League ID is required' }), {
                status: 400, headers: { "Content-Type": "application/json" }
            });
        }

        // Verify league exists and user has permission
        const league = await base44.asServiceRole.entities.League.get(league_id);
        if (!league) {
            return new Response(JSON.stringify({ error: 'League not found' }), {
                status: 404, headers: { "Content-Type": "application/json" }
            });
        }

        if (league.admin_user_id !== user.id && user.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Only league admins can perform this action' }), {
                status: 403, headers: { "Content-Type": "application/json" }
            });
        }

        // Get all registered participants
        const registeredParticipants = await base44.asServiceRole.entities.LeagueParticipant.filter({ 
            league_id, 
            status: 'registered' 
        });

        if (registeredParticipants.length === 0) {
            return new Response(JSON.stringify({ success: true, message: 'No registered players to activate.' }), {
                status: 200, headers: { "Content-Type": "application/json" }
            });
        }

        // Activate them
        const activationPromises = registeredParticipants.map(p => 
            base44.asServiceRole.entities.LeagueParticipant.update(p.id, { status: 'active' })
        );

        await Promise.all(activationPromises);

        return new Response(JSON.stringify({ 
            success: true, 
            activated_count: registeredParticipants.length 
        }), {
            status: 200, headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('[activateLeagueParticipants] Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
});