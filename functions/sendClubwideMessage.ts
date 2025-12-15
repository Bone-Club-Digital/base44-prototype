import { createClient } from 'npm:@base44/sdk@0.1.0';

// Helper to generate a UUID
const generateUUID = () => {
    // Basic implementation of UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

Deno.serve(async (req) => {
    try {
        const base44 = createClient({ appId: Deno.env.get('BASE44_APP_ID') });

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        const token = authHeader.split(' ')[1];
        base44.auth.setToken(token);
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        const { club_id, club_name, subject, body, thread_id: existing_thread_id } = await req.json();
        
        if (!club_id || !club_name || !subject || !body) {
            return new Response(JSON.stringify({ error: 'club_id, club_name, subject, and body are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        
        const allMembers = await base44.entities.ClubMember.filter({ club_id: club_id, status: 'active' });
        const recipients = allMembers.filter(member => member.user_id !== user.id);

        if (recipients.length === 0) {
            return new Response(JSON.stringify({ success: true, messages: [], info: 'Message sent only to yourself as you are the only member.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        const thread_id = existing_thread_id || generateUUID();
        
        const messagePromises = recipients.map(member => {
            const messageData = {
                sender_id: user.id,
                sender_username: user.username || user.full_name,
                recipient_id: member.user_id,
                recipient_username: member.username || 'Member',
                type: 'user_message',
                subject,
                body,
                status: 'unread',
                thread_id: thread_id,
                club_name,
                club_id
            };
            return base44.entities.Message.create(messageData);
        });
        
        // Also create a "sent" message for the sender so they see it in their thread
        const senderMessageData = {
            sender_id: user.id,
            sender_username: user.username || user.full_name,
            recipient_id: user.id, // Sender is the recipient of their own broadcast record
            recipient_username: 'Club Broadcast',
            type: 'user_message',
            subject,
            body,
            status: 'read', // Mark sender's copy as read
            thread_id: thread_id,
            club_name,
            club_id
        };
        messagePromises.push(base44.entities.Message.create(senderMessageData));

        const createdMessages = await Promise.all(messagePromises);

        return new Response(JSON.stringify({ success: true, messages: createdMessages }), {
            status: 200, headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error in sendClubwideMessage function:", error);
        return new Response(JSON.stringify({ error: "Internal server error", details: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        });
    }
});