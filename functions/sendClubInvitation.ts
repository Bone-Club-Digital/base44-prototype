import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // 1. Ensure user is authenticated
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const callingUser = await base44.auth.me();
        const { club_id, club_name, user_id, username } = await req.json();

        if (!club_id || !club_name || !user_id || !username) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        console.log(`[sendClubInvitation] Initiated by ${callingUser.username} for club ${club_name} to invite ${username}`);

        // 2. Verify the calling user is an admin of the club
        const club = await base44.asServiceRole.entities.Club.get(club_id);
        if (!club) {
            return new Response(JSON.stringify({ error: 'Club not found' }), {
                status: 404, headers: { 'Content-Type': 'application/json' }
            });
        }

        const isAdmin = club.admin_id === callingUser.id || (club.admin_ids && club.admin_ids.includes(callingUser.id));
        if (!isAdmin) {
             return new Response(JSON.stringify({ error: 'Forbidden: You are not an admin of this club.' }), {
                status: 403, headers: { 'Content-Type': 'application/json' }
            });
        }
        
        console.log(`[sendClubInvitation] Admin check for ${callingUser.username} passed.`);

        // 3. Check if user already has a pending or active membership
        const existingMemberships = await base44.asServiceRole.entities.ClubMember.filter({
            club_id: club_id,
            user_id: user_id
        });

        if (existingMemberships.length > 0) {
            const existingMembership = existingMemberships[0];
            if (existingMembership.status === 'active') {
                return new Response(JSON.stringify({ error: 'User is already a member of this club.' }), {
                    status: 400, headers: { 'Content-Type': 'application/json' }
                });
            } else if (existingMembership.status === 'pending') {
                return new Response(JSON.stringify({ error: 'User already has a pending invitation to this club.' }), {
                    status: 400, headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // 4. Create invitation and message using service role
        const invitation = await base44.asServiceRole.entities.ClubMember.create({
            club_id,
            club_name,
            user_id,
            username,
            status: 'pending'
        });
        console.log(`[sendClubInvitation] Created pending ClubMember record: ${invitation.id}`);

        // Create a notification message for the invitee
        const notificationPayload = {
            sender_id: 'system',
            sender_username: 'Bone Club System',
            recipient_id: user_id,
            recipient_username: username,
            type: 'notification',
            subject: `Club Invitation: ${club_name}`,
            body: `You have been invited to join **${club_name}** by ${callingUser.username || callingUser.full_name}. You can accept or decline the invitation here or from the Clubs page.`,
            status: 'unread',
            related_entity_id: invitation.id,
            related_entity_type: 'ClubMember'
        };
        
        const notificationMessage = await base44.asServiceRole.entities.Message.create(notificationPayload);
        console.log(`[sendClubInvitation] Created notification Message record: ${notificationMessage.id}`);

        return new Response(JSON.stringify({ success: true, invitation }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[sendClubInvitation] CRITICAL ERROR:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to send club invitation', 
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});