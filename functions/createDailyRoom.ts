import { createClient } from 'npm:@base44/sdk@0.1.0';

Deno.serve(async (req) => {
    const base44 = createClient({ appId: Deno.env.get('BASE44_APP_ID') });
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
    
    base44.auth.setToken(authHeader.split(' ')[1]);
    const user = await base44.auth.me();
    
    if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    const key = Deno.env.get('DAILY_API_KEY');
    if (!key) {
        return new Response(JSON.stringify({ error: 'Daily API key not configured' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    try {
        const roomConfig = {
            properties: {
                exp: Math.round(Date.now() / 1000) + 7200, // 2 hours from now
                max_participants: 2,
                enable_chat: false, // Disable text chat since we have our own
                enable_screenshare: false // Keep it simple for backgammon
            }
        };

        const response = await fetch('https://api.daily.co/v1/rooms', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${key}` 
            },
            body: JSON.stringify(roomConfig)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Daily.co API error:', response.status, errorText);
            return new Response(JSON.stringify({ 
                error: `Daily.co API error: ${response.status}`,
                details: errorText 
            }), { 
                status: response.status, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const roomData = await response.json();
        console.log('Daily.co room created successfully:', roomData.url);
        
        return new Response(JSON.stringify({ url: roomData.url }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error creating Daily.co room:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to create video room',
            details: error.message 
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
});