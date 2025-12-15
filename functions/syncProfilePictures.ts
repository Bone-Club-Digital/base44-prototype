import { createClient } from 'npm:@base44/sdk@0.1.0';

Deno.serve(async (req) => {
  try {
    // 1. Authenticate the caller and verify they are an admin
    const userClient = createClient({
      appId: Deno.env.get('BASE44_APP_ID'),
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: 'Authorization header was not received.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized', details: 'Bearer token was missing from header.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    
    userClient.auth.setToken(token);
    const user = await userClient.auth.me();

    if (!user) {
        return new Response(JSON.stringify({ error: 'Forbidden', details: 'Authentication failed. Could not verify user.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden', details: 'This action requires administrator privileges.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. If authorized, create a privileged client to perform the sync
    const systemClient = createClient({
      appId: Deno.env.get('BASE44_APP_ID'),
      apiKey: Deno.env.get('BASE44_SERVICE_ROLE_KEY')
    });

    // 3. Perform the sync logic
    const allUsers = await systemClient.entities.User.list();
    const allPlayerStats = await systemClient.entities.PlayerStats.list();

    let updatedCount = 0;
    const updatePromises = [];

    for (const playerStat of allPlayerStats) {
      const correspondingUser = allUsers.find(u => u.id === playerStat.user_id);
      if (correspondingUser && correspondingUser.profile_picture_url && correspondingUser.profile_picture_url !== playerStat.profile_picture_url) {
        updatePromises.push(
          systemClient.entities.PlayerStats.update(playerStat.id, {
            profile_picture_url: correspondingUser.profile_picture_url
          })
        );
        updatedCount++;
      }
    }
    
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: `Sync complete. ${updatedCount} records were updated.`,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("Critical error in syncProfilePictures function:", error.message);
    return new Response(JSON.stringify({
      error: 'Function execution failed',
      details: error.message,
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});