
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

// This function securely provides the public PayPal Client ID to the frontend.
Deno.serve(async (req) => {
    // No authentication is needed as this is a public, non-sensitive key.
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID_FRONTEND");

    if (!clientId || clientId === 'PAYPAL_CLIENT_ID_FRONTEND_PLACEHOLDER') {
        console.error("PAYPAL_CLIENT_ID_FRONTEND is not configured in the environment variables.");
        return new Response(JSON.stringify({ error: 'PayPal integration is not configured correctly.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({
        clientId: clientId, // Using the validated clientId variable
        currency: 'GBP',
        country: 'GB' // Corresponds to UK for PayPal region code
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
});
