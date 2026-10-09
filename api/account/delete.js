import { getAuthedUser } from '../_lib/auth.js';
import { deleteUserCompletely } from '../_lib/deleteUser.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  try {
    await deleteUserCompletely(user.id);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('account delete failed', err);
    res.status(500).json({ error: 'Could not delete account' });
  }
}
