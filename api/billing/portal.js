import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { getAuthedUser } from '../_lib/auth.js';
import { stripe, siteUrl } from '../_lib/stripe.js';

// Opens Stripe's customer portal, where a member updates their card,
// downloads receipts, or cancels.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const { data: profile } = await supabaseAdmin.from('profiles').select('stripe_customer_id').eq('id', user.id).single();
    if (!profile?.stripe_customer_id) return res.status(400).json({ error: 'No billing account yet.' });
    const session = await stripe('POST', '/billing_portal/sessions', {
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl(req)}/`,
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('portal failed', err);
    res.status(500).json({ error: 'Could not open billing.' });
  }
}
