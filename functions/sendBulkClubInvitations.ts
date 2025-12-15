import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // 1. Ensure user is authenticated
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { 'Content-Type': 'application/json' }
            });
        }

        const callingUser = await base44.auth.me();
        const { club_id, club_name, users_to_invite } = await req.json();

        if (!club_id || !club_name || !users_to_invite || !Array.isArray(users_to_invite)) {
            return new Response(JSON.stringify({ error: 'Missing or invalid required fields' }), {
                status: 400, headers: { 'Content-Type': 'application/json' }
            });
        }
        
        console.log(`[sendBulkClubInvitations] Initiated by ${callingUser.username} for club ${club_name} to invite ${users_to_invite.length} users.`);

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
        
        console.log(`[sendBulkClubInvitations] Admin check passed for ${callingUser.username}.`);

        // 3. Get existing memberships for this club
        const existingMemberships = await base44.asServiceRole.entities.ClubMember.filter({ club_id });
        const existingUserIds = new Set(existingMemberships.map(m => m.user_id));

        const results = { sent: [], failed: [], skipped: [] };
        
        // 4. Loop through users and create invitations, but skip duplicates
        for (const user of users_to_invite) {
            try {
                // Check if user already has membership (active or pending)
                if (existingUserIds.has(user.user_id)) {
                    const existingMembership = existingMemberships.find(m => m.user_id === user.user_id);
                    const status = existingMembership.status === 'active' ? 'already a member' : 'already invited';
                    results.skipped.push({ username: user.username, reason: status });
                    continue;
                }

                // Create ClubMember record
                const invitation = await base44.asServiceRole.entities.ClubMember.create({
                    club_id,
                    club_name,
                    user_id: user.user_id,
                    username: user.username,
                    status: 'pending'
                });

                // Create a notification message for the invitee
                const notificationPayload = {
                    sender_id: 'system',
                    sender_username: 'Bone Club System',
                    recipient_id: user.user_id,
                    recipient_username: user.username,
                    type: 'notification',
                    subject: `Club Invitation: ${club_name}`,
                    body: `You have been invited to join **${club_name}** by ${callingUser.username || callingUser.full_name}. You can accept or decline this invitation from your Messages or Clubs page.`,
                    status: 'unread',
                    related_entity_id: invitation.id,
                    related_entity_type: 'ClubMember'
                };
                
                await base44.asServiceRole.entities.Message.create(notificationPayload);
                results.sent.push(user.username);
            } catch (e) {
                console.error(`Failed to invite user ${user.username}:`, e);
                results.failed.push({ username: user.username, error: e.message });
            }
        }

        return new Response(JSON.stringify({ success: true, results }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[sendBulkClubInvitations] CRITICAL ERROR:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to send bulk club invitations', 
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});