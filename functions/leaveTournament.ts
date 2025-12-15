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

        const { tournament_id } = await req.json();
        if (!tournament_id) {
            return new Response(JSON.stringify({ error: 'Tournament ID is required' }), {
                status: 400, headers: { "Content-Type": "application/json" }
            });
        }

        // Use service role for all entity interactions to ensure permissions
        const tournament = await base44.asServiceRole.entities.Tournament.get(tournament_id);
        if (!tournament) {
            return new Response(JSON.stringify({ error: 'Tournament not found' }), {
                status: 404, headers: { "Content-Type": "application/json" }
            });
        }

        if (tournament.status !== 'registration_open') {
            return new Response(JSON.stringify({ error: 'Cannot leave tournament, registration is closed.' }), {
                status: 400, headers: { "Content-Type": "application/json" }
            });
        }

        const participants = await base44.asServiceRole.entities.TournamentParticipant.filter({ 
            tournament_id, 
            user_id: user.id,
            status: 'accepted'
        });
        
        if (participants.length === 0) {
            return new Response(JSON.stringify({ error: 'You are not an active participant in this tournament.' }), {
                status: 400, headers: { "Content-Type": "application/json" }
            });
        }

        const participant = participants[0];
        const fee = tournament.entry_fee_bones || 0;

        // Refund bones if there was an entry fee
        if (fee > 0) {
            const userToRefund = await base44.asServiceRole.entities.User.get(user.id);
            await base44.asServiceRole.entities.User.update(user.id, {
                bones_balance: (userToRefund.bones_balance || 0) + fee,
            });
        }

        // Remove participant record
        await base44.asServiceRole.entities.TournamentParticipant.delete(participant.id);

        return new Response(JSON.stringify({ success: true, message: "Successfully left the tournament and received a refund." }), {
            status: 200, headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('[leaveTournament] Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
});