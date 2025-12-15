import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

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

        if (game.status !== 'starting' || !game.game_state?.is_opening_move) {
            return new Response(JSON.stringify({ error: 'Game is not in the opening roll phase.' }), { status: 400 });
        }

        const openingRolls = game.game_state.opening_rolls;
        if (!openingRolls || !openingRolls.teal || !openingRolls.bone) {
            return new Response(JSON.stringify({ error: 'Invalid opening roll data in game state.' }), { status: 500 });
        }

        // Only the player who won the roll can start the game
        const winnerColor = game.game_state.turn;
        const winnerId = winnerColor === 'teal' ? game.player_teal_id : game.player_bone_id;
        if (user.id !== winnerId) {
            return new Response(JSON.stringify({ error: 'Only the winner of the roll can start the game.' }), { status: 403 });
        }

        const diceForFirstMove = [openingRolls.teal, openingRolls.bone];
        
        const updatedGameState = {
            ...game.game_state,
            dice: diceForFirstMove,
            is_opening_move: false, // The opening phase is now over
            opening_rolls: null, // Clear this as it's no longer needed
            movesRemaining: diceForFirstMove[0] === diceForFirstMove[1] 
                ? [diceForFirstMove[0], diceForFirstMove[0], diceForFirstMove[0], diceForFirstMove[0]]
                : diceForFirstMove.sort((a, b) => b - a), // Standard practice to sort the dice
        };

        const updatePayload = {
            status: 'in_progress',
            game_state: updatedGameState
        };

        const updatedGame = await base44.entities.GameSession.update(gameId, updatePayload);
        
        return new Response(JSON.stringify({ success: true, data: updatedGame }), { status: 200 });

    } catch (error) {
        console.error('[startGameAfterOpeningRoll] Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to process request', details: error.message }), { status: 500 });
    }
});