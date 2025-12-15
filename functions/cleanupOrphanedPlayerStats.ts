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

        console.log('[cleanupOrphanedPlayerStats] Starting cleanup...');

        // Fetch all users and player stats using service role
        const [allUsers, allPlayerStats] = await Promise.all([
            base44.asServiceRole.entities.User.list(),
            base44.asServiceRole.entities.PlayerStats.list()
        ]);

        // Create a set of existing user IDs
        const existingUserIds = new Set(allUsers.map(user => user.id));
        
        // Find orphaned PlayerStats records
        const orphanedPlayerStats = allPlayerStats.filter(stat => !existingUserIds.has(stat.user_id));
        
        console.log(`[cleanupOrphanedPlayerStats] Found ${orphanedPlayerStats.length} orphaned PlayerStats records out of ${allPlayerStats.length} total`);

        // Delete orphaned records
        let deletedCount = 0;
        for (const orphanedStat of orphanedPlayerStats) {
            try {
                await base44.asServiceRole.entities.PlayerStats.delete(orphanedStat.id);
                deletedCount++;
                console.log(`[cleanupOrphanedPlayerStats] Deleted orphaned PlayerStats for user_id: ${orphanedStat.user_id}`);
            } catch (error) {
                console.error(`[cleanupOrphanedPlayerStats] Failed to delete PlayerStats ${orphanedStat.id}:`, error);
            }
        }

        // Check for duplicate PlayerStats (same user_id)
        const userIdCounts = new Map();
        const validPlayerStats = allPlayerStats.filter(stat => existingUserIds.has(stat.user_id));
        
        validPlayerStats.forEach(stat => {
            const count = userIdCounts.get(stat.user_id) || 0;
            userIdCounts.set(stat.user_id, count + 1);
        });

        const duplicateUserIds = Array.from(userIdCounts.entries()).filter(([userId, count]) => count > 1);
        
        let duplicatesDeleted = 0; // Initialize the variable here
        
        if (duplicateUserIds.length > 0) {
            console.log(`[cleanupOrphanedPlayerStats] Found ${duplicateUserIds.length} users with duplicate PlayerStats records`);
            
            // For each user with duplicates, keep the most recent one and delete the rest
            for (const [userId, count] of duplicateUserIds) {
                const userStats = validPlayerStats.filter(stat => stat.user_id === userId);
                // Sort by created_date descending and keep the first (most recent)
                userStats.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
                
                // Delete all but the first (most recent)
                for (let i = 1; i < userStats.length; i++) {
                    try {
                        await base44.asServiceRole.entities.PlayerStats.delete(userStats[i].id);
                        duplicatesDeleted++;
                        console.log(`[cleanupOrphanedPlayerStats] Deleted duplicate PlayerStats ${userStats[i].id} for user_id: ${userId}`);
                    } catch (error) {
                        console.error(`[cleanupOrphanedPlayerStats] Failed to delete duplicate PlayerStats ${userStats[i].id}:`, error);
                    }
                }
            }
            
            console.log(`[cleanupOrphanedPlayerStats] Deleted ${duplicatesDeleted} duplicate PlayerStats records`);
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Cleanup complete. Deleted ${deletedCount} orphaned records and ${duplicatesDeleted} duplicate records.`,
            details: {
                totalPlayerStats: allPlayerStats.length,
                orphanedDeleted: deletedCount,
                duplicatesDeleted: duplicatesDeleted,
                usersWithDuplicates: duplicateUserIds.length
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[cleanupOrphanedPlayerStats] Error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to cleanup orphaned PlayerStats',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});