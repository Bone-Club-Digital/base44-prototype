import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const serviceRoleClient = base44.asServiceRole;

    try {
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
        const user = await base44.auth.me();

        const { orderID, cartItems } = await req.json();

        // Get PayPal access token
        const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
        const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
        const base = 'https://api-m.sandbox.paypal.com'; // Use https://api-m.paypal.com for production

        const auth = btoa(`${clientId}:${clientSecret}`);
        const tokenResponse = await fetch(`${base}/v1/oauth2/token`, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'grant_type=client_credentials',
        });
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Capture the order
        const captureResponse = await fetch(`${base}/v2/checkout/orders/${orderID}/capture`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        });
        const captureData = await captureResponse.json();

        if (captureData.status !== 'COMPLETED') {
            throw new Error(`PayPal capture failed with status: ${captureData.status}`);
        }

        const purchaseUnit = captureData.purchase_units[0];
        const totalAmount = parseFloat(purchaseUnit.payments.captures[0].amount.value);
        const transactionId = purchaseUnit.payments.captures[0].id;
        
        // --- Order Fulfillment Logic ---
        // 1. Create the main Order record
        const newOrder = await serviceRoleClient.entities.Order.create({
            user_id: user.id,
            total_amount: totalAmount,
            currency: purchaseUnit.payments.captures[0].amount.currency_code,
            payment_provider: 'paypal',
            transaction_id: transactionId,
            status: 'completed',
        });
        
        // 2. Create OrderItem records for each item in the cart
        const orderItemsToCreate = cartItems.map(item => ({
            order_id: newOrder.id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            price_per_item: item.product_real_price,
            user_id: user.id
        }));

        if (orderItemsToCreate.length > 0) {
            await serviceRoleClient.entities.OrderItem.bulkCreate(orderItemsToCreate);
        }

        // 3. Clear the user's RealMoneyCartItems
        const cartItemIds = cartItems.map(item => item.id);
        if (cartItemIds.length > 0) {
            await Promise.all(cartItemIds.map(id => base44.entities.RealMoneyCartItem.delete(id)));
        }

        return new Response(JSON.stringify({ ...captureData, orderId: newOrder.id }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('PayPal capture error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});