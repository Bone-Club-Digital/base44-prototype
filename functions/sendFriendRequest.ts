import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.id) {
            return new Response(JSON.stringify({ error: 'Unauthorized. Please log in.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        const { recipient_id, recipient_username } = await req.json();

        if (!recipient_id || !recipient_username) {
            return new Response(JSON.stringify({ error: 'Recipient ID and username are required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        
        if (recipient_id === user.id) {
             return new Response(JSON.stringify({ error: 'You cannot send a friend request to yourself.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const serviceRoleClient = base44.asServiceRole;

        const { data: existingRequests } = await serviceRoleClient.entities.FriendRequest.filter({
            $or: [
                { sender_id: user.id, recipient_id: recipient_id },
                { sender_id: recipient_id, recipient_id: user.id }
            ],
            status: { $in: ['pending', 'accepted'] }
        });

        if (existingRequests && existingRequests.length > 0) {
             if (existingRequests[0].status === 'accepted') {
                return new Response(JSON.stringify({ error: 'You are already friends with this user.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
             }
            return new Response(JSON.stringify({ error: 'A friend request is already pending between you and this user.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // CORRECTED: The 'create' method returns the object directly, not { data, error }.
        const friendRequest = await serviceRoleClient.entities.FriendRequest.create({
            sender_id: user.id,
            sender_username: user.username || user.full_name || 'A User',
            recipient_id: recipient_id,
            recipient_username: recipient_username,
            status: 'pending'
        });

        // CORRECTED: Check if the returned object is valid.
        if (!friendRequest || !friendRequest.id) {
            throw new Error('Failed to create friend request record.');
        }

        // CORRECTED: The 'create' method returns the object directly.
        const message = await serviceRoleClient.entities.Message.create({
            sender_id: 'system',
            sender_username: 'Bone Club',
            recipient_id: recipient_id,
            recipient_username: recipient_username,
            type: 'notification',
            subject: 'Friend Request',
            body: `${user.username || 'A user'} sent you a friend request.`,
            status: 'unread',
            related_entity_id: friendRequest.id,
            related_entity_type: 'FriendRequest'
        });

        if (!message || !message.id) {
            console.error(`CRITICAL: FriendRequest ${friendRequest.id} created, but failed to create notification Message.`);
        }

        return new Response(JSON.stringify({ success: true, friendRequest }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('[sendFriendRequest] An error occurred:', error);
        return new Response(JSON.stringify({ error: `Server error: ${error.message}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});