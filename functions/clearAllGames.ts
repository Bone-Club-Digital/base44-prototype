import { createClient } from 'npm:@base44/sdk@0.1.0';

Deno.serve(async (req) => {
  try {
    // First, authenticate the request to ensure the user is an admin.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const token = authHeader.split(' ')[1];
    
    const userClient = createClient({ appId: Deno.env.get('BASE44_APP_ID') });
    userClient.auth.setToken(token);
    const user = await userClient.auth.me();
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    // If authorized, create a privileged client using the service role key to perform the deletions.
    const systemClient = createClient({
      appId: Deno.env.get('BASE44_APP_ID'),
      apiKey: Deno.env.get('BASE44_SERVICE_ROLE_KEY')
    });

    // Fetch all game sessions using the privileged client
    const allGames = await systemClient.entities.GameSession.list(null, 1000); // Fetch up to 1000 games

    if (!allGames || allGames.length === 0) {
        return new Response(JSON.stringify({ success: true, deletedCount: 0, message: 'No games to delete.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Delete all games in parallel
    const deletePromises = allGames.map(game => systemClient.entities.GameSession.delete(game.id));
    await Promise.all(deletePromises);

    return new Response(JSON.stringify({ 
        success: true, 
        deletedCount: allGames.length,
        message: `Successfully deleted ${allGames.length} game sessions.`
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in clearAllGames function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});