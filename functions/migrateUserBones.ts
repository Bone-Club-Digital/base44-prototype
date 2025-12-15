import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
  appId: Deno.env.get('BASE44_APP_ID'),
});

Deno.serve(async (req) => {
  try {
    // 1. Authenticate user from the incoming request and check for admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const token = authHeader.split(' ')[1];
    base44.auth.setToken(token);
    const currentUser = await base44.auth.me();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting bones migration...');

    // 2. Fetch all users and player stats
    const allUsers = await base44.entities.User.list();
    const allPlayerStats = await base44.entities.PlayerStats.list();

    console.log(`Found ${allUsers.length} users and ${allPlayerStats.length} player stats`);

    let updatedUsers = 0;
    let updatedStats = 0;
    let errors = [];

    // 3. Update all User records one by one
    for (const user of allUsers) {
      try {
        await base44.entities.User.update(user.id, { bones_balance: 50 });
        updatedUsers++;
        console.log(`Updated user ${user.id} bones balance to 50`);
      } catch (error) {
        console.error(`Failed to update user ${user.id}:`, error);
        errors.push(`User ${user.id}: ${error.message}`);
      }
    }

    // 4. Update all PlayerStats records one by one
    for (const stat of allPlayerStats) {
      try {
        await base44.entities.PlayerStats.update(stat.id, { bones_balance: 50 });
        updatedStats++;
        console.log(`Updated player stat ${stat.id} bones balance to 50`);
      } catch (error) {
        console.error(`Failed to update player stat ${stat.id}:`, error);
        errors.push(`PlayerStat ${stat.id}: ${error.message}`);
      }
    }

    // 5. Return detailed results
    const message = `Migration complete. Updated ${updatedUsers}/${allUsers.length} users and ${updatedStats}/${allPlayerStats.length} player stats records to have 50 bones.`;
    
    return new Response(JSON.stringify({ 
      success: true,
      message: message,
      details: {
        totalUsers: allUsers.length,
        updatedUsers: updatedUsers,
        totalStats: allPlayerStats.length,
        updatedStats: updatedStats,
        errors: errors
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in migrateUserBones function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});