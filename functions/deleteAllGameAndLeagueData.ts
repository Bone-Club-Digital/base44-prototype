import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Step 1: Authenticate and authorize the user as an admin
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

        // Use the service role to bypass any RLS for deletion
        const adminClient = base44.asServiceRole;

        // Helper function to add delay between operations
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // Step 2: Fetch all records from all relevant entities
        console.log('[deleteAllGameAndLeagueData] Fetching all records...');
        const [
            proposals, 
            matches, 
            leagues, 
            gameSessions, 
            scheduledMatches
        ] = await Promise.all([
            adminClient.entities.LeagueMatchProposal.list(),
            adminClient.entities.LeagueMatch.list(),
            adminClient.entities.League.list(),
            adminClient.entities.GameSession.list(),
            adminClient.entities.ScheduledMatch.list()
        ]);

        const deletionCounts = {
            proposals: proposals.length,
            matches: matches.length,
            leagues: leagues.length,
            gameSessions: gameSessions.length,
            scheduledMatches: scheduledMatches.length,
        };

        console.log('[deleteAllGameAndLeagueData] Found records to delete:', deletionCounts);

        // Step 3: Delete records in order with delays to avoid rate limits
        
        // Delete proposals first
        if (proposals.length > 0) {
            console.log(`[deleteAllGameAndLeagueData] Deleting ${proposals.length} proposals...`);
            for (let i = 0; i < proposals.length; i++) {
                await adminClient.entities.LeagueMatchProposal.delete(proposals[i].id);
                if (i % 5 === 0 && i > 0) await delay(200); // Delay every 5 deletions
            }
        }

        // Delete matches
        if (matches.length > 0) {
            console.log(`[deleteAllGameAndLeagueData] Deleting ${matches.length} league matches...`);
            for (let i = 0; i < matches.length; i++) {
                await adminClient.entities.LeagueMatch.delete(matches[i].id);
                if (i % 5 === 0 && i > 0) await delay(200); // Delay every 5 deletions
            }
        }

        // Delete game sessions with more frequent delays since there might be many
        if (gameSessions.length > 0) {
            console.log(`[deleteAllGameAndLeagueData] Deleting ${gameSessions.length} game sessions...`);
            for (let i = 0; i < gameSessions.length; i++) {
                await adminClient.entities.GameSession.delete(gameSessions[i].id);
                if (i % 3 === 0 && i > 0) await delay(300); // More frequent delays for game sessions
            }
        }

        // Delete scheduled matches
        if (scheduledMatches.length > 0) {
            console.log(`[deleteAllGameAndLeagueData] Deleting ${scheduledMatches.length} scheduled matches...`);
            for (let i = 0; i < scheduledMatches.length; i++) {
                await adminClient.entities.ScheduledMatch.delete(scheduledMatches[i].id);
                if (i % 5 === 0 && i > 0) await delay(200); // Delay every 5 deletions
            }
        }

        // Delete leagues last
        if (leagues.length > 0) {
            console.log(`[deleteAllGameAndLeagueData] Deleting ${leagues.length} leagues...`);
            for (let i = 0; i < leagues.length; i++) {
                await adminClient.entities.League.delete(leagues[i].id);
                if (i % 5 === 0 && i > 0) await delay(200); // Delay every 5 deletions
            }
        }

        console.log('[deleteAllGameAndLeagueData] All deletions completed successfully');

        return new Response(JSON.stringify({
            success: true,
            message: 'All game and league data has been successfully deleted.',
            deletedCounts: deletionCounts
        }), {
            status: 200, headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[deleteAllGameAndLeagueData] Error:', error);
        return new Response(JSON.stringify({
            error: 'An error occurred during data deletion.',
            details: error.message
        }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        });
    }
});