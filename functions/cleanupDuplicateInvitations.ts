import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Ensure user is authenticated and is admin
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('[cleanupDuplicateInvitations] Starting cleanup...');

        // Fetch all club members and messages using service role
        const [allClubMembers, allMessages] = await Promise.all([
            base44.asServiceRole.entities.ClubMember.list(),
            base44.asServiceRole.entities.Message.list()
        ]);

        console.log(`[cleanupDuplicateInvitations] Found ${allClubMembers.length} ClubMember records and ${allMessages.length} Message records`);

        // Find duplicate pending invitations (same user_id + club_id combination)
        const pendingInvitations = allClubMembers.filter(member => member.status === 'pending');
        const invitationMap = new Map();
        const duplicatesToDelete = [];

        pendingInvitations.forEach(invitation => {
            const key = `${invitation.user_id}-${invitation.club_id}`;
            
            if (invitationMap.has(key)) {
                // We found a duplicate - keep the most recent one, mark others for deletion
                const existing = invitationMap.get(key);
                const existingDate = new Date(existing.created_date);
                const currentDate = new Date(invitation.created_date);
                
                if (currentDate > existingDate) {
                    // Current invitation is newer, mark the existing one for deletion
                    duplicatesToDelete.push(existing);
                    invitationMap.set(key, invitation);
                } else {
                    // Existing invitation is newer, mark current one for deletion
                    duplicatesToDelete.push(invitation);
                }
            } else {
                invitationMap.set(key, invitation);
            }
        });

        console.log(`[cleanupDuplicateInvitations] Found ${duplicatesToDelete.length} duplicate invitations to delete`);

        let deletedInvitations = 0;
        let deletedMessages = 0;

        // Delete duplicate ClubMember records and their associated messages
        for (const duplicate of duplicatesToDelete) {
            try {
                // Find associated notification messages
                const relatedMessages = allMessages.filter(msg => 
                    msg.related_entity_id === duplicate.id && 
                    msg.related_entity_type === 'ClubMember' &&
                    msg.type === 'notification'
                );

                // Delete the ClubMember record
                await base44.asServiceRole.entities.ClubMember.delete(duplicate.id);
                deletedInvitations++;
                console.log(`[cleanupDuplicateInvitations] Deleted duplicate ClubMember: ${duplicate.id} for user ${duplicate.username} in club ${duplicate.club_name}`);

                // Delete associated notification messages
                for (const message of relatedMessages) {
                    try {
                        await base44.asServiceRole.entities.Message.delete(message.id);
                        deletedMessages++;
                        console.log(`[cleanupDuplicateInvitations] Deleted associated message: ${message.id}`);
                    } catch (msgError) {
                        console.error(`[cleanupDuplicateInvitations] Failed to delete message ${message.id}:`, msgError);
                    }
                }
            } catch (error) {
                console.error(`[cleanupDuplicateInvitations] Failed to delete ClubMember ${duplicate.id}:`, error);
            }
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Cleanup complete. Deleted ${deletedInvitations} duplicate invitations and ${deletedMessages} associated messages.`,
            details: {
                totalClubMembers: allClubMembers.length,
                pendingInvitations: pendingInvitations.length,
                duplicatesFound: duplicatesToDelete.length,
                deletedInvitations,
                deletedMessages
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[cleanupDuplicateInvitations] Error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to cleanup duplicate invitations',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});