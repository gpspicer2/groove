import { supabase } from './supabaseClient';

export async function deleteAccount() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');
  const res = await fetch('/api/account/delete', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Could not delete account');
  return body;
}
