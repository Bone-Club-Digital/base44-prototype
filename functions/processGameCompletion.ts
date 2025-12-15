import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const K_FACTOR = 32;

const calculateElo = (ratingA, ratingB, scoreA) => {
    const expectedScoreA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
    const newRatingA = ratingA + K_FACTOR * (scoreA - expectedScoreA);
    return Math.round(newRatingA);
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { gameId } = await req.json();

        // Use service role for all backend operations
        const service = base44.asServiceRole;

        const game = await service.entities.GameSession.get(gameId);

        if (!game) {
            return Response.json({ error: 'Game not found' }, { status: 404 });
        }
        
        if (game.status === 'completed') {
             return Response.json({ message: 'Game already completed.' });
        }

        if (game.player_teal_id !== user.id && game.player_bone_id !== user.id) {
            return Response.json({ error: 'You are not a player in this game.' }, { status: 403 });
        }
        
        const winnerId = user.id; // The user calling this function is the winner
        const loserId = (winnerId === game.player_teal_id) ? game.player_bone_id : game.player_teal_id;

        const [winnerStatsArr, loserStatsArr, winnerUser, loserUser] = await Promise.all([
            service.entities.PlayerStats.filter({ user_id: winnerId }),
            service.entities.PlayerStats.filter({ user_id: loserId }),
            service.entities.User.get(winnerId),
            service.entities.User.get(loserId),
        ]);

        const winnerStats = winnerStatsArr[0];
        const loserStats = loserStatsArr[0];
        
        if (!winnerStats || !loserStats) {
            throw new Error("Player stats not found for one or both players.");
        }

        // 1. Calculate Elo Rating
        const originalWinnerRating = winnerStats.rating;
        const originalLoserRating = loserStats.rating;

        const newWinnerRating = calculateElo(originalWinnerRating, originalLoserRating, 1);
        const newLoserRating = calculateElo(originalLoserRating, originalWinnerRating, 0);

        const ratingChange = newWinnerRating - originalWinnerRating;

        // 2. Handle Bones Stake
        const bonesStake = game.bones_stake || 0;
        let bonesChange = 0;
        if (bonesStake > 0) {
            bonesChange = bonesStake; // Winner gains the stake
            // Update balances and create transactions
            await Promise.all([
                service.entities.User.update(winnerId, { bones_balance: (winnerUser.bones_balance || 0) + bonesStake }),
                service.entities.User.update(loserId, { bones_balance: Math.max(0, (loserUser.bones_balance || 0) - bonesStake) }),
                service.entities.BonesTransaction.create({
                    user_id: winnerId,
                    type: 'game_win',
                    amount: bonesStake,
                    current_balance: (winnerUser.bones_balance || 0) + bonesStake,
                    description: `Won ${bonesStake} bones from ${loserStats.username}`,
                    related_entity_id: game.id,
                    related_entity_type: 'GameSession'
                }),
                service.entities.BonesTransaction.create({
                    user_id: loserId,
                    type: 'game_loss',
                    amount: -bonesStake,
                    current_balance: Math.max(0, (loserUser.bones_balance || 0) - bonesStake),
                    description: `Lost ${bonesStake} bones to ${winnerStats.username}`,
                    related_entity_id: game.id,
                    related_entity_type: 'GameSession'
                })
            ]);
        }
        
        // 3. Update PlayerStats
        await Promise.all([
             service.entities.PlayerStats.update(winnerStats.id, {
                rating: newWinnerRating,
                games_played: (winnerStats.games_played || 0) + 1,
                games_won: (winnerStats.games_won || 0) + 1,
             }),
             service.entities.PlayerStats.update(loserStats.id, {
                rating: newLoserRating,
                games_played: (loserStats.games_played || 0) + 1,
             })
        ]);

        // 4. Update GameSession
        await service.entities.GameSession.update(gameId, {
            status: 'completed',
            winner_id: winnerId
        });

        const result = {
            ratingChange,
            bonesChange,
            newWinnerRating,
            newLoserRating,
        };

        return Response.json(result);

    } catch (error) {
        console.error('Error processing game completion:', error);
        return Response.json({ error: `An error occurred: ${error.message}` }, { status: 500 });
    }
});