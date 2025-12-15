import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.id) {
            return new Response(JSON.stringify({ error: 'Unauthorized.' }), { status: 401 });
        }

        const serviceRoleClient = base44.asServiceRole;

        // 1. Find all unread friend request notifications for the user
        const messages = await serviceRoleClient.entities.Message.filter({
            recipient_id: user.id,
            status: 'unread',
            related_entity_type: 'FriendRequest'
        });

        if (messages.length === 0) {
            return new Response(JSON.stringify({ success: true, message: 'No stale friend requests found.' }), { status: 200 });
        }

        // 2. Get the IDs of the FriendRequest entities these messages point to
        const requestIdsFromMessages = messages.map(m => m.related_entity_id).filter(Boolean);

        // 3. Find which of these FriendRequests actually still exist
        const existingRequests = await serviceRoleClient.entities.FriendRequest.filter({
            id: { '$in': requestIdsFromMessages }
        });
        const existingRequestIds = new Set(existingRequests.map(r => r.id));

        // 4. Identify which messages are "stale" (point to a non-existent FriendRequest)
        const staleMessageIds = messages
            .filter(m => !existingRequestIds.has(m.related_entity_id))
            .map(m => m.id);

        if (staleMessageIds.length === 0) {
            return new Response(JSON.stringify({ success: true, message: 'No stale friend requests found.' }), { status: 200 });
        }

        // 5. Mark all stale messages as 'read' to hide them
        const updatePromises = staleMessageIds.map(id =>
            serviceRoleClient.entities.Message.update(id, { status: 'read' })
        );
        await Promise.all(updatePromises);

        return new Response(JSON.stringify({
            success: true,
            message: `Successfully cleaned up ${staleMessageIds.length} stale friend requests.`
        }), { status: 200 });

    } catch (error) {
        console.error('Error cleaning up stale friend requests:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});