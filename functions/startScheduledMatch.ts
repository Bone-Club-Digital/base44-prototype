
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const payload = await req.json();
        const { matchId } = payload;
        
        console.log(`[startScheduledMatch] Received payload:`, payload);
        console.log(`[startScheduledMatch] Extracted matchId: ${matchId}`);
        
        if (!matchId) {
            console.error('[startScheduledMatch] Missing matchId in request body');
            return new Response(JSON.stringify({ error: "Missing matchId in request body" }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`[startScheduledMatch] User ${user.username} (${user.id}) attempting to start match ${matchId}`);
        
        const scheduledMatch = await base44.asServiceRole.entities.ScheduledMatch.get(matchId);
        if (!scheduledMatch) {
            console.error(`[startScheduledMatch] Scheduled match not found: ${matchId}`);
            return new Response(JSON.stringify({ error: "Scheduled match not found" }), { 
                status: 404, 
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`[startScheduledMatch] Found match with status: ${scheduledMatch.status}`);
        console.log(`[startScheduledMatch] Match organizer: ${scheduledMatch.organizer_id}, opponent: ${scheduledMatch.opponent_id}`);
        console.log(`[startScheduledMatch] Current user: ${user.id}`);

        if (scheduledMatch.status !== 'accepted') {
            console.error(`[startScheduledMatch] Match cannot be started. Status is '${scheduledMatch.status}', not 'accepted'.`);
            return new Response(JSON.stringify({ 
                error: `Match cannot be started. Status is '${scheduledMatch.status}', not 'accepted'.` 
            }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (scheduledMatch.game_session_id) {
            console.log(`[startScheduledMatch] Game session ${scheduledMatch.game_session_id} already exists for this match.`);
            return new Response(JSON.stringify({ 
                success: true, 
                gameId: scheduledMatch.game_session_id, 
                message: "Game already exists" 
            }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const matchDetails = JSON.parse(scheduledMatch.match_details || '{}');
        
        let videoChatUrl = null;
        if (matchDetails.use_video_chat) {
            const key = Deno.env.get('DAILY_API_KEY');
            if (key) {
                try {
                    const response = await fetch('https://api.daily.co/v1/rooms', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                        body: JSON.stringify({ properties: { max_participants: 2, exp: Math.round(Date.now() / 1000) + 7200 } })
                    });
                    if (response.ok) {
                        const roomData = await response.json();
                        videoChatUrl = roomData.url;
                        console.log(`[startScheduledMatch] Daily.co room created: ${videoChatUrl}`);
                    } else {
                        console.error('[startScheduledMatch] Daily.co API error:', await response.text());
                    }
                } catch (e) {
                    console.error('[startScheduledMatch] Error creating Daily.co room:', e);
                }
            } else {
                console.warn('[startScheduledMatch] DAILY_API_KEY not set, skipping video room creation.');
            }
        }
        
        const gameSessionData = {
            player_teal_id: scheduledMatch.organizer_id,
            player_bone_id: scheduledMatch.opponent_id,
            status: 'waiting_for_start',
            bones_stake: scheduledMatch.bones_stake || 0,
            is_from_scheduled_match: true,
            match_state: {
                player_teal_ready: false,
                player_bone_ready: false,
                target_score: matchDetails.target_score || 5,
                use_clock: matchDetails.use_clock || false,
                use_video_chat: matchDetails.use_video_chat || false,
                initial_time_seconds: matchDetails.initial_time_seconds || 0,
                increment_seconds: matchDetails.increment_seconds || 0,
                player_teal_time_remaining: matchDetails.initial_time_seconds || 0,
                player_bone_time_remaining: matchDetails.initial_time_seconds || 0,
                video_chat_url: videoChatUrl
            },
            game_state: {
                position: {
                    24: { color: 'teal', count: 2 }, 13: { color: 'teal', count: 5 }, 8: { color: 'teal', count: 3 }, 6: { color: 'teal', count: 5 },
                    1: { color: 'bone', count: 2 }, 12: { color: 'bone', count: 5 }, 17: { color: 'bone', count: 3 }, 19: { color: 'bone', count: 5 }
                },
                bar: { teal: 0, bone: 0 },
                bornOff: { teal: 0, bone: 0 },
                dice: [0, 0],
                movesRemaining: [],
                cubeValue: 1,
                cubeOwner: 'center',
                isFirstMove: true,
                isDoubleOffered: false,
                is_opening_move: true
            }
        };

        const newGame = await base44.asServiceRole.entities.GameSession.create(gameSessionData);
        
        await base44.asServiceRole.entities.ScheduledMatch.update(matchId, {
            game_session_id: newGame.id,
            status: 'completed',
        });
        
        console.log(`[startScheduledMatch] Successfully created game ${newGame.id} for scheduled match ${matchId}.`);

        return new Response(JSON.stringify({ success: true, gameId: newGame.id }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[startScheduledMatch] CRITICAL ERROR:', error);
        return new Response(JSON.stringify({ 
            error: 'An unexpected server error occurred.', 
            details: error.message 
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
