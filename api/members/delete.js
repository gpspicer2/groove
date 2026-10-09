import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { getAuthedUser } from '../_lib/auth.js';
import { deleteUserCompletely } from '../_lib/deleteUser.js';

// Greg removes a member (for example a test account). Only a coach can call
// this, and only on member accounts: never a coach, never himself.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const { data: me } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (me?.role !== 'trainer') return res.status(403).json({ error: 'Only the coach can do this' });

    const targetId = req.body?.id;
    if (!targetId || targetId === user.id) return res.status(400).json({ error: 'Pick a member' });
    const { data: target } = await supabaseAdmin.from('profiles').select('role').eq('id', targetId).single();
    if (!target || target.role !== 'client') return res.status(400).json({ error: 'That is not a member account' });

    await deleteUserCompletely(targetId);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('member delete failed', err);
    res.status(500).json({ error: 'Could not delete that member' });
  }
}
