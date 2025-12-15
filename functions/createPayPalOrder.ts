import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const { items, total } = await req.json();
        
        console.log('PayPal Order Request:', { items, total, totalType: typeof total });

        // Validate inputs
        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new Error('No items provided for order');
        }
        
        if (typeof total !== 'number' || isNaN(total) || total <= 0) {
            throw new Error(`Invalid total amount: ${total} (type: ${typeof total})`);
        }

        // Get PayPal credentials
        const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
        const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
        
        if (!clientId || !clientSecret) {
            throw new Error('PayPal credentials not configured');
        }

        const base = 'https://api-m.sandbox.paypal.com'; // Use https://api-m.paypal.com for production

        const auth = btoa(`${clientId}:${clientSecret}`);
        
        // Get access token
        const tokenResponse = await fetch(`${base}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            throw new Error(`Failed to get PayPal access token: ${tokenData.error || 'Unknown error'} - ${tokenData.error_description || ''}`);
        }
        
        const accessToken = tokenData.access_token;

        // Simplified order structure - just the total amount without item breakdown
        const orderData = {
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: 'GBP',
                    value: total.toFixed(2)
                },
                description: `Bone Club Shop Order - ${items.length} item(s)`
            }],
            application_context: {
                return_url: `${req.headers.get('origin')}/Shop`,
                cancel_url: `${req.headers.get('origin')}/Shop`,
                brand_name: "Bone Club",
                shipping_preference: "NO_SHIPPING"
            }
        };

        console.log('Creating PayPal Order with simplified data:', JSON.stringify(orderData, null, 2));

        const orderResponse = await fetch(`${base}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
        });

        const order = await orderResponse.json();
        
        if (!orderResponse.ok) {
            console.error('PayPal Order Creation Failed:', order);
            throw new Error(order.message || `PayPal order creation failed: ${orderResponse.status}`);
        }

        console.log('PayPal Order Created Successfully:', { id: order.id, status: order.status });

        return new Response(JSON.stringify({ 
            id: order.id,
            status: order.status 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('PayPal order creation error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});