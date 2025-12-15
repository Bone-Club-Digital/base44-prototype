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

        console.log(`[cleanupStuckChallenges] User ${user.username} requesting immediate cleanup.`);

        // --- 1. Cleanup GameSessions (Instant Challenges) ---
        const stuckGameSessions = await base44.asServiceRole.entities.GameSession.filter({
            $or: [{ player_teal_id: user.id }, { player_bone_id: user.id }],
            status: { $in: ['waiting_for_opponent', 'waiting_for_start'] }
        });
        
        let cleanedGameSessions = 0;
        if (stuckGameSessions.length > 0) {
            console.log(`[cleanupStuckChallenges] Found ${stuckGameSessions.length} pending/stuck GameSessions to clear.`);
            for (const game of stuckGameSessions) {
                await base44.asServiceRole.entities.GameSession.delete(game.id);
                cleanedGameSessions++;
            }
        }

        // --- 2. Cleanup ScheduledMatches (Arranged/Pending Invites) ---
        const pendingScheduledMatches = await base44.asServiceRole.entities.ScheduledMatch.filter({
            $or: [{ organizer_id: user.id }, { opponent_id: user.id }],
            status: 'pending'
        });

        let cleanedScheduledMatches = 0;
        if (pendingScheduledMatches.length > 0) {
            console.log(`[cleanupStuckChallenges] Found ${pendingScheduledMatches.length} pending ScheduledMatches to clear.`);
            const scheduledMatchIdsToDelete = pendingScheduledMatches.map(m => m.id);

            // Delete the ScheduledMatch records
            for (const matchId of scheduledMatchIdsToDelete) {
                await base44.asServiceRole.entities.ScheduledMatch.delete(matchId);
                cleanedScheduledMatches++;
            }

            // --- 3. Mark related messages as 'read' ---
            const relatedMessages = await base44.asServiceRole.entities.Message.filter({
                related_entity_id: { '$in': scheduledMatchIdsToDelete },
                related_entity_type: 'ScheduledMatch',
                recipient_id: user.id,
                status: 'unread'
            });

            if (relatedMessages.length > 0) {
                console.log(`[cleanupStuckChallenges] Found ${relatedMessages.length} related messages to mark as read.`);
                for (const message of relatedMessages) {
                    await base44.asServiceRole.entities.Message.update(message.id, { status: 'read' });
                }
            }
        }

        const totalCleaned = cleanedGameSessions + cleanedScheduledMatches;

        return new Response(JSON.stringify({ 
            success: true, 
            cleanedCount: totalCleaned,
            message: `Successfully cleaned up ${totalCleaned} pending challenges and invitations.`
        }), {
            status: 200, headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('[cleanupStuckChallenges] Error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to cleanup stuck challenges',
            details: error.message
        }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
});