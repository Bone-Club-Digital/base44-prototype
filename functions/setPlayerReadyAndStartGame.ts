import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const STARTING_POSITION = {
    24: { color: 'teal', count: 2 }, 13: { color: 'teal', count: 5 }, 8: { color: 'teal', count: 3 }, 6: { color: 'teal', count: 5 },
    1: { color: 'bone', count: 2 }, 12: { color: 'bone', count: 5 }, 17: { color: 'bone', count: 3 }, 19: { color: 'bone', count: 5 }
};

Deno.serve(async (req) => {
    try {
        const { gameId } = await req.json();
        if (!gameId) {
            return new Response(JSON.stringify({ error: 'gameId is required' }), { status: 400 });
        }

        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const game = await base44.entities.GameSession.get(gameId);
        if (!game) {
            return new Response(JSON.stringify({ error: 'Game not found.' }), { status: 404 });
        }

        const isPlayerTeal = game.player_teal_id === user.id;
        const isPlayerBone = game.player_bone_id === user.id;

        if (!isPlayerTeal && !isPlayerBone) {
            return new Response(JSON.stringify({ error: 'You are not a player in this game.' }), { status: 403 });
        }
        
        if (game.status === 'in_progress') {
            return new Response(JSON.stringify({ success: true, data: game, message: 'Game already in progress.' }), { status: 200 });
        }
        
        if (game.status !== 'waiting_for_start') {
            return new Response(JSON.stringify({ error: `Game is in an invalid state: ${game.status}` }), { status: 400 });
        }
        
        const currentMatchState = game.match_state || {};
        const matchStateUpdate = { ...currentMatchState };
        
        if (isPlayerTeal) matchStateUpdate.player_teal_ready = true;
        if (isPlayerBone) matchStateUpdate.player_bone_ready = true;

        let updatePayload;

        if (matchStateUpdate.player_teal_ready && matchStateUpdate.player_bone_ready) {
            // BOTH PLAYERS READY - AUTOMATIC OPENING ROLL AND START GAME
            let tealRoll, boneRoll;
            do {
                tealRoll = Math.floor(Math.random() * 6) + 1;
                boneRoll = Math.floor(Math.random() * 6) + 1;
            } while (tealRoll === boneRoll);

            const winner = tealRoll > boneRoll ? 'teal' : 'bone';
            const dice = [tealRoll, boneRoll];
            const movesRemaining = tealRoll === boneRoll ? [tealRoll, tealRoll, tealRoll, tealRoll] : [tealRoll, boneRoll];

            const updatedGameState = {
                board: STARTING_POSITION,
                dice: dice,
                movesRemaining: movesRemaining,
                turn: winner,
                bar: { teal: 0, bone: 0 },
                bornOff: { teal: 0, bone: 0 },
                doubling_cube: { value: 1, owner: null, position: 'center' },
                is_opening_move: true, // Flag to show different colored dice
                opening_rolls: { teal: tealRoll, bone: boneRoll } // Store individual rolls
            };

            updatePayload = {
                status: 'in_progress',
                current_player_turn: winner,
                match_state: matchStateUpdate,
                game_state: updatedGameState
            };

        } else {
            // Only one player ready
            updatePayload = {
                match_state: matchStateUpdate
            };
        }

        const updatedGame = await base44.entities.GameSession.update(gameId, updatePayload);
        return new Response(JSON.stringify({ success: true, data: updatedGame }), { status: 200 });

    } catch (error) {
        console.error('[setPlayerReadyAndStartGame] Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to process request', details: error.message }), { status: 500 });
    }
});