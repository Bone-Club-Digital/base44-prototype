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

        // Step 2: Fetch all messages
        console.log('[deleteAllMessages] Fetching all messages...');
        const allMessages = await adminClient.entities.Message.list();

        console.log(`[deleteAllMessages] Found ${allMessages.length} messages to delete`);

        // Step 3: Delete all messages with delays to avoid rate limits
        let deletedCount = 0;
        
        if (allMessages.length > 0) {
            console.log(`[deleteAllMessages] Deleting ${allMessages.length} messages...`);
            
            for (let i = 0; i < allMessages.length; i++) {
                try {
                    await adminClient.entities.Message.delete(allMessages[i].id);
                    deletedCount++;
                    
                    // Add delay every 10 deletions to avoid overwhelming the system
                    if (i % 10 === 0 && i > 0) {
                        await delay(200);
                    }
                } catch (error) {
                    console.error(`[deleteAllMessages] Failed to delete message ${allMessages[i].id}:`, error);
                }
            }
        }

        console.log(`[deleteAllMessages] Successfully deleted ${deletedCount} messages`);

        return new Response(JSON.stringify({
            success: true,
            message: `Successfully deleted ${deletedCount} messages.`,
            deletedCount: deletedCount,
            totalFound: allMessages.length
        }), {
            status: 200, headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[deleteAllMessages] Error:', error);
        return new Response(JSON.stringify({
            error: 'An error occurred during message deletion.',
            details: error.message
        }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        });
    }
});