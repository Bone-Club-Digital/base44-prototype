import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401, headers: { "Content-Type": "application/json" } 
            });
        }

        const { tournament_id } = await req.json();
        if (!tournament_id) {
            return new Response(JSON.stringify({ error: 'Tournament ID is required' }), { 
                status: 400, headers: { "Content-Type": "application/json" } 
            });
        }

        console.log('[joinTournament] Request:', { tournament_id, user_id: user.id });

        // Get tournament details
        const tournament = await base44.entities.Tournament.get(tournament_id);
        if (!tournament) {
            return new Response(JSON.stringify({ error: 'Tournament not found' }), { 
                status: 404, headers: { "Content-Type": "application/json" } 
            });
        }

        if (tournament.status !== 'registration_open') {
            return new Response(JSON.stringify({ error: 'Registration is closed for this tournament' }), { 
                status: 400, headers: { "Content-Type": "application/json" } 
            });
        }

        // Check if user already has a participation record
        const existingParticipants = await base44.entities.TournamentParticipant.filter({ 
            tournament_id, 
            user_id: user.id 
        });

        const fee = tournament.entry_fee_bones || 0;
        
        // Check user's balance
        if (user.bones_balance < fee) {
            return new Response(JSON.stringify({ error: `Insufficient funds. You need ${fee} bones to enter this tournament.` }), { 
                status: 400, headers: { "Content-Type": "application/json" } 
            });
        }

        let participant;
        let message = '';

        if (existingParticipants.length > 0) {
            const existingParticipant = existingParticipants[0];
            
            if (existingParticipant.status === 'accepted') {
                return new Response(JSON.stringify({ error: 'You are already participating in this tournament' }), { 
                    status: 400, headers: { "Content-Type": "application/json" } 
                });
            }
            
            if (existingParticipant.status === 'invited') {
                // Accept invitation - deduct fee if needed
                if (fee > 0) {
                    await base44.entities.User.update(user.id, { 
                        bones_balance: user.bones_balance - fee 
                    });
                }
                
                participant = await base44.entities.TournamentParticipant.update(existingParticipant.id, { 
                    status: 'accepted' 
                });
                message = 'Invitation accepted successfully!';
            } else {
                return new Response(JSON.stringify({ error: `Cannot join tournament with current status: ${existingParticipant.status}` }), { 
                    status: 400, headers: { "Content-Type": "application/json" } 
                });
            }
        } else {
            // New participant joining - deduct fee if needed
            if (fee > 0) {
                await base44.entities.User.update(user.id, { 
                    bones_balance: user.bones_balance - fee 
                });
            }
            
            participant = await base44.entities.TournamentParticipant.create({
                tournament_id,
                user_id: user.id,
                username: user.username || user.full_name || 'Unknown',
                profile_picture_url: user.profile_picture_url || null,
                status: 'accepted',
            });
            message = 'Successfully joined the tournament!';
        }

        return new Response(JSON.stringify({ 
            success: true, 
            participant, 
            message 
        }), { 
            status: 200, 
            headers: { "Content-Type": "application/json" } 
        });

    } catch (error) {
        console.error('[joinTournament] Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { 
            status: 500, 
            headers: { "Content-Type": "application/json" } 
        });
    }
});