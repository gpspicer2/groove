import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { getAuthedUser } from '../_lib/auth.js';

// Saves a phone's reminder address for the signed-in person. Done here (not
// from the app) so a phone shared by two accounts can move from one to the
// other: the newest account to turn reminders on gets them.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  const { endpoint, p256dh, auth, tz } = req.body || {};
  if (!endpoint || !p256dh || !auth) return res.status(400).json({ error: 'Missing subscription' });
  try {
    const { error } = await supabaseAdmin.from('push_subscriptions').upsert(
      { user_id: user.id, endpoint, p256dh, auth, tz: tz || null },
      { onConflict: 'endpoint' }
    );
    if (error) throw error;
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('subscribe failed', err);
    res.status(500).json({ error: 'Could not save' });
  }
}
