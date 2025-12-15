import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Ensure user is authenticated
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const user = await base44.auth.me();
        const { league_id } = await req.json();

        if (!league_id) {
            return new Response(JSON.stringify({ error: 'League ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get ALL LeagueMatch records for this league (using service role to bypass RLS)
        const allLeagueMatches = await base44.asServiceRole.entities.LeagueMatch.filter({ league_id });
        
        // Get all proposals for this league
        const allProposals = await base44.asServiceRole.entities.LeagueMatchProposal.filter({});
        const proposalsForLeague = allProposals.filter(p => {
            return allLeagueMatches.some(m => m.id === p.league_match_id);
        });

        // Get league participants for context
        const participants = await base44.asServiceRole.entities.LeagueParticipant.filter({ league_id });

        const debugInfo = {
            league_id,
            current_user_id: user.id,
            current_user_username: user.username,
            
            league_matches: {
                total_count: allLeagueMatches.length,
                records: allLeagueMatches.map(m => ({
                    id: m.id,
                    player_1_id: m.player_1_id,
                    player_1_username: m.player_1_username,
                    player_2_id: m.player_2_id,
                    player_2_username: m.player_2_username,
                    status: m.status,
                    scheduled_date: m.scheduled_date,
                    created_date: m.created_date
                }))
            },

            proposals: {
                total_count: proposalsForLeague.length,
                records: proposalsForLeague.map(p => ({
                    id: p.id,
                    league_match_id: p.league_match_id,
                    proposer_id: p.proposer_id,
                    proposer_username: p.proposer_username,
                    recipient_id: p.recipient_id,
                    recipient_username: p.recipient_username,
                    status: p.status,
                    accepted_datetime: p.accepted_datetime
                }))
            },

            participants: {
                total_count: participants.length,
                records: participants.map(p => ({
                    id: p.id,
                    user_id: p.user_id,
                    username: p.username,
                    status: p.status,
                    division_id: p.division_id
                }))
            },

            // Check if current user would match any league match
            matches_for_current_user: allLeagueMatches.filter(m => 
                m.player_1_id === user.id || m.player_2_id === user.id
            ).map(m => ({
                id: m.id,
                player_1_id: m.player_1_id,
                player_2_id: m.player_2_id,
                status: m.status
            }))
        };

        return new Response(JSON.stringify({
            success: true,
            debug_info: debugInfo
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[inspectLeagueMatches] Error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to inspect league matches',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});