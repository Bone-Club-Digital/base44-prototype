import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { "Content-Type": "application/json" }
            });
        }

        const adminUser = await base44.auth.me(); // Renamed to adminUser for clarity
        const { league_id, user_ids } = await req.json();

        if (!league_id || !user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
            return new Response(JSON.stringify({ error: 'League ID and user IDs array are required' }), {
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

        if (league.admin_user_id !== adminUser.id && adminUser.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Only league admins can invite participants' }), {
                status: 403, headers: { "Content-Type": "application/json" }
            });
        }

        // Get existing participants to avoid duplicates
        const existingParticipants = await base44.asServiceRole.entities.LeagueParticipant.filter({ league_id });
        const existingUserIds = new Set(existingParticipants.map(p => p.user_id));

        // Get player stats for the users we want to invite
        const playerStats = await base44.asServiceRole.entities.PlayerStats.filter({ 
            user_id: { '$in': user_ids.filter(id => !existingUserIds.has(id)) }
        });

        if (playerStats.length === 0) {
            return new Response(JSON.stringify({ error: 'No valid users found to invite or all users are already participants' }), {
                status: 400, headers: { "Content-Type": "application/json" }
            });
        }

        // Prepare participants and messages
        const participantsToCreate = [];
        const messagesToCreate = [];

        for (const stats of playerStats) {
            // Check if this is a bogus test member, or if the admin is adding themselves
            const isBogusUser = stats.user_id.startsWith('bogus_user_');
            const isSelfJoin = stats.user_id === adminUser.id;
            const status = (isBogusUser || isSelfJoin) ? 'active' : 'invited';
            
            participantsToCreate.push({
                league_id,
                user_id: stats.user_id,
                username: stats.username,
                profile_picture_url: stats.profile_picture_url,
                status,
                rating: stats.rating || 1500
            });

            // Only send messages to real users who are not the admin
            if (!isBogusUser && !isSelfJoin) {
                messagesToCreate.push({
                    sender_id: 'system',
                    sender_username: 'Bone Club',
                    recipient_id: stats.user_id,
                    recipient_username: stats.username,
                    type: 'notification',
                    subject: `League Invitation: ${league.name}`,
                    body: `You have been invited to join the "${league.name}" league. Please accept or decline this invitation.`,
                    status: 'unread',
                    related_entity_type: 'LeagueParticipant',
                    league_name: league.name,
                    club_id: league.club_id
                });
            }
        }

        // Create participants
        const createdParticipants = await base44.asServiceRole.entities.LeagueParticipant.bulkCreate(participantsToCreate);

        // Update messages with the related_entity_id
        const updatedMessages = messagesToCreate.map((msg) => {
            const correspondingParticipant = createdParticipants.find(p => p.user_id === msg.recipient_id);
            return correspondingParticipant ? { ...msg, related_entity_id: correspondingParticipant.id } : null;
        }).filter(Boolean); // Filter out any nulls if a participant wasn't created

        // Send messages (only to real users who are not the admin)
        if (updatedMessages.length > 0) {
            await base44.asServiceRole.entities.Message.bulkCreate(updatedMessages);
        }

        return new Response(JSON.stringify({ 
            success: true, 
            invited_count: participantsToCreate.length,
            messages_sent: updatedMessages.length,
            bogus_users_auto_registered: participantsToCreate.filter(p => p.user_id.startsWith('bogus_user_')).length,
            admin_joined: participantsToCreate.some(p => p.user_id === adminUser.id)
        }), {
            status: 200, headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('[sendBulkLeagueInvitations] Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to send invitations', details: error.message }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
});