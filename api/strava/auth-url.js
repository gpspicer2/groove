import { getAuthedUser } from '../_lib/auth.js';
import { stravaConfigured, redirectUri, signState } from '../_lib/strava.js';

// Gives the app the address of Strava's "allow Groove" page for this member.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  if (!stravaConfigured()) return res.status(503).json({ error: 'Strava isn’t set up yet.' });
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: redirectUri(req),
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
    state: signState(user.id),
  });
  // On a phone, Strava's mobile address opens the Strava app (if it's installed) to approve, and falls back to the website.
  const mobile = /iPhone|iPad|Android/i.test(req.headers['user-agent'] || '');
  res.status(200).json({ url: `https://www.strava.com/oauth/${mobile ? 'mobile/authorize' : 'authorize'}?${params.toString()}` });
}
