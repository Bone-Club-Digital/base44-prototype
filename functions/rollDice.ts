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

        if (game.status !== 'in_progress') {
            return new Response(JSON.stringify({ error: 'Game is not in progress.' }), { status: 400 });
        }

        const currentPlayerId = game.game_state.turn === 'teal' ? game.player_teal_id : game.player_bone_id;
        if (user.id !== currentPlayerId) {
            return new Response(JSON.stringify({ error: 'Not your turn.' }), { status: 403 });
        }
        
        if (game.game_state.dice && (game.game_state.dice[0] !== 0 || game.game_state.dice[1] !== 0)) {
            return new Response(JSON.stringify({ error: 'Dice have already been rolled for this turn.' }), { status: 400 });
        }

        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const dice = [die1, die2];

        const movesRemaining = die1 === die2 ? [die1, die1, die1, die1] : dice;

        const updatedGameState = {
            ...game.game_state,
            dice: dice,
            movesRemaining: movesRemaining.sort((a, b) => b - a), // Sort dice high to low for easier processing
        };
        
        const updatedGame = await base44.entities.GameSession.update(game.id, {
            game_state: updatedGameState
        });

        return new Response(JSON.stringify({ success: true, data: updatedGame }), { status: 200 });

    } catch (error) {
        console.error('[rollDice] Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to process request', details: error.message }), { status: 500 });
    }
});