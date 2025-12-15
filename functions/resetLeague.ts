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
            return new Response(JSON.stringify({ error: 'Only league admins can reset leagues' }), {
                status: 403, headers: { "Content-Type": "application/json" }
            });
        }

        // --- Data Gathering ---
        const [matches, divisions] = await Promise.all([
            base44.asServiceRole.entities.LeagueMatch.filter({ league_id }),
            base44.asServiceRole.entities.Division.filter({ league_id }),
        ]);

        const matchIds = matches.map(m => m.id);
        const proposals = matchIds.length > 0 ? await base44.asServiceRole.entities.LeagueMatchProposal.filter({ league_match_id: { '$in': matchIds } }) : [];

        // --- Data Deletion ---
        const deletionPromises = [];
        if (proposals.length > 0) proposals.forEach(p => deletionPromises.push(base44.asServiceRole.entities.LeagueMatchProposal.delete(p.id)));
        if (matches.length > 0) matches.forEach(m => deletionPromises.push(base44.asServiceRole.entities.LeagueMatch.delete(m.id)));
        if (divisions.length > 0) divisions.forEach(d => deletionPromises.push(base44.asServiceRole.entities.Division.delete(d.id)));
        if (deletionPromises.length > 0) await Promise.all(deletionPromises);

        // --- Reset Participants and League ---
        const participants = await base44.asServiceRole.entities.LeagueParticipant.filter({ league_id });
        const participantResetPromises = participants.map(participant => 
            base44.asServiceRole.entities.LeagueParticipant.update(participant.id, {
                status: 'registered',
                division_id: null,
                wins: 0,
                losses: 0,
                draws: 0,
                points_for: 0,
                points_against: 0,
                matches_played: 0
            })
        );
        
        const leagueResetPromise = base44.asServiceRole.entities.League.update(league_id, { 
            status: 'draft',
            start_date: null
        });

        await Promise.all([...participantResetPromises, leagueResetPromise]);

        return new Response(JSON.stringify({ 
            success: true, 
            message: `League reset successfully! Deleted ${matches.length} matches and ${divisions.length} divisions. Reset ${participants.length} participants.`
        }), {
            status: 200, headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('[resetLeague] Error:', error);
        return new Response(JSON.stringify({ 
            error: `Failed to reset league: ${error.message}`
        }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
});