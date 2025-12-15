import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This function can be called by any authenticated user, but it will use
    // the service role to perform the cleanup, which is safe.
    if (!await base44.auth.isAuthenticated()) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401, headers: { 'Content-Type': 'application/json' }
        });
    }

    const adminClient = base44.asServiceRole;

    const waitingGames = await adminClient.entities.GameSession.filter(
        { status: 'waiting_for_opponent' }, 
        '-created_date', 
        50
    );

    // Identify games older than 3 minutes
    const now = new Date();
    const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000);
    
    const gamesToDelete = waitingGames
        .filter(game => new Date(game.created_date) < threeMinutesAgo)
        .map(game => game.id);

    if (gamesToDelete.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: 'No abandoned games to clean up.'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    // Delete the identified games
    let cleanedCount = 0;
    for (const gameId of gamesToDelete) {
      try {
        await adminClient.entities.GameSession.delete(gameId);
        cleanedCount++;
      } catch (error) {
        console.error(`Error deleting game ${gameId}:`, error);
        // Continue even if one deletion fails
      }
    }

    return new Response(JSON.stringify({
      success: true,
      cleanedGames: cleanedCount,
      message: `Cleaned up ${cleanedCount} abandoned game(s).`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in cleanupAbandonedGames:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});