import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { getAuthedUser } from '../_lib/auth.js';
import { sendPush } from '../_lib/push.js';

// A new member just agreed to the consent screen (their first step): tell Greg.
// Everything shown is read from the database, never trusted from the request, and only members who joined in the last
// two days can trigger it (so people re-agreeing after a wording change don't count as new).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const { data: me } = await supabaseAdmin.from('profiles').select('full_name, email, role, created_at').eq('id', user.id).single();
    if (!me || me.role !== 'client') return res.status(200).json({ sent: 0 });
    if (!me.created_at || Date.now() - new Date(me.created_at).getTime() > 2 * 864e5) return res.status(200).json({ sent: 0 });
    const { data: trainers } = await supabaseAdmin.from('profiles').select('id').eq('role', 'trainer');
    const ids = (trainers || []).map((t) => t.id);
    if (!ids.length) return res.status(200).json({ sent: 0 });
    const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('*').in('user_id', ids);
    const sent = await sendPush(subs || [], {
      title: `${me.full_name || me.email || 'Someone'} just joined Groove`,
      body: 'Open Groove to say hi.',
      tag: `joined-${user.id}`,
      url: '/?view=coach',
    });
    res.status(200).json({ sent });
  } catch (err) {
    console.error('new-member push failed', err);
    res.status(500).json({ error: 'Could not send' });
  }
}
