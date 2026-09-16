import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { getAuthedUser } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const uid = user.id;
    // Delete everything this account owns before the account itself —
    // several of these tables reference auth.users without ON DELETE
    // CASCADE, so the user row can't go first.
    await supabaseAdmin.from('baseline_responses').delete().eq('user_id', uid);
    await supabaseAdmin.from('workout_sets').delete().eq('user_id', uid);
    await supabaseAdmin.from('workouts').delete().eq('user_id', uid);
    await supabaseAdmin.from('journal_entries').delete().eq('user_id', uid);
    await supabaseAdmin.from('messages').delete().or(`sender_id.eq.${uid},recipient_id.eq.${uid}`);
    await supabaseAdmin.from('profiles').delete().eq('id', uid);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) throw error;

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('account delete failed', err);
    res.status(500).json({ error: 'Could not delete account' });
  }
}
