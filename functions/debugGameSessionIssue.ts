import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const { gameId } = await req.json();
        const base44 = createClientFromRequest(req);
        
        let user;
        try {
            user = await base44.auth.me();
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Unauthorized', details: e.message }), { 
                status: 401, headers: { "Content-Type": "application/json" } 
            });
        }

        console.log(`[debugGameSessionIssue] Starting debug for game ${gameId} by user ${user.username}`);

        const results = {
            gameId: gameId,
            userId: user.id,
            username: user.username,
            timestamp: new Date().toISOString(),
            tests: []
        };

        // Test 1: Try to get the specific game with normal user access
        try {
            const gameNormal = await base44.entities.GameSession.get(gameId);
            results.tests.push({
                test: "Normal user access",
                success: true,
                game: gameNormal
            });
        } catch (error) {
            results.tests.push({
                test: "Normal user access",
                success: false,
                error: error.message,
                statusCode: error.response?.status
            });
        }

        // Test 2: Try to get the specific game with service role access
        try {
            const gameService = await base44.asServiceRole.entities.GameSession.get(gameId);
            results.tests.push({
                test: "Service role access",
                success: true,
                game: gameService
            });
        } catch (error) {
            results.tests.push({
                test: "Service role access",
                success: false,
                error: error.message,
                statusCode: error.response?.status
            });
        }

        // Test 3: List all games for this user to see if the game exists but with different access
        try {
            const userGames = await base44.entities.GameSession.filter({ 
                $or: [
                    { player_teal_id: user.id },
                    { player_bone_id: user.id }
                ]
            });
            
            const targetGame = userGames.find(g => g.id === gameId);
            
            results.tests.push({
                test: "List user games (normal access)",
                success: true,
                totalGames: userGames.length,
                targetGameFound: !!targetGame,
                targetGame: targetGame || null,
                allGameIds: userGames.map(g => g.id)
            });
        } catch (error) {
            results.tests.push({
                test: "List user games (normal access)",
                success: false,
                error: error.message,
                statusCode: error.response?.status
            });
        }

        // Test 4: List all games for this user using service role
        try {
            const userGamesService = await base44.asServiceRole.entities.GameSession.filter({ 
                $or: [
                    { player_teal_id: user.id },
                    { player_bone_id: user.id }
                ]
            });
            
            const targetGameService = userGamesService.find(g => g.id === gameId);
            
            results.tests.push({
                test: "List user games (service role)",
                success: true,
                totalGames: userGamesService.length,
                targetGameFound: !!targetGameService,
                targetGame: targetGameService || null,
                allGameIds: userGamesService.map(g => g.id)
            });
        } catch (error) {
            results.tests.push({
                test: "List user games (service role)",
                success: false,
                error: error.message,
                statusCode: error.response?.status
            });
        }

        // Test 5: List the most recent games regardless of player to see if it exists at all
        try {
            const recentGames = await base44.asServiceRole.entities.GameSession.list('-created_date', 10);
            const targetGameRecent = recentGames.find(g => g.id === gameId);
            
            results.tests.push({
                test: "List recent games (service role)",
                success: true,
                totalGames: recentGames.length,
                targetGameFound: !!targetGameRecent,
                targetGame: targetGameRecent || null,
                recentGameIds: recentGames.map(g => ({ id: g.id, created: g.created_date, status: g.status }))
            });
        } catch (error) {
            results.tests.push({
                test: "List recent games (service role)",
                success: false,
                error: error.message,
                statusCode: error.response?.status
            });
        }

        return new Response(JSON.stringify(results, null, 2), { 
            status: 200, headers: { "Content-Type": "application/json" } 
        });

    } catch (error) {
        console.error('[debugGameSessionIssue] Error:', error);
        return new Response(JSON.stringify({ 
            error: 'Debug function failed', 
            details: error.message 
        }), { 
            status: 500, headers: { "Content-Type": "application/json" } 
        });
    }
});