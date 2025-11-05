// supabase/functions/paystack-webhook/index.ts
// (FIXED: Renamed Supabase env variables to avoid conflict)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// This is the main function that will be called
Deno.serve(async (req) => {
    const supabaseAdmin = createClient(// Get Supabase URL and Service Role Key from secrets
        // (Using the new variable names)
        Deno.env.get('PUBLIC_SUPABASE_URL'), Deno.env.get('PUBLIC_SUPABASE_SERVICE_ROLE_KEY'));
    // 1. Get the request body and signature from Paystack
    const body = await req.text();
    const signature = req.headers.get('x-paystack-signature');
    // Get your Paystack Webhook Secret from secrets
    const PAYSTACK_WEBHOOK_SECRET = Deno.env.get('PAYSTACK_WEBHOOK_SECRET');
    if (!PAYSTACK_WEBHOOK_SECRET) {
        console.error('PAYSTACK_WEBHOOK_SECRET is not set in environment variables.');
        return new Response('Webhook secret not configured', {
            status: 500
        });
    }
    // 2. Verify the signature to ensure the request is from Paystack
    const hash = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', new TextEncoder().encode(PAYSTACK_WEBHOOK_SECRET), {
        name: 'HMAC',
        hash: 'SHA-512'
    }, false, [
        'sign'
    ]), new TextEncoder().encode(body));
    const computedSignature = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
    if (computedSignature !== signature) {
        console.warn('Invalid Paystack signature received.');
        return new Response('Invalid signature', {
            status: 401
        });
    }
    // 3. Signature is valid, process the payment event
    const event = JSON.parse(body);
    if (event.event === 'charge.success') {
        const paymentData = event.data;
        const reference = paymentData.reference;
        // Extract the order ID from the reference (e.g., "C2G-ORDER-123")
        const orderId = reference.split('-').pop();
        if (!orderId) {
            console.warn('Webhook received for success, but no order ID found in reference:', reference);
            return new Response('Invalid reference format', {
                status: 400
            });
        }
        try {
            // 4. Update the order in your Supabase database
            const { data, error } = await supabaseAdmin.from('orders').update({
                payment_status: 'paid',
                order_status: 'processing' // You can also update the order status
            }).eq('id', orderId).eq('payment_status', 'awaiting_payment') // Only update if it's not already paid
                .select();
            if (error) {
                throw error;
            }
            if (!data || data.length === 0) {
                console.warn('Webhook success, but no matching order found for ID:', orderId);
                // Still return 200 so Paystack stops sending
            } else {
                console.log('Payment success: Order updated in database:', orderId);
            }
            // 5. Send a 200 OK response to Paystack
            return new Response('Webhook received and processed', {
                status: 200
            });
        } catch (err) {
            console.error('Error updating order in database:', err.message);
            return new Response(`Server error: ${err.message}`, {
                status: 500
            });
        }
    }
    // If it's not a 'charge.success' event, just acknowledge it
    return new Response('Event received, but not processed', {
        status: 200
    });
});
