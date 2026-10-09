import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { getAuthedUser } from '../_lib/auth.js';
import { sendPush } from '../_lib/push.js';

// A member said they felt off after a workout: tell Greg right away.
// The note itself is read from the database, never trusted from the request.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const { data: me } = await supabaseAdmin.from('profiles').select('full_name, email').eq('id', user.id).single();
    const { data: latest } = await supabaseAdmin.from('workouts').select('felt_off, felt_off_note, started_at').eq('user_id', user.id).eq('felt_off', true).order('started_at', { ascending: false }).limit(1);
    if (!latest || latest.length === 0) return res.status(200).json({ sent: 0 });
    const { data: trainers } = await supabaseAdmin.from('profiles').select('id').eq('role', 'trainer');
    const ids = (trainers || []).map((t) => t.id);
    if (!ids.length) return res.status(200).json({ sent: 0 });
    const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('*').in('user_id', ids);
    const note = latest[0].felt_off_note;
    const sent = await sendPush(subs || [], {
      title: `${me?.full_name || me?.email || 'A member'} felt off after a workout`,
      body: note || 'Open Groove to check in.',
      tag: `feltoff-${user.id}`,
      url: '/',
    });
    res.status(200).json({ sent });
  } catch (err) {
    console.error('felt-off push failed', err);
    res.status(500).json({ error: 'Could not send' });
  }
}
