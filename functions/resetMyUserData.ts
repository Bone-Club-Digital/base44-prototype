import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
  appId: Deno.env.get('BASE44_APP_ID'),
});

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    const token = authHeader.split(' ')[1];
    base44.auth.setToken(token);
    
    const user = await base44.auth.me();
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { 
        status: 404, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Reset user data to trigger username setup modal
    await base44.entities.User.update(user.id, {
      username: null,
      rating: 1500,
      games_played: 0,
      games_won: 0,
      bones_balance: 100
    });

    // Also clean up any PlayerStats records for this user
    try {
      const playerStatsList = await base44.entities.PlayerStats.filter({ user_id: user.id });
      for (const stats of playerStatsList) {
        await base44.entities.PlayerStats.delete(stats.id);
      }
    } catch (error) {
      console.log('No PlayerStats to clean up:', error.message);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'User data reset successfully. Please refresh the page.' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error resetting user data:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});