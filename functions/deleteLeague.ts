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

        // --- Authorization ---
        const league = await base44.asServiceRole.entities.League.get(league_id);
        if (!league) {
            return new Response(JSON.stringify({ error: 'League not found' }), {
                status: 404, headers: { "Content-Type": "application/json" }
            });
        }

        if (league.admin_user_id !== user.id && user.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'You do not have permission to delete this league.' }), {
                status: 403, headers: { "Content-Type": "application/json" }
            });
        }

        // --- Data Gathering ---
        const [participants, divisions, matches] = await Promise.all([
            base44.asServiceRole.entities.LeagueParticipant.filter({ league_id }),
            base44.asServiceRole.entities.Division.filter({ league_id }),
            base44.asServiceRole.entities.LeagueMatch.filter({ league_id }),
        ]);
        
        const matchIds = matches.map(m => m.id);
        const proposals = matchIds.length > 0 ? await base44.asServiceRole.entities.LeagueMatchProposal.filter({ league_match_id: { '$in': matchIds } }) : [];

        // --- Send Notifications ---
        const notificationPromises = participants.map(participant => {
            if (participant.user_id === user.id) return Promise.resolve();
            
            return base44.asServiceRole.entities.Message.create({
                sender_id: 'system',
                sender_username: 'Bone Club Bot',
                recipient_id: participant.user_id,
                type: 'notification',
                subject: `League Deleted: ${league.name}`,
                body: `The league "${league.name}" has been deleted by the admin. It will no longer be accessible.`,
                status: 'unread',
                club_id: league.club_id
            });
        });
        await Promise.all(notificationPromises);

        // --- Data Deletion (Order is important) ---
        const deletionPromises = [];
        if (proposals.length > 0) proposals.forEach(p => deletionPromises.push(base44.asServiceRole.entities.LeagueMatchProposal.delete(p.id)));
        if (matches.length > 0) matches.forEach(m => deletionPromises.push(base44.asServiceRole.entities.LeagueMatch.delete(m.id)));
        if (divisions.length > 0) divisions.forEach(d => deletionPromises.push(base44.asServiceRole.entities.Division.delete(d.id)));
        if (participants.length > 0) participants.forEach(p => deletionPromises.push(base44.asServiceRole.entities.LeagueParticipant.delete(p.id)));
        
        if (deletionPromises.length > 0) await Promise.all(deletionPromises);

        // Finally, delete the league itself
        await base44.asServiceRole.entities.League.delete(league.id);

        return new Response(JSON.stringify({ 
            success: true, 
            message: `League "${league.name}" and all its data have been successfully deleted.`
        }), {
            status: 200, headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('[deleteLeague] Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
});