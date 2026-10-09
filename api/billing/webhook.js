import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { stripe, verifyWebhook } from '../_lib/stripe.js';

// Stripe needs the exact raw request to verify its signature.
export const config = { api: { bodyParser: false } };

function readRaw(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// Stripe's subscription states -> the three things the app cares about.
function mapStatus(status) {
  if (status === 'active') return 'active';
  if (status === 'trialing') return 'trialing';
  if (status === 'past_due' || status === 'unpaid') return 'past_due';
  return 'canceled'; // canceled, incomplete_expired, paused...
}

async function applySubscription(sub) {
  const fields = {
    membership_status: mapStatus(sub.status),
    stripe_customer_id: sub.customer,
    stripe_subscription_id: sub.id,
    membership_renews_at: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
  };
  const userId = sub.metadata?.user_id;
  const query = supabaseAdmin.from('profiles').update(fields);
  const { error } = userId ? await query.eq('id', userId) : await query.eq('stripe_customer_id', sub.customer);
  if (error) throw error;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const raw = await readRaw(req);
  if (!verifyWebhook(raw, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)) {
    return res.status(400).json({ error: 'Bad signature' });
  }

  try {
    const event = JSON.parse(raw);
    const obj = event.data.object;
    if (event.type === 'checkout.session.completed' && obj.mode === 'subscription') {
      const userId = obj.client_reference_id || obj.metadata?.user_id;
      if (userId && obj.subscription) {
        // Link the Stripe customer right away, then pull the subscription's real state.
        await supabaseAdmin.from('profiles').update({ stripe_customer_id: obj.customer, stripe_subscription_id: obj.subscription }).eq('id', userId);
        const sub = await stripe('GET', `/subscriptions/${obj.subscription}`);
        await applySubscription({ ...sub, metadata: { ...sub.metadata, user_id: userId } });
      }
    } else if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      await applySubscription(event.type === 'customer.subscription.deleted' ? { ...obj, status: 'canceled' } : obj);
    } else if (event.type === 'invoice.payment_failed' && obj.customer) {
      await supabaseAdmin.from('profiles').update({ membership_status: 'past_due' }).eq('stripe_customer_id', obj.customer);
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('webhook failed', err);
    // A 500 makes Stripe retry later, which is what we want for a hiccup.
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}
