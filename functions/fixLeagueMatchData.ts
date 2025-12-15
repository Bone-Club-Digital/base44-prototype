import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Ensure user is authenticated and is admin
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('[fixLeagueMatchData] Starting to fix league match data...');

        // Get all league matches
        const allMatches = await base44.asServiceRole.entities.LeagueMatch.list();
        console.log(`[fixLeagueMatchData] Found ${allMatches.length} league matches to check`);

        // Get all league participants to use as lookup
        const allParticipants = await base44.asServiceRole.entities.LeagueParticipant.list();
        const participantMap = new Map();
        allParticipants.forEach(p => {
            participantMap.set(p.user_id, {
                username: p.username,
                profile_picture_url: p.profile_picture_url
            });
        });

        let updatedCount = 0;
        let errorCount = 0;

        for (const match of allMatches) {
            try {
                const needsUpdate = !match.player_1_username || !match.player_2_username;
                
                if (needsUpdate) {
                    const player1Data = participantMap.get(match.player_1_id);
                    const player2Data = participantMap.get(match.player_2_id);

                    if (player1Data && player2Data) {
                        await base44.asServiceRole.entities.LeagueMatch.update(match.id, {
                            player_1_username: player1Data.username,
                            player_1_profile_picture_url: player1Data.profile_picture_url,
                            player_2_username: player2Data.username,
                            player_2_profile_picture_url: player2Data.profile_picture_url
                        });
                        updatedCount++;
                        console.log(`[fixLeagueMatchData] Updated match ${match.id}: ${player1Data.username} vs ${player2Data.username}`);
                    } else {
                        console.warn(`[fixLeagueMatchData] Could not find participant data for match ${match.id}`);
                        errorCount++;
                    }
                }
            } catch (error) {
                console.error(`[fixLeagueMatchData] Error updating match ${match.id}:`, error);
                errorCount++;
            }
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Fixed ${updatedCount} league matches. ${errorCount} errors encountered.`,
            details: {
                totalMatches: allMatches.length,
                updatedMatches: updatedCount,
                errors: errorCount
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[fixLeagueMatchData] Error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to fix league match data',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});