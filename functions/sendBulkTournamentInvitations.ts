import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Ensure user is authenticated
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { 'Content-Type': 'application/json' }
            });
        }

        const callingUser = await base44.auth.me();
        const { tournament_id, tournament_name, users_to_invite } = await req.json();

        if (!tournament_id || !tournament_name || !users_to_invite || !Array.isArray(users_to_invite)) {
            return new Response(JSON.stringify({ error: 'Missing or invalid required fields' }), {
                status: 400, headers: { 'Content-Type': 'application/json' }
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

        // Get existing participants
        const existingParticipants = await base44.asServiceRole.entities.TournamentParticipant.filter({ tournament_id });
        const existingUserIds = new Set(existingParticipants.map(p => p.user_id));

        const results = { sent: [], failed: [], skipped: [] };
        
        // Loop through users and create invitations
        for (const user of users_to_invite) {
            try {
                // Check if user already has participation record
                if (existingUserIds.has(user.user_id)) {
                    const existingParticipant = existingParticipants.find(p => p.user_id === user.user_id);
                    const status = existingParticipant.status === 'accepted' ? 'already participating' : 'already invited';
                    results.skipped.push({ username: user.username, reason: status });
                    continue;
                }

                // Create TournamentParticipant record
                const invitation = await base44.asServiceRole.entities.TournamentParticipant.create({
                    tournament_id,
                    user_id: user.user_id,
                    username: user.username,
                    profile_picture_url: user.profile_picture_url,
                    status: 'invited'
                });

                // Create a notification message for the invitee
                const notificationPayload = {
                    sender_id: 'system',
                    sender_username: 'Bone Club System',
                    recipient_id: user.user_id,
                    recipient_username: user.username,
                    type: 'notification',
                    subject: `Tournament Invitation: ${tournament_name}`,
                    body: `You have been invited to join the tournament **${tournament_name}** by ${callingUser.username || callingUser.full_name}. You can accept or decline this invitation from your Messages or by visiting the tournament page.`,
                    status: 'unread',
                    related_entity_id: invitation.id,
                    related_entity_type: 'TournamentParticipant'
                };
                
                await base44.asServiceRole.entities.Message.create(notificationPayload);
                results.sent.push(user.username);
            } catch (e) {
                console.error(`Failed to invite user ${user.username}:`, e);
                results.failed.push({ username: user.username, error: e.message });
            }
        }

        return new Response(JSON.stringify({ success: true, results }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[sendBulkTournamentInvitations] Error:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to send tournament invitations', 
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});