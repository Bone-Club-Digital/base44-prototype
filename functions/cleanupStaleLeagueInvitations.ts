import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Authenticate and authorize the user as an admin
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { 'Content-Type': 'application/json' }
            });
        }

        const user = await base44.auth.me();
        if (user.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
                status: 403, headers: { 'Content-Type': 'application/json' }
            });
        }

        // Use service role for admin operations
        const adminClient = base44.asServiceRole;

        console.log('[cleanupStaleLeagueInvitations] Starting cleanup...');

        // Step 1: Find all league invitation messages
        const leagueInvitationMessages = await adminClient.entities.Message.filter({
            related_entity_type: 'LeagueParticipant',
            type: 'notification'
        });

        console.log(`[cleanupStaleLeagueInvitations] Found ${leagueInvitationMessages.length} league invitation messages`);

        let deletedMessages = 0;
        let validMessages = 0;
        let errors = 0;

        // Step 2: Check each message and clean up stale ones
        for (const message of leagueInvitationMessages) {
            try {
                if (!message.related_entity_id) {
                    // Message has no related entity, delete it
                    await adminClient.entities.Message.delete(message.id);
                    deletedMessages++;
                    console.log(`[cleanupStaleLeagueInvitations] Deleted message ${message.id} - no related entity`);
                    continue;
                }

                // Check if the LeagueParticipant still exists
                try {
                    const participant = await adminClient.entities.LeagueParticipant.get(message.related_entity_id);
                    
                    // If participant exists, check if it's still in invited status
                    if (participant.status !== 'invited') {
                        // Participant has been processed (accepted/declined), mark message as read
                        await adminClient.entities.Message.update(message.id, { status: 'read' });
                        console.log(`[cleanupStaleLeagueInvitations] Marked message ${message.id} as read - participant status is ${participant.status}`);
                    }
                    validMessages++;
                    
                } catch (participantError) {
                    if (participantError.response && participantError.response.status === 404) {
                        // LeagueParticipant doesn't exist, delete the message
                        await adminClient.entities.Message.delete(message.id);
                        deletedMessages++;
                        console.log(`[cleanupStaleLeagueInvitations] Deleted message ${message.id} - participant not found`);
                    } else {
                        throw participantError; // Re-throw non-404 errors
                    }
                }
                
            } catch (error) {
                console.error(`[cleanupStaleLeagueInvitations] Error processing message ${message.id}:`, error);
                errors++;
            }
        }

        const summary = {
            success: true,
            totalMessagesFound: leagueInvitationMessages.length,
            deletedMessages,
            validMessages,
            errors,
            message: `Cleanup completed. Deleted ${deletedMessages} stale messages, kept ${validMessages} valid messages, encountered ${errors} errors.`
        };

        console.log('[cleanupStaleLeagueInvitations] Cleanup summary:', summary);

        return new Response(JSON.stringify(summary), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[cleanupStaleLeagueInvitations] Critical error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to cleanup stale league invitations',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});