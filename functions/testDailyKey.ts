import { createClient } from 'npm:@base44/sdk@0.1.0';

Deno.serve(async (req) => {
    const base44 = createClient({ appId: Deno.env.get('BASE44_APP_ID') });
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    
    base44.auth.setToken(authHeader.split(' ')[1]);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const key = Deno.env.get('DAILY_API_KEY');
    
    if (!key) {
        return new Response(JSON.stringify({
            keyExists: false,
            isValid: false,
            error: 'DAILY_API_KEY not found in environment.',
            timestamp: new Date().toISOString()
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // Perform a simple GET request to validate the key
        const response = await fetch('https://api.daily.co/v1', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${key}`,
            },
        });

        const data = await response.json();

        return new Response(JSON.stringify({
            keyExists: true,
            isValid: response.ok,
            status: response.status,
            apiResponse: data,
            timestamp: new Date().toISOString()
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            keyExists: true,
            isValid: false,
            error: `Fetch failed: ${error.message}`,
            timestamp: new Date().toISOString()
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});