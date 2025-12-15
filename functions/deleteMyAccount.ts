import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

// Helper function to introduce a delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        const userId = String(user.id);
        const serviceClient = base44.asServiceRole;

        // 1. Pre-flight check
        const ownedClubs = await serviceClient.entities.Club.filter({ admin_id: userId });
        if (ownedClubs.length > 0) {
            const clubNames = ownedClubs.map(c => c.name).join(', ');
            return new Response(JSON.stringify({ 
                error: `You are the admin of the following club(s): ${clubNames}. Please transfer ownership or delete them before deleting your account.` 
            }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }

        // 2. Anonymize tournament data with delays
        const participantRecords = await serviceClient.entities.TournamentParticipant.filter({ user_id: userId });
        for (const record of participantRecords) {
            await serviceClient.entities.TournamentParticipant.update(record.id, { username: 'User Left', user_id: null, profile_picture_url: null });
            await delay(50);
        }

        const matchesAsPlayer1 = await serviceClient.entities.TournamentMatch.filter({ player_1_id: userId });
        for (const match of matchesAsPlayer1) {
            await serviceClient.entities.TournamentMatch.update(match.id, { player_1_username: 'User Left', player_1_id: null });
            await delay(50);
        }
        
        const matchesAsPlayer2 = await serviceClient.entities.TournamentMatch.filter({ player_2_id: userId });
        for (const match of matchesAsPlayer2) {
            await serviceClient.entities.TournamentMatch.update(match.id, { player_2_username: 'User Left', player_2_id: null });
            await delay(50);
        }

        // 3. Delete associated records with delays
        const entitiesToDeleteFrom = ['CartItem', 'RealMoneyCartItem', 'ClubEventRSVP', 'ClubMember', 'UserBadge'];
        for (const entityName of entitiesToDeleteFrom) {
            try {
                const recordsToDelete = await serviceClient.entities[entityName].filter({ user_id: userId });
                for (const record of recordsToDelete) {
                    await serviceClient.entities[entityName].delete(record.id);
                    await delay(50);
                }
            } catch (error) {
                console.warn(`Warning: Could not delete ${entityName} records for user ${userId}:`, error.message);
            }
        }
        
        // 4. Delete Messages with delays
        try {
            const sentMessages = await serviceClient.entities.Message.filter({ sender_id: userId });
            const receivedMessages = await serviceClient.entities.Message.filter({ recipient_id: userId });
            const allMessages = [...new Map([...sentMessages, ...receivedMessages].map(item => [item.id, item])).values()];
            for (const message of allMessages) {
                await serviceClient.entities.Message.delete(message.id);
                await delay(50);
            }
        } catch (error) {
            console.warn(`Warning: Could not delete messages for user ${userId}:`, error.message);
        }
        
        // 5. Delete PlayerStats
        try {
            const playerStats = await serviceClient.entities.PlayerStats.filter({ user_id: userId });
            for (const stat of playerStats) {
                await serviceClient.entities.PlayerStats.delete(stat.id);
                await delay(50);
            }
        } catch (error) {
            console.warn(`Warning: Could not delete PlayerStats for user ${userId}:`, error.message);
        }
        
        // 6. Delete GameSessions
        try {
            const gameSessionsTeal = await serviceClient.entities.GameSession.filter({ player_teal_id: userId });
            for (const game of gameSessionsTeal) {
                await serviceClient.entities.GameSession.delete(game.id);
                await delay(50);
            }
            const gameSessionsBone = await serviceClient.entities.GameSession.filter({ player_bone_id: userId });
            for (const game of gameSessionsBone) {
                await serviceClient.entities.GameSession.delete(game.id);
                await delay(50);
            }
        } catch (error) {
            console.warn(`Warning: Could not delete GameSessions for user ${userId}:`, error.message);
        }

        // 7. Delete the main User entity record
        await serviceClient.entities.User.delete(userId);

        // Note: The authentication user record is managed by Base44 and will be 
        // handled automatically when the User entity is deleted.

        return new Response(JSON.stringify({ message: 'Account deleted successfully' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Account deletion error:', error);
        return new Response(JSON.stringify({ 
            error: error.message || 'An unexpected error occurred during account deletion.',
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});