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

        console.log('[debugLeagueProposals] Current user:', user.id, user.username);

        // Get ALL league match proposals using service role to see the true DB state
        const allProposals = await base44.asServiceRole.entities.LeagueMatchProposal.list();
        console.log('[debugLeagueProposals] Found ALL proposals via service role:', allProposals.length);

        // Try to get proposals as the current user to test RLS
        let filteredProposals = [];
        try {
            filteredProposals = await base44.entities.LeagueMatchProposal.filter({
                '$or': [
                    { proposer_id: user.id },
                    { recipient_id: user.id }
                ],
                status: 'pending' // Also check for pending status
            });
            console.log('[debugLeagueProposals] User can see via .filter():', filteredProposals.length);
        } catch (error) {
            console.error('[debugLeagueProposals] Error with .filter():', error);
        }

        return new Response(JSON.stringify({
            success: true,
            debug_info: {
                current_user_id: user.id,
                current_username: user.username,
                all_proposals_count: allProposals.length,
                user_proposals_via_filter: filteredProposals.length,
                all_proposals: allProposals.map(p => ({
                    id: p.id,
                    proposer_id: p.proposer_id,
                    proposer_username: p.proposer_username,
                    recipient_id: p.recipient_id,
                    recipient_username: p.recipient_username,
                    status: p.status,
                    created_date: p.created_date
                })),
                filter_results: filteredProposals
            }
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('[debugLeagueProposals] Error:', error);
        return new Response(JSON.stringify({
            error: 'Debug failed',
            details: error.message
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});