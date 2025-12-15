import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    console.log('\n=== NEW DEBUG (handleFriendRequestResponse) START ===');
    
    const serviceRoleClient = createClientFromRequest(req).asServiceRole;

    try {
        const user = await createClientFromRequest(req).auth.me();
        if (!user || !user.id) {
            console.log('[DEBUG] User not authenticated');
            return new Response(JSON.stringify({ error: 'Unauthorized.' }), { status: 401 });
        }

        console.log(`[DEBUG] Authenticated user: ${user.username} (${user.id})`);

        const body = await req.json();
        console.log('[DEBUG] Request body received:', JSON.stringify(body, null, 2));

        const { message_id, accepted } = body;

        if (!message_id || typeof accepted !== 'boolean') {
            console.log('[DEBUG] Missing required parameters in body');
            return new Response(JSON.stringify({ error: 'Message ID and acceptance status are required.' }), { status: 400 });
        }

        console.log(`[DEBUG] Processing message_id: "${message_id}", accepted: ${accepted}`);

        // Step 1: Fetch the Message record
        let message;
        try {
            console.log(`[DEBUG] Attempting to fetch message with ID: "${message_id}"`);
            message = await serviceRoleClient.entities.Message.get(message_id);
            console.log('[DEBUG] Message found:', JSON.stringify(message, null, 2));
        } catch (e) {
            console.log(`[DEBUG] CRITICAL FAILURE: Could not fetch message with ID "${message_id}". Error: ${e.message}`);
            return new Response(JSON.stringify({ error: 'Notification message not found.' }), { status: 404 });
        }

        const friendRequestIdFromMessage = message.related_entity_id;
        if (!friendRequestIdFromMessage) {
            console.log('[DEBUG] Message has no related_entity_id. Cleaning up.');
            await serviceRoleClient.entities.Message.update(message_id, { status: 'read' });
            return new Response(JSON.stringify({ error: 'Notification is invalid and has been cleared.' }), { status: 410 });
        }
        
        console.log(`[DEBUG] FriendRequest ID from message is: "${friendRequestIdFromMessage}"`);

        // Step 2: List ALL FriendRequests to see what the database returns at this moment
        let allFriendRequests = [];
        try {
            allFriendRequests = await serviceRoleClient.entities.FriendRequest.list();
            console.log(`[DEBUG] Found ${allFriendRequests.length} total FriendRequest records in the database.`);
        } catch (e) {
            console.log(`[DEBUG] CRITICAL FAILURE: Could not list FriendRequests. Error: ${e.message}`);
            return new Response(JSON.stringify({ error: 'Could not access FriendRequest data.' }), { status: 500 });
        }

        // Step 3: Explicitly check if our ID exists in the list
        let friendRequestFound = null;
        let matchFound = false;

        console.log('[DEBUG] Iterating through all found FriendRequests to find a match...');
        allFriendRequests.forEach((fr, index) => {
            console.log(`  - Record ${index}: ID is "${fr.id}"`);
            if (fr.id === friendRequestIdFromMessage) {
                console.log(`  [SUCCESS] Match found! ID "${fr.id}" matches the message's related_entity_id.`);
                friendRequestFound = fr;
                matchFound = true;
            }
        });

        if (!matchFound) {
            console.log(`[DEBUG] CRITICAL FAILURE: The FriendRequest ID "${friendRequestIdFromMessage}" from the message was NOT FOUND in the list of ${allFriendRequests.length} records retrieved from the database.`);
             // Even though it failed, let's try a direct filter one last time as a sanity check.
            const filtered = await serviceRoleClient.entities.FriendRequest.filter({ id: friendRequestIdFromMessage });
            if (filtered && filtered.length > 0) {
                 console.log("[DEBUG] INCREDIBLY STRANGE: .list() failed but .filter() found the record. Proceeding anyway.");
                 friendRequestFound = filtered[0];
            } else {
                console.log("[DEBUG] .filter() also failed to find the record. It is definitely not accessible. Marking message as stale.");
                await serviceRoleClient.entities.Message.update(message_id, { status: 'read' });
                return new Response(JSON.stringify({ 
                    error: 'This friend request is no longer valid. The notification has been cleared.',
                    stale_request: true,
                    debug_searched_id: friendRequestIdFromMessage
                }), { status: 410, headers: { 'Content-Type': 'application/json' } });
            }
        }

        if (!friendRequestFound) {
            // This is a fallback if the weird filter logic still resulted in nothing.
             return new Response(JSON.stringify({ error: 'Could not resolve friend request.'}), { status: 500 });
        }
        
        console.log('[DEBUG] Proceeding with found FriendRequest:', JSON.stringify(friendRequestFound, null, 2));

        // Step 4: Security check
        if (friendRequestFound.recipient_id !== user.id) {
            console.log(`[DEBUG] Authorization failed: request recipient ${friendRequestFound.recipient_id} != current user ${user.id}`);
            return new Response(JSON.stringify({ error: 'Not authorized to respond to this request.' }), { status: 403 });
        }

        // Step 5: Process the request
        console.log(`[DEBUG] Processing ${accepted ? 'acceptance' : 'decline'}...`);
        if (accepted) {
            await serviceRoleClient.entities.FriendRequest.update(friendRequestFound.id, { status: 'accepted' });
            console.log('[DEBUG] Updated friend request to accepted');
            
            await serviceRoleClient.entities.Friend.bulkCreate([
                { user_id: friendRequestFound.recipient_id, friend_id: friendRequestFound.sender_id, user_username: friendRequestFound.recipient_username, friend_username: friendRequestFound.sender_username },
                { user_id: friendRequestFound.sender_id, friend_id: friendRequestFound.recipient_id, user_username: friendRequestFound.sender_username, friend_username: friendRequestFound.recipient_username }
            ]);
            console.log('[DEBUG] Created friendship records');
        } else {
            await serviceRoleClient.entities.FriendRequest.update(friendRequestFound.id, { status: 'declined' });
            console.log('[DEBUG] Updated friend request to declined');
        }
        
        // Step 6: Mark message as read
        await serviceRoleClient.entities.Message.update(message_id, { status: 'read' });
        console.log('[DEBUG] Marked message as read');

        console.log('[DEBUG] FINAL SUCCESS! Returning success response.');
        console.log('=== NEW DEBUG (handleFriendRequestResponse) END ===\n');

        return new Response(JSON.stringify({ 
            success: true, 
            sender_username: friendRequestFound.sender_username 
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('[FATAL] Uncaught error in handleFriendRequestResponse:', error);
        console.log('=== NEW DEBUG (handleFriendRequestResponse) END WITH ERROR ===\n');
        return new Response(JSON.stringify({ error: `Server error: ${error.message}` }), { status: 500 });
    }
});