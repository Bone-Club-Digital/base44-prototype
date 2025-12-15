import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        const serviceClient = base44.asServiceRole;

        // Find the FREE plan
        const freePlans = await serviceClient.entities.Plan.filter({ name: 'FREE' });
        if (freePlans.length === 0) {
            throw new Error("FREE plan not found in the system.");
        }
        const freePlan = freePlans[0];

        // Update the user's plan
        await serviceClient.entities.User.update(user.id, {
            plan_id: freePlan.id,
            subscription_end_date: null
        });
        
        // You might want to add a call to your payment provider (e.g., Stripe) here
        // to cancel the actual subscription. This example only handles internal data.

        return new Response(JSON.stringify({ message: 'Account downgraded to FREE plan successfully.' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Downgrade error:', error);
        return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred during downgrade.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});