import { supabase } from '../../lib/supabaseClient';
import { notifyCleared } from '../../lib/push';

// Greg's call: clear a member himself (they get told), or undo it. Returns { error } like Supabase.
export async function setClearance(client, on, onClientChanged) {
  const s = client.screening;
  if (!s) return { error: { message: 'No health check yet.' } };
  const next = on ? { ...s, cleared_at: new Date().toISOString(), cleared_by: 'coach' } : { ...s, cleared_at: null, cleared_by: null };
  const { error } = await supabase.from('profiles').update({ screening: next }).eq('id', client.id);
  if (error) return { error };
  onClientChanged?.(client.id, { screening: next });
  if (on) notifyCleared(client.id);
  return { error: null };
}
