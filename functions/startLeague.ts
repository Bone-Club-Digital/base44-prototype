
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

// Function to create pairs of players for round-robin
function createPairs(players) {
    const pairs = [];
    for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
            pairs.push([players[i], players[j]]);
        }
    }
    return pairs;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // 1. Authorization
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { 'Content-Type': 'application/json' }
            });
        }
        const user = await base44.auth.me();

        const { league_id } = await req.json();
        if (!league_id) {
            return new Response(JSON.stringify({ error: 'League ID is required' }), {
                status: 400, headers: { 'Content-Type': 'application/json' }
            });
        }

        const league = await base44.asServiceRole.entities.League.get(league_id);
        const leagueFormat = league.format || 'round_robin';
        console.log(`[startLeague] League format is: ${leagueFormat}`);

        if (league.admin_user_id !== user.id && user.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Forbidden: Only league admins can start a league.' }), {
                status: 403, headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. Fetch existing divisions and participants
        const divisions = await base44.asServiceRole.entities.Division.filter({ league_id });
        if (divisions.length === 0) {
            return new Response(JSON.stringify({ error: 'No divisions found. Please generate divisions before starting the league.' }), {
                status: 400, headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const participants = await base44.asServiceRole.entities.LeagueParticipant.filter({ league_id, status: { '$in': ['active', 'registered'] } });
        const participantsByDivision = new Map(divisions.map(d => [d.id, []]));
        participants.forEach(p => {
            if (p.division_id && participantsByDivision.has(p.division_id)) {
                participantsByDivision.get(p.division_id).push(p);
            }
        });


        // 3. Create Matches for each division
        const participantMap = new Map(participants.map(p => [p.user_id, p]));
        let totalMatchesCreated = 0;
        let totalErrors = 0;

        for (const division of divisions) {
            console.log(`[startLeague] Creating matches for Division ${division.division_number}`);
            const playersInDivision = participantsByDivision.get(division.id) || [];
            const playerIdsInDivision = playersInDivision.map(p => p.user_id);
            const allPairs = createPairs(playerIdsInDivision);
            
            const matchCreationPromises = [];

            allPairs.forEach(pair => {
                const player1 = participantMap.get(pair[0]);
                const player2 = participantMap.get(pair[1]);

                if (!player1 || !player2) {
                    console.warn(`[startLeague] Could not find participant details for pair: ${pair[0]}, ${pair[1]} in division ${division.id}`);
                    return; // Skip this pair
                }

                const baseMatchData = {
                    league_id: league.id,
                    division_id: division.id,
                    player_1_id: player1.user_id,
                    player_1_username: player1.username,
                    player_1_profile_picture_url: player1.profile_picture_url,
                    player_2_id: player2.user_id,
                    player_2_username: player2.username,
                    player_2_profile_picture_url: player2.profile_picture_url,
                    status: 'unarranged',
                };

                // Create first leg
                matchCreationPromises.push(
                    base44.asServiceRole.entities.LeagueMatch.create({ ...baseMatchData, leg: 1 })
                );

                // If double round robin, create second leg
                if (leagueFormat === 'double_round_robin') {
                    matchCreationPromises.push(
                        base44.asServiceRole.entities.LeagueMatch.create({ ...baseMatchData, leg: 2 })
                    );
                }
            });

            // Use allSettled to prevent one failure from stopping all creations
            const results = await Promise.allSettled(matchCreationPromises);
            
            results.forEach((result) => {
                if (result.status === 'fulfilled') {
                    totalMatchesCreated++;
                } else {
                    totalErrors++;
                    console.error(`[startLeague] Failed to create a match:`, result.reason);
                }
            });
        }
        
        // 4. Update League Status
        await base44.asServiceRole.entities.League.update(league_id, {
            status: 'in_progress',
            start_date: new Date().toISOString()
        });

        const successMessage = `League started successfully! Created ${totalMatchesCreated} matches.`;
        console.log(successMessage, `Errors: ${totalErrors}`);

        return new Response(JSON.stringify({
            success: true,
            message: successMessage,
            matches_created: totalMatchesCreated,
            errors: totalErrors,
        }), {
            status: 200, headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[startLeague] Critical Error:', error);
        return new Response(JSON.stringify({
            error: 'A critical error occurred while starting the league.',
            details: error.message
        }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        });
    }
});
