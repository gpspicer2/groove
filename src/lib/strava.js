import { supabase } from './supabaseClient';

// Strava is switched on per deployment (VITE_STRAVA_ENABLED=true in Vercel) once the keys are set up.
export const STRAVA_ENABLED = import.meta.env.VITE_STRAVA_ENABLED === 'true';

async function call(path) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');
  const res = await fetch(path, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } });
  let body = {};
  try { body = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) throw new Error(body.error || 'Something went wrong with Strava. Try again.');
  return body;
}

// Sends the member to Strava's "allow Groove" page.
export async function connectStrava() {
  const { url } = await call('/api/strava/auth-url');
  window.location.href = url;
}
export const disconnectStrava = () => call('/api/strava/disconnect');

// Brings in new activities; tells open screens to reload when something arrived.
export async function syncStrava() {
  const out = await call('/api/strava/sync');
  try { localStorage.setItem('groove:stravaSync', String(Date.now())); } catch { /* storage blocked */ }
  if (out.imported > 0 || out.removed > 0) window.dispatchEvent(new Event('groove:workoutsChanged'));
  return out;
}
export function stravaSyncedRecently(minutes = 10) {
  try { return Date.now() - Number(localStorage.getItem('groove:stravaSync') || 0) < minutes * 60 * 1000; } catch { return false; }
}
