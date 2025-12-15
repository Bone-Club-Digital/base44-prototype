import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.id) {
            return new Response(JSON.stringify({ error: 'Unauthorized.' }), { status: 401 });
        }

        const serviceRoleClient = base44.asServiceRole;

        // Get all messages for this user that are friend request notifications
        const messages = await serviceRoleClient.entities.Message.filter({
            recipient_id: user.id,
            related_entity_type: 'FriendRequest',
            status: 'unread'
        });

        // Get all friend requests in the database
        const allFriendRequests = await serviceRoleClient.entities.FriendRequest.list();

        const result = {
            user_id: user.id,
            user_username: user.username,
            unread_friend_request_messages: messages.length,
            total_friend_requests_in_db: allFriendRequests.length,
            messages: messages.map(m => ({
                message_id: m.id,
                sender_username: m.sender_username,
                related_entity_id: m.related_entity_id,
                subject: m.subject,
                body: m.body
            })),
            all_friend_requests: allFriendRequests.map(fr => ({
                id: fr.id,
                sender_username: fr.sender_username,
                recipient_username: fr.recipient_username,
                status: fr.status,
                created_date: fr.created_date
            })),
            orphaned_messages: []
        };

        // Find messages that point to non-existent friend requests
        messages.forEach(message => {
            const requestExists = allFriendRequests.some(fr => fr.id === message.related_entity_id);
            if (!requestExists) {
                result.orphaned_messages.push({
                    message_id: message.id,
                    points_to_missing_request_id: message.related_entity_id,
                    sender_username: message.sender_username
                });
            }
        });

        return new Response(JSON.stringify(result, null, 2), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error('Debug error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});