import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        // This function is called on browser close, so it's a "fire-and-forget".
        // We just need to process it and not worry about the response being read.
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user && user.id) {
            // Find the user's PlayerStats record
            const statsList = await base44.asServiceRole.entities.PlayerStats.filter({ user_id: user.id });
            
            if (statsList.length > 0) {
                // Set `last_active` to a time in the past to immediately mark them offline.
                // The heartbeat check is < 90 seconds, so 5 minutes ago is safe.
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
                await base44.asServiceRole.entities.PlayerStats.update(statsList[0].id, { last_active: fiveMinutesAgo });
            }
        }

        // Return a success response, even though it won't be read.
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        // Catch errors (e.g., auth error) but don't re-throw.
        // This is a cleanup function, so we want it to fail silently.
        console.warn(`[setUserOffline] Non-critical error during cleanup: ${error.message}`);
        return new Response(JSON.stringify({ error: 'Cleanup failed silently.' }), {
            status: 200, // Return 200 to not cause browser errors
            headers: { 'Content-Type': 'application/json' },
        });
    }
});