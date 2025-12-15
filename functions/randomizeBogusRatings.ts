import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

const bogusUserIds = [
  "bogus_user_001", "bogus_user_002", "bogus_user_003", "bogus_user_004", "bogus_user_005",
  "bogus_user_006", "bogus_user_007", "bogus_user_008", "bogus_user_009", "bogus_user_010"
];

// Helper function to generate a random rating between min and max (inclusive)
function getRandomRating(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Ensure user is authenticated and an admin
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const user = await base44.auth.me();
        if (user.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('[randomizeBogusRatings] Starting to randomize ratings for bogus users...');

        // Fetch existing PlayerStats for bogus users
        const bogusPlayerStats = await base44.asServiceRole.entities.PlayerStats.filter({
            user_id: { '$in': bogusUserIds }
        });

        if (bogusPlayerStats.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                message: 'No bogus user PlayerStats found to update.'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`[randomizeBogusRatings] Found ${bogusPlayerStats.length} bogus PlayerStats records to update`);

        let updatedCount = 0;
        const updateResults = [];

        // Update each bogus user's rating
        for (const playerStat of bogusPlayerStats) {
            try {
                const newRating = getRandomRating(1000, 2000);
                const oldRating = playerStat.rating;

                await base44.asServiceRole.entities.PlayerStats.update(playerStat.id, {
                    rating: newRating
                });

                updatedCount++;
                updateResults.push({
                    username: playerStat.username,
                    oldRating: oldRating,
                    newRating: newRating
                });

                console.log(`[randomizeBogusRatings] Updated ${playerStat.username}: ${oldRating} → ${newRating}`);
            } catch (error) {
                console.error(`[randomizeBogusRatings] Failed to update ${playerStat.username}:`, error);
                updateResults.push({
                    username: playerStat.username,
                    error: error.message
                });
            }
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Successfully randomized ratings for ${updatedCount} out of ${bogusPlayerStats.length} bogus users.`,
            details: {
                totalFound: bogusPlayerStats.length,
                totalUpdated: updatedCount,
                updateResults: updateResults
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[randomizeBogusRatings] Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to randomize bogus ratings',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});