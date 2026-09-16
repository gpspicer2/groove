import { createClient } from '@supabase/supabase-js';

// Verifies the caller's Supabase login token and returns the real user it
// belongs to — never trust a user id supplied directly by the client.
export async function getAuthedUser(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
