import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

const testMembers = [
  { user_id: "bogus_user_001", username: "CheckerPro", pic: "https://randomuser.me/api/portraits/men/11.jpg" },
  { user_id: "bogus_user_002", username: "DiceMaster", pic: "https://randomuser.me/api/portraits/women/12.jpg" },
  { user_id: "bogus_user_003", username: "PointWizard", pic: "https://randomuser.me/api/portraits/men/13.jpg" },
  { user_id: "bogus_user_004", username: "StrategyQueen", pic: "https://randomuser.me/api/portraits/women/14.jpg" },
  { user_id: "bogus_user_005", username: "CubeGuru", pic: "https://randomuser.me/api/portraits/men/15.jpg" },
  { user_id: "bogus_user_006", username: "BlotSmasher", pic: "https://randomuser.me/api/portraits/women/16.jpg" },
  { user_id: "bogus_user_007", username: "PrimeTime", pic: "https://randomuser.me/api/portraits/men/17.jpg" },
  { user_id: "bogus_user_008", username: "AceyDeucey", pic: "https://randomuser.me/api/portraits/women/18.jpg" },
  { user_id: "bogus_user_009", username: "PipCounter", pic: "https://randomuser.me/api/portraits/men/19.jpg" },
  { user_id: "bogus_user_010", username: "Gammonator", pic: "https://randomuser.me/api/portraits/women/20.jpg" }
];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Ensure user is authenticated and an admin
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
        const user = await base44.auth.me();
        if (user.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
        }

        const { clubName } = await req.json();
        if (!clubName) {
            return new Response(JSON.stringify({ error: 'Club name is required.' }), { status: 400 });
        }

        // 1. Find the club by name using the service role
        const clubs = await base44.asServiceRole.entities.Club.filter({ name: clubName });
        if (!clubs || clubs.length === 0) {
            return new Response(JSON.stringify({ error: `Club '${clubName}' not found.` }), { status: 404 });
        }
        const club = clubs[0];

        // 2. Fetch existing ClubMembers and PlayerStats to avoid duplicates
        const [existingClubMembers, existingPlayerStats] = await Promise.all([
            base44.asServiceRole.entities.ClubMember.filter({ club_id: club.id }),
            base44.asServiceRole.entities.PlayerStats.filter({ user_id: { '$in': testMembers.map(m => m.user_id) } })
        ]);
        
        const existingClubMemberIds = new Set(existingClubMembers.map(m => m.user_id));
        const existingPlayerStatIds = new Set(existingPlayerStats.map(ps => ps.user_id));

        const membersToAdd = testMembers.filter(tm => !existingClubMemberIds.has(tm.user_id));
        const statsToCreate = testMembers.filter(tm => !existingPlayerStatIds.has(tm.user_id));

        if (membersToAdd.length === 0 && statsToCreate.length === 0) {
            return new Response(JSON.stringify({ success: true, message: 'All test members and player stats already exist.' }));
        }

        // 3. Prepare payloads
        const clubMemberPayloads = membersToAdd.map(tm => ({
            club_id: club.id,
            club_name: club.name,
            user_id: tm.user_id,
            username: tm.username,
            status: 'active'
        }));

        const playerStatsPayloads = statsToCreate.map(tm => ({
            user_id: tm.user_id,
            username: tm.username,
            rating: 1500,
            games_played: 0,
            games_won: 0,
            profile_picture_url: tm.pic,
            last_active: new Date().toISOString(),
            public_profile: true,
            allow_friend_requests: true
        }));
        
        // 4. Perform creations
        if (clubMemberPayloads.length > 0) {
            await base44.asServiceRole.entities.ClubMember.bulkCreate(clubMemberPayloads);
        }

        if (playerStatsPayloads.length > 0) {
            await base44.asServiceRole.entities.PlayerStats.bulkCreate(playerStatsPayloads);
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: `${clubMemberPayloads.length} members and ${playerStatsPayloads.length} player stats records added/updated.` 
        }));

    } catch (error) {
        console.error('[addTestMembersToClub] Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to add test members.', details: error.message }), { status: 500 });
    }
});