import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

const STARTING_POSITION = {
    24: { color: 'teal', count: 2 }, 13: { color: 'teal', count: 5 }, 8: { color: 'teal', count: 3 }, 6: { color: 'teal', count: 5 },
    1: { color: 'bone', count: 2 }, 12: { color: 'bone', count: 5 }, 17: { color: 'bone', count: 3 }, 19: { color: 'bone', count: 5 }
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { "Content-Type": "application/json" }
            });
        }
        
        const user = await base44.auth.me();

        const { tournament_match_id } = await req.json();
        if (!tournament_match_id) {
            return new Response(JSON.stringify({ error: 'Tournament Match ID is required.' }), {
                status: 400, headers: { "Content-Type": "application/json" }
            });
        }

        // Use service role for all entity interactions to ensure permissions
        const match = await base44.asServiceRole.entities.TournamentMatch.get(tournament_match_id);
        if (!match) {
            return new Response(JSON.stringify({ error: 'Tournament match not found.' }), {
                status: 404, headers: { "Content-Type": "application/json" }
            });
        }

        // Authorize user
        if (user.id !== match.player_1_id && user.id !== match.player_2_id) {
            return new Response(JSON.stringify({ error: 'You are not a player in this match.' }), {
                status: 403, headers: { "Content-Type": "application/json" }
            });
        }

        // Check if both players are ready
        if (!match.player_1_ready || !match.player_2_ready) {
            return new Response(JSON.stringify({ error: 'Both players must be ready to start the match.' }), {
                status: 400, headers: { "Content-Type": "application/json" }
            });
        }

        // --- Critical Section: Prevent Race Conditions ---
        if (match.game_session_id) {
            return new Response(JSON.stringify({ game_session_id: match.game_session_id }), {
                status: 200, headers: { "Content-Type": "application/json" }
            });
        }
        
        const tournament = await base44.asServiceRole.entities.Tournament.get(match.tournament_id);
        if (!tournament) {
            return new Response(JSON.stringify({ error: 'Parent tournament not found.' }), {
                status: 404, headers: { "Content-Type": "application/json" }
            });
        }

        // Create the game session
        const newGamePayload = {
            player_teal_id: match.player_1_id,
            player_bone_id: match.player_2_id,
            status: 'waiting_for_start',
            bones_stake: tournament.entry_fee_bones || 0,
            tournament_id: match.tournament_id,
            tournament_match_id: match.id,
            game_state: {
                position: STARTING_POSITION,
                bar: { teal: 0, bone: 0 },
                bornOff: { teal: 0, bone: 0 },
                dice: [0, 0],
                movesRemaining: [],
                cubeValue: 1,
                cubeOwner: 'center',
                isFirstMove: true,
                isDoubleOffered: false,
                is_opening_move: true,
            },
            match_state: {
                ...(tournament.match_settings || {}),
                player_teal_score: 0,
                player_bone_score: 0,
                isCrawfordGame: false,
            },
        };

        const newGameSession = await base44.asServiceRole.entities.GameSession.create(newGamePayload);

        // Link the game session back to the tournament match
        await base44.asServiceRole.entities.TournamentMatch.update(match.id, {
            game_session_id: newGameSession.id,
            status: 'in_progress'
        });

        return new Response(JSON.stringify({ game_session_id: newGameSession.id }), {
            status: 200, headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Start tournament match error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
});