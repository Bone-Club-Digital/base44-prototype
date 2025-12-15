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
        const participants = await base44.asServiceRole.entities.TournamentParticipant.filter({ 
            tournament_id, 
            user_id: user.id,
            status: 'invited' // Only find records with 'invited' status
        });

        if (participants.length === 0) {
            return new Response(JSON.stringify({ error: 'No pending invitation found for this tournament.' }), {
                status: 400, headers: { "Content-Type": "application/json" }
            });
        }
        
        const participantRecord = participants[0];

        // Delete the invitation record
        await base44.asServiceRole.entities.TournamentParticipant.delete(participantRecord.id);

        return new Response(JSON.stringify({ success: true, message: "Invitation successfully declined." }), {
            status: 200, headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('[declineTournamentInvitation] Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
});