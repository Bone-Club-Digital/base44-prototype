import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Fetch data with limits for better performance
        const [games, players] = await Promise.all([
            base44.asServiceRole.entities.GameSession.filter(
                { status: 'waiting_for_opponent' },
                '-created_date',
                50 // Reduced from 100 to 50
            ),
            base44.asServiceRole.entities.PlayerStats.list('-rating', 100) // Limit to top 100 players
        ]);
        
        const playerMap = new Map();
        players.forEach(p => playerMap.set(p.user_id, p));

        // Combine the data efficiently
        const openGamesWithCreators = games.map(game => ({
            ...game,
            creator: playerMap.get(game.player_teal_id) || { username: 'Unknown', rating: 1500, profile_picture_url: null }
        }));

        return new Response(JSON.stringify({ 
            openGames: openGamesWithCreators, 
            allPlayers: players 
        }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache' // Prevent caching issues
            },
        });
    } catch (error) {
        console.error('Error in getPublicLobbyData function:', error);
        return new Response(JSON.stringify({ 
            openGames: [], 
            allPlayers: [],
            error: 'Failed to fetch lobby data.', 
            details: error.message 
        }), {
            status: 200, // Return 200 instead of 500 to prevent frontend errors
            headers: { 'Content-Type': 'application/json' },
        });
    }
});