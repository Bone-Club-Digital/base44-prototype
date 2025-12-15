import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Instead of checking isAuthenticated(), directly try to get the user
        // This bypasses potential issues with the isAuthenticated() check
        let user;
        try {
            user = await base44.auth.me();
        } catch (authError) {
            console.error('[getLeagueProposalsForUser] Failed to get user:', authError);
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { "Content-Type": "application/json" }
            });
        }

        if (!user || !user.id) {
            return new Response(JSON.stringify({ error: 'User not found' }), {
                status: 401, headers: { "Content-Type": "application/json" }
            });
        }

        console.log('[getLeagueProposalsForUser] User authenticated:', user.id, user.username);

        // Use service role to bypass broken RLS and fetch all pending proposals
        const allPendingProposals = await base44.asServiceRole.entities.LeagueMatchProposal.filter({
            status: 'pending'
        });

        // Manually filter the proposals for the current user on the backend
        const userProposals = allPendingProposals.filter(p => 
            p.proposer_id === user.id || p.recipient_id === user.id
        );

        console.log('[getLeagueProposalsForUser] Found', userProposals.length, 'proposals for user');

        return new Response(JSON.stringify(userProposals), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('[getLeagueProposalsForUser] Error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to fetch league proposals',
            details: error.message
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});