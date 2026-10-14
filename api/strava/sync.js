import { getAuthedUser } from '../_lib/auth.js';
import { syncUser } from '../_lib/strava.js';

// Brings in any new Strava activities for the signed-in member.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  try {
    res.status(200).json(await syncUser(user.id));
  } catch (err) {
    console.error('strava sync failed', err);
    res.status(500).json({ error: 'Couldn’t reach Strava. Try again in a moment.' });
  }
}
