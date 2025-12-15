import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { "Content-Type": "application/json" }
            });
        }

        const { tournament_id } = await req.json();
        if (!tournament_id) {
            return new Response(JSON.stringify({ error: 'Tournament ID is required' }), {
                status: 400, headers: { "Content-Type": "application/json" }
            });
        }

        // Use service role for elevated permissions
        const serviceRoleClient = base44.asServiceRole;

        // --- Authorization Check ---
        const tournament = await serviceRoleClient.entities.Tournament.get(tournament_id);
        if (!tournament) {
            return new Response(JSON.stringify({ error: 'Tournament not found' }), {
                status: 404, headers: { "Content-Type": "application/json" }
            });
        }

        const club = await serviceRoleClient.entities.Club.get(tournament.club_id);
        const isAdmin = club.admin_id === user.id || (club.admin_ids && club.admin_ids.includes(user.id));

        if (!isAdmin) {
            return new Response(JSON.stringify({ error: 'You do not have permission to delete this tournament.' }), {
                status: 403, headers: { "Content-Type": "application/json" }
            });
        }

        // --- Data Gathering ---
        const [participants, matches] = await Promise.all([
            serviceRoleClient.entities.TournamentParticipant.filter({ tournament_id }),
            serviceRoleClient.entities.TournamentMatch.filter({ tournament_id }),
        ]);

        // --- Send Notifications to participants ---
        const notificationPromises = participants.map(p => {
            if (p.user_id === user.id) return Promise.resolve(); // Don't notify the admin who is deleting
            return serviceRoleClient.entities.Message.create({
                sender_id: 'system',
                sender_username: 'Bone Club System',
                recipient_id: p.user_id,
                type: 'notification',
                subject: `Tournament Deleted: ${tournament.name}`,
                body: `The tournament "${tournament.name}" in club "${tournament.club_name}" has been deleted by an administrator.`,
                status: 'unread',
                club_id: tournament.club_id
            });
        });
        await Promise.all(notificationPromises);
        
        // --- Deletion Logic (Order is important) ---
        const deletionPromises = [];
        if (matches.length > 0) {
            matches.forEach(m => deletionPromises.push(serviceRoleClient.entities.TournamentMatch.delete(m.id)));
        }
        if (participants.length > 0) {
            participants.forEach(p => deletionPromises.push(serviceRoleClient.entities.TournamentParticipant.delete(p.id)));
        }
        
        // Execute deletions of related entities
        if (deletionPromises.length > 0) {
            await Promise.all(deletionPromises);
        }

        // Finally, delete the tournament itself
        await serviceRoleClient.entities.Tournament.delete(tournament.id);

        return new Response(JSON.stringify({ success: true, message: `Tournament "${tournament.name}" was deleted.` }), {
            status: 200, headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('[deleteTournament] Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'An internal server error occurred.' }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
});