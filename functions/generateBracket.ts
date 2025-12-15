import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

// Fisher-Yates (aka Knuth) Shuffle function.
function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // 1. Authenticate user
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401, 
                headers: { "Content-Type": "application/json" } 
            });
        }
        const user = await base44.auth.me();

        const { tournament_id } = await req.json();

        if (!tournament_id) {
            return new Response(JSON.stringify({ error: 'Tournament ID is required' }), { 
                status: 400, 
                headers: { "Content-Type": "application/json" } 
            });
        }
        
        // 2. Fetch tournament and authorize user as admin
        const tournament = await base44.asServiceRole.entities.Tournament.get(tournament_id);
        if (!tournament) {
            return new Response(JSON.stringify({ error: 'Tournament not found' }), { 
                status: 404, 
                headers: { "Content-Type": "application/json" } 
            });
        }
        
        const isAdmin = tournament.admin_user_id === user.id || (Array.isArray(tournament.admin_ids) && tournament.admin_ids.includes(user.id));
        if (!isAdmin) {
            return new Response(JSON.stringify({ error: 'Only a tournament admin can generate the bracket.' }), { 
                status: 403, 
                headers: { "Content-Type": "application/json" } 
            });
        }
        
        // 3. Check if bracket already exists
        const existingMatches = await base44.asServiceRole.entities.TournamentMatch.filter({ tournament_id });
        if (existingMatches.length > 0) {
            return new Response(JSON.stringify({ error: 'Bracket has already been generated.' }), { 
                status: 400, 
                headers: { "Content-Type": "application/json" } 
            });
        }
        
        // 4. Get accepted participants
        const participants = await base44.asServiceRole.entities.TournamentParticipant.filter({ tournament_id, status: 'accepted' });
        if (participants.length < 2) {
            return new Response(JSON.stringify({ error: 'At least 2 participants are required to generate a bracket.' }), { 
                status: 400, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        // 5. Shuffle and create matches for Round 1
        const shuffledParticipants = shuffle(participants);
        const newMatches = [];
        let matchNumber = 1;

        for (let i = 0; i < shuffledParticipants.length; i += 2) {
            if (shuffledParticipants[i + 1]) { // If there is a pair
                newMatches.push({
                    tournament_id,
                    round: 1,
                    match_number_in_round: matchNumber++,
                    player_1_id: shuffledParticipants[i].user_id,
                    player_1_username: shuffledParticipants[i].username,
                    player_2_id: shuffledParticipants[i + 1].user_id,
                    player_2_username: shuffledParticipants[i + 1].username,
                    status: 'scheduled'
                });
            } else {
                // Last player gets a bye to round 2 (auto-win round 1)
                newMatches.push({
                    tournament_id,
                    round: 1,
                    match_number_in_round: matchNumber++,
                    player_1_id: shuffledParticipants[i].user_id,
                    player_1_username: shuffledParticipants[i].username,
                    player_2_id: null,
                    player_2_username: 'BYE',
                    status: 'completed',
                    winner_id: shuffledParticipants[i].user_id
                });
            }
        }
        
        if (newMatches.length > 0) {
            await base44.asServiceRole.entities.TournamentMatch.bulkCreate(newMatches);
        }

        // 6. Update tournament status
        await base44.asServiceRole.entities.Tournament.update(tournament_id, { status: 'in_progress' });
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: `Bracket generated with ${newMatches.length} matches.` 
        }), { 
            status: 200, 
            headers: { "Content-Type": "application/json" } 
        });

    } catch (error) {
        console.error("Generate bracket error:", error);
        return new Response(JSON.stringify({ 
            error: error.message || 'An unexpected error occurred' 
        }), { 
            status: 500, 
            headers: { "Content-Type": "application/json" } 
        });
    }
});