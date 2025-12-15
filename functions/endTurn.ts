import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { gameId } = await req.json();

        if (!gameId) {
            return Response.json({ error: 'Game ID is required' }, { status: 400 });
        }

        // Get the current game session
        const game = await base44.entities.GameSession.get(gameId);

        if (!game) {
            return Response.json({ error: 'Game not found' }, { status: 404 });
        }

        // Verify it's the current player's turn
        const currentTurn = game.game_state?.turn;
        const isPlayerTeal = game.player_teal_id === user.id;
        const isPlayerBone = game.player_bone_id === user.id;
        const playerColor = isPlayerTeal ? 'teal' : (isPlayerBone ? 'bone' : null);

        if (!playerColor) {
            return Response.json({ error: 'You are not a player in this game' }, { status: 403 });
        }

        if (currentTurn !== playerColor) {
            return Response.json({ error: 'It is not your turn' }, { status: 400 });
        }

        // Switch turn to the other player
        const nextTurn = currentTurn === 'teal' ? 'bone' : 'teal';

        // Reset dice and moves for the next turn
        const updatedGameState = {
            ...game.game_state,
            turn: nextTurn,
            dice: [0, 0],
            movesRemaining: [],
            is_opening_move: false
        };

        // Update the game session
        await base44.entities.GameSession.update(gameId, {
            game_state: updatedGameState,
            current_player_turn: nextTurn
        });

        console.log(`[endTurn] Turn ended. Next turn: ${nextTurn}`);

        return Response.json({
            success: true,
            message: 'Turn ended successfully',
            nextTurn
        });

    } catch (error) {
        console.error('[endTurn] Error:', error);
        return Response.json({ 
            error: error.message || 'Failed to end turn' 
        }, { status: 500 });
    }
});