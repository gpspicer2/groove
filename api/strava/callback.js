import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { siteUrl } from '../_lib/stripe.js';
import { stravaConfigured, readState, exchangeCode, syncUser } from '../_lib/strava.js';

// Strava sends the member back here after they tap Allow.
export default async function handler(req, res) {
  const home = siteUrl(req);
  try {
    if (!stravaConfigured()) return res.redirect(`${home}/?strava=error`);
    const { code, state, error, scope } = req.query;
    const userId = readState(state);
    if (error || !code || !userId) return res.redirect(`${home}/?strava=denied`);
    if (scope && !String(scope).includes('activity:read')) return res.redirect(`${home}/?strava=denied`);
    const t = await exchangeCode(code);
    await supabaseAdmin.from('strava_connections').upsert({
      user_id: userId, athlete_id: t.athlete?.id || null,
      access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at, last_synced_at: null,
    });
    await supabaseAdmin.from('profiles').update({ strava_connected: true }).eq('id', userId);
    await syncUser(userId);
    res.redirect(`${home}/?strava=connected`);
  } catch (err) {
    console.error('strava callback failed', err);
    res.redirect(`${home}/?strava=error`);
  }
}
