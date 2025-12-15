import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { "Content-Type": "application/json" }
            });
        }

        const user = await base44.auth.me();
        const { user_id } = await req.json();
        const targetUserId = user_id || user.id;

        console.log('[debugLeagueMatches] Debugging for user ID:', targetUserId);

        // Get ALL league match proposals for this user (any status)
        const allProposals = await base44.asServiceRole.entities.LeagueMatchProposal.filter({
            recipient_id: targetUserId
        });

        console.log('[debugLeagueMatches] Found ALL proposals:', allProposals.length);

        // Get only pending proposals
        const pendingProposals = await base44.asServiceRole.entities.LeagueMatchProposal.filter({
            recipient_id: targetUserId,
            status: 'pending'
        });

        console.log('[debugLeagueMatches] Found pending proposals:', pendingProposals.length);

        // Also check if any proposals exist with this user as proposer
        const sentProposals = await base44.asServiceRole.entities.LeagueMatchProposal.filter({
            proposer_id: targetUserId
        });

        // Get ALL league matches for this user using service role
        const allMatches = await base44.asServiceRole.entities.LeagueMatch.filter({
            $or: [{ player_1_id: targetUserId }, { player_2_id: targetUserId }]
        });

        // Try user context as well
        let matchesByUserContext = [];
        try {
            matchesByUserContext = await base44.entities.LeagueMatch.filter({
                $or: [{ player_1_id: targetUserId }, { player_2_id: targetUserId }]
            });
        } catch (userContextError) {
            console.error('Error fetching via user context:', userContextError);
        }

        // Get specific details about scheduled matches
        const scheduledMatches = allMatches.filter(m => m.status === 'scheduled');
        const unarrangedMatches = allMatches.filter(m => m.status === 'unarranged');
        const arrangementProposedMatches = allMatches.filter(m => m.status === 'arrangement_proposed');

        return new Response(JSON.stringify({
            success: true,
            debug_info: {
                target_user_id: targetUserId,
                target_username: user.username,
                
                // Proposals
                all_proposals_count: allProposals.length,
                all_proposals: allProposals.map(p => ({
                    id: p.id,
                    league_match_id: p.league_match_id,
                    proposer_id: p.proposer_id,
                    proposer_username: p.proposer_username,
                    recipient_id: p.recipient_id,
                    recipient_username: p.recipient_username,
                    status: p.status,
                    created_date: p.created_date,
                    accepted_datetime: p.accepted_datetime
                })),
                pending_proposals_count: pendingProposals.length,
                sent_proposals_count: sentProposals.length,
                sent_proposals: sentProposals.map(p => ({
                    id: p.id,
                    league_match_id: p.league_match_id,
                    recipient_username: p.recipient_username,
                    status: p.status,
                    accepted_datetime: p.accepted_datetime
                })),

                // Matches
                all_matches_count: allMatches.length,
                all_matches: allMatches.map(m => ({
                    id: m.id,
                    player_1_id: m.player_1_id,
                    player_1_username: m.player_1_username,
                    player_2_id: m.player_2_id,
                    player_2_username: m.player_2_username,
                    status: m.status,
                    scheduled_date: m.scheduled_date
                })),
                
                // Match status breakdown
                scheduled_matches_count: scheduledMatches.length,
                scheduled_matches: scheduledMatches.map(m => ({
                    id: m.id,
                    opponent: m.player_1_id === targetUserId ? m.player_2_username : m.player_1_username,
                    scheduled_date: m.scheduled_date,
                    status: m.status
                })),
                unarranged_matches_count: unarrangedMatches.length,
                arrangement_proposed_matches_count: arrangementProposedMatches.length,

                // User context comparison
                matches_by_user_context_count: matchesByUserContext.length,
                matches_by_user_context: matchesByUserContext.map(m => ({
                    id: m.id,
                    player_1_id: m.player_1_id,
                    player_2_id: m.player_2_id,
                    status: m.status,
                    scheduled_date: m.scheduled_date
                }))
            }
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('[debugLeagueMatches] Error:', error);
        return new Response(JSON.stringify({
            error: 'Debug failed',
            details: error.message
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});