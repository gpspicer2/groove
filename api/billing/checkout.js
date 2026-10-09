import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { getAuthedUser } from '../_lib/auth.js';
import { stripe, siteUrl } from '../_lib/stripe.js';

// Starts a membership signup: returns the address of Stripe's secure
// checkout page for the signed-in member.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  if (!process.env.STRIPE_PRICE_ID) return res.status(500).json({ error: 'Membership is not set up yet.' });

  try {
    const { data: profile } = await supabaseAdmin.from('profiles').select('stripe_customer_id, email').eq('id', user.id).single();
    const base = siteUrl(req);
    const session = await stripe('POST', '/checkout/sessions', {
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      client_reference_id: user.id,
      ...(profile?.stripe_customer_id ? { customer: profile.stripe_customer_id } : { customer_email: user.email }),
      subscription_data: { metadata: { user_id: user.id } },
      metadata: { user_id: user.id },
      allow_promotion_codes: true,
      success_url: `${base}/?checkout=success`,
      cancel_url: `${base}/?checkout=cancel`,
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('checkout failed', err);
    res.status(500).json({ error: 'Could not start checkout.' });
  }
}
