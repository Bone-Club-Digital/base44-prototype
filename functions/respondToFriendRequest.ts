import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        // IMPORTANT: We use the standard client, not the service role client.
        // This relies on the entity's RLS rules.
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user || !user.id) {
            return new Response(JSON.stringify({ error: 'Unauthorized.' }), { status: 401 });
        }

        const { friend_request_id, message_id, accepted } = await req.json();

        if (!friend_request_id || !message_id || typeof accepted !== 'boolean') {
            return new Response(JSON.stringify({ error: 'Missing required parameters.' }), { status: 400 });
        }

        // 1. Fetch the request. This will only succeed if the RLS allows it (i.e., user is the recipient).
        const friendRequest = await base44.entities.FriendRequest.get(friend_request_id);

        if (!friendRequest) {
            // If we can't find it, it's either deleted or the user doesn't have permission.
            // Let's clean up the message just in case.
            await base44.entities.Message.update(message_id, { status: 'read' });
            return new Response(JSON.stringify({ error: 'Friend request not found or you do not have permission to access it.' }), { status: 404 });
        }

        // 2. Process the acceptance or decline.
        if (accepted) {
            await base44.entities.FriendRequest.update(friend_request_id, { status: 'accepted' });
            
            // Create the two-way friendship records.
            // We use the service role here because we need to create a record for the OTHER user.
            const serviceRoleClient = base44.asServiceRole;
            await serviceRoleClient.entities.Friend.bulkCreate([
                { user_id: friendRequest.recipient_id, friend_id: friendRequest.sender_id, user_username: friendRequest.recipient_username, friend_username: friendRequest.sender_username },
                { user_id: friendRequest.sender_id, friend_id: friendRequest.recipient_id, user_username: friendRequest.sender_username, friend_username: friendRequest.recipient_username }
            ]);
        } else {
            await base44.entities.FriendRequest.update(friend_request_id, { status: 'declined' });
        }

        // 3. Mark the notification message as read.
        await base44.entities.Message.update(message_id, { status: 'read' });

        return new Response(JSON.stringify({ 
            success: true, 
            sender_username: friendRequest.sender_username 
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('[respondToFriendRequest] Error:', error);
        return new Response(JSON.stringify({ error: `Server error: ${error.message}` }), { status: 500 });
    }
});