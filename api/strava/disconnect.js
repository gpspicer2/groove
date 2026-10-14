import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { getAuthedUser } from '../_lib/auth.js';

// Stops syncing. Workouts already imported stay in the member's history.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const { data: conn } = await supabaseAdmin.from('strava_connections').select('access_token').eq('user_id', user.id).maybeSingle();
    if (conn?.access_token) {
      await fetch('https://www.strava.com/oauth/deauthorize', { method: 'POST', headers: { Authorization: `Bearer ${conn.access_token}` } }).catch(() => {});
    }
    await supabaseAdmin.from('strava_connections').delete().eq('user_id', user.id);
    await supabaseAdmin.from('profiles').update({ strava_connected: false }).eq('id', user.id);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('strava disconnect failed', err);
    res.status(500).json({ error: 'Couldn’t disconnect. Try again.' });
  }
}
