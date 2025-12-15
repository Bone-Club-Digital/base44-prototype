import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // 1. Authorization
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { 'Content-Type': 'application/json' }
            });
        }
        const user = await base44.auth.me();

        const { league_id } = await req.json();
        if (!league_id) {
            return new Response(JSON.stringify({ error: 'League ID is required' }), {
                status: 400, headers: { 'Content-Type': 'application/json' }
            });
        }

        const league = await base44.asServiceRole.entities.League.get(league_id);
        if (league.admin_user_id !== user.id && user.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Forbidden: Only league admins can perform this action.' }), {
                status: 403, headers: { 'Content-Type': 'application/json' }
            });
        }
        
        console.log(`[generateLeagueDivisions] Starting generation for league: ${league.name} (${league_id})`);

        // 2. Clear existing divisions and matches for this league to ensure a clean slate
        const existingDivisions = await base44.asServiceRole.entities.Division.filter({ league_id });
        if (existingDivisions.length > 0) {
            console.log(`[generateLeagueDivisions] Deleting ${existingDivisions.length} existing divisions.`);
            const divisionIds = existingDivisions.map(d => d.id);
            for (const divisionId of divisionIds) {
                await base44.asServiceRole.entities.Division.delete(divisionId);
            }
        }
        
        const existingMatches = await base44.asServiceRole.entities.LeagueMatch.filter({ league_id });
        if(existingMatches.length > 0) {
            console.log(`[generateLeagueDivisions] Deleting ${existingMatches.length} existing matches.`);
            const matchIds = existingMatches.map(m => m.id);
            for (const matchId of matchIds) {
                await base44.asServiceRole.entities.LeagueMatch.delete(matchId);
            }
        }


        // 3. Fetch all active and registered participants
        const participants = await base44.asServiceRole.entities.LeagueParticipant.filter({
            league_id,
            status: { '$in': ['active', 'registered'] }
        });

        if (participants.length < (league.players_per_division || 2)) {
             return new Response(JSON.stringify({ error: `Not enough participants (${participants.length}) to form a full division of ${league.players_per_division}.` }), {
                status: 400, headers: { 'Content-Type': 'application/json' }
            });
        }
        
        console.log(`[generateLeagueDivisions] Found ${participants.length} participants to assign.`);

        // Sort participants by rating for seeding
        participants.sort((a, b) => (b.rating || 1500) - (a.rating || 1500));

        // 4. Create new Division entities
        const newDivisions = [];
        const playersPerDivision = league.players_per_division;
        const numDivisions = Math.ceil(participants.length / playersPerDivision);

        for (let i = 0; i < numDivisions; i++) {
            const divisionNumber = i + 1;
            const division = await base44.asServiceRole.entities.Division.create({
                league_id,
                division_number: divisionNumber,
                name: `Division ${divisionNumber}`
            });
            newDivisions.push({ ...division });
        }
        
        console.log(`[generateLeagueDivisions] Created ${newDivisions.length} new divisions.`);

        // 5. Assign participants to divisions using a serpentine (snake) draft for balance
        for (let i = 0; i < participants.length; i++) {
            const participant = participants[i];
            const divisionIndex = i % numDivisions;
            let targetDivision;

            // Snake draft logic determines the division based on the round of picks
            if (Math.floor(i / numDivisions) % 2 === 0) {
                // Going forwards in division order (e.g., D1, D2, D3)
                targetDivision = newDivisions[divisionIndex];
            } else {
                // Going backwards (e.g., D3, D2, D1)
                targetDivision = newDivisions[numDivisions - 1 - divisionIndex];
            }
            
            if (targetDivision) {
                 await base44.asServiceRole.entities.LeagueParticipant.update(participant.id, {
                    division_id: targetDivision.id
                });
            }
        }
        
        console.log(`[generateLeagueDivisions] Assigned all participants to divisions.`);

        return new Response(JSON.stringify({
            success: true,
            message: `Successfully generated ${newDivisions.length} divisions for ${participants.length} participants. You can now edit them or start the league.`,
        }), {
            status: 200, headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[generateLeagueDivisions] Critical Error:', error);
        return new Response(JSON.stringify({
            error: 'A critical error occurred while generating divisions.',
            details: error.message
        }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        });
    }
});