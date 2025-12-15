import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { "Content-Type": "application/json" }
            });
        }

        console.log(`[debugGameSessionCreation] Starting debug for user: ${user.username} (${user.id})`);

        const results = [];

        // Test 1: Minimal GameSession creation (only required fields)
        try {
            console.log('[debugGameSessionCreation] Test 1: Creating minimal GameSession...');
            const minimalPayload = {
                player_teal_id: user.id,
                status: 'waiting_for_opponent'
            };
            
            const minimalGame = await base44.entities.GameSession.create(minimalPayload);
            results.push({ test: 'minimal', success: true, gameId: minimalGame.id });
            
            // Clean up immediately
            await base44.entities.GameSession.delete(minimalGame.id);
            console.log('[debugGameSessionCreation] Test 1: SUCCESS - Minimal GameSession created and deleted');
        } catch (error) {
            results.push({ test: 'minimal', success: false, error: error.message, details: error });
            console.error('[debugGameSessionCreation] Test 1: FAILED - Minimal GameSession creation failed:', error);
        }

        // Test 2: Add bones_stake
        try {
            console.log('[debugGameSessionCreation] Test 2: Adding bones_stake...');
            const payloadWithBones = {
                player_teal_id: user.id,
                status: 'waiting_for_opponent',
                bones_stake: 0
            };
            
            const gameWithBones = await base44.entities.GameSession.create(payloadWithBones);
            results.push({ test: 'with_bones_stake', success: true, gameId: gameWithBones.id });
            
            await base44.entities.GameSession.delete(gameWithBones.id);
            console.log('[debugGameSessionCreation] Test 2: SUCCESS - GameSession with bones_stake created and deleted');
        } catch (error) {
            results.push({ test: 'with_bones_stake', success: false, error: error.message, details: error });
            console.error('[debugGameSessionCreation] Test 2: FAILED - GameSession with bones_stake failed:', error);
        }

        // Test 3: Add basic game_state
        try {
            console.log('[debugGameSessionCreation] Test 3: Adding basic game_state...');
            const basicGameState = {
                board: {
                    24: { color: 'teal', count: 2 }
                },
                dice: [0, 0],
                turn: 'teal'
            };
            
            const payloadWithGameState = {
                player_teal_id: user.id,
                status: 'waiting_for_opponent',
                bones_stake: 0,
                game_state: basicGameState
            };
            
            const gameWithGameState = await base44.entities.GameSession.create(payloadWithGameState);
            results.push({ test: 'with_game_state', success: true, gameId: gameWithGameState.id });
            
            await base44.entities.GameSession.delete(gameWithGameState.id);
            console.log('[debugGameSessionCreation] Test 3: SUCCESS - GameSession with game_state created and deleted');
        } catch (error) {
            results.push({ test: 'with_game_state', success: false, error: error.message, details: error });
            console.error('[debugGameSessionCreation] Test 3: FAILED - GameSession with game_state failed:', error);
        }

        // Test 4: Add minimal match_state
        try {
            console.log('[debugGameSessionCreation] Test 4: Adding minimal match_state...');
            const minimalMatchState = {
                target_score: 5,
                use_clock: false,
                use_video_chat: false
            };
            
            const payloadWithMatchState = {
                player_teal_id: user.id,
                status: 'waiting_for_opponent',
                bones_stake: 0,
                match_state: minimalMatchState
            };
            
            const gameWithMatchState = await base44.entities.GameSession.create(payloadWithMatchState);
            results.push({ test: 'with_minimal_match_state', success: true, gameId: gameWithMatchState.id });
            
            await base44.entities.GameSession.delete(gameWithMatchState.id);
            console.log('[debugGameSessionCreation] Test 4: SUCCESS - GameSession with minimal match_state created and deleted');
        } catch (error) {
            results.push({ test: 'with_minimal_match_state', success: false, error: error.message, details: error });
            console.error('[debugGameSessionCreation] Test 4: FAILED - GameSession with minimal match_state failed:', error);
        }

        // Test 5: Add problematic fields one by one
        const problematicFields = [
            { name: 'isCrawfordGame', value: false },
            { name: 'is_rated', value: true },
            { name: 'player_teal_username', value: user.username },
            { name: 'player_bone_username', value: 'TestOpponent' }
        ];

        for (const field of problematicFields) {
            try {
                console.log(`[debugGameSessionCreation] Test 5.${field.name}: Adding ${field.name}...`);
                const matchStateWithField = {
                    target_score: 5,
                    use_clock: false,
                    use_video_chat: false,
                    [field.name]: field.value
                };
                
                const payloadWithField = {
                    player_teal_id: user.id,
                    status: 'waiting_for_opponent',
                    bones_stake: 0,
                    match_state: matchStateWithField
                };
                
                const gameWithField = await base44.entities.GameSession.create(payloadWithField);
                results.push({ test: `with_${field.name}`, success: true, gameId: gameWithField.id });
                
                await base44.entities.GameSession.delete(gameWithField.id);
                console.log(`[debugGameSessionCreation] Test 5.${field.name}: SUCCESS`);
            } catch (error) {
                results.push({ test: `with_${field.name}`, success: false, error: error.message, details: error });
                console.error(`[debugGameSessionCreation] Test 5.${field.name}: FAILED:`, error);
            }
        }

        return new Response(JSON.stringify({ 
            success: true,
            user: { id: user.id, username: user.username },
            results
        }), {
            status: 200, headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('[debugGameSessionCreation] Overall error:', error);
        return new Response(JSON.stringify({
            error: 'Debug function failed',
            details: error.message
        }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
});