import crypto from 'node:crypto';
import { supabaseAdmin } from './supabaseAdmin.js';
import { siteUrl } from './stripe.js';

// Strava connection: sign-in handshake, token upkeep, and importing activities
// (from a Garmin, an Apple Watch, or the Strava app) as Groove workouts.

const API = 'https://www.strava.com/api/v3';
export const stravaConfigured = () => Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);
export const redirectUri = (req) => `${siteUrl(req)}/api/strava/callback`;

// The "state" carried through Strava's sign-in page proves which Groove member started it.
export function signState(userId) {
  const ts = Date.now();
  const sig = crypto.createHmac('sha256', process.env.STRAVA_CLIENT_SECRET).update(`${userId}.${ts}`).digest('hex').slice(0, 32);
  return `${userId}.${ts}.${sig}`;
}
export function readState(state) {
  const [userId, ts, sig] = String(state || '').split('.');
  if (!userId || !ts || !sig) return null;
  const want = crypto.createHmac('sha256', process.env.STRAVA_CLIENT_SECRET).update(`${userId}.${ts}`).digest('hex').slice(0, 32);
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  if (Date.now() - Number(ts) > 20 * 60 * 1000) return null;
  return userId;
}

async function tokenRequest(params) {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, ...params }).toString(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || `Strava error ${res.status}`);
  return json;
}
export const exchangeCode = (code) => tokenRequest({ grant_type: 'authorization_code', code });

async function freshToken(conn) {
  if (conn.expires_at * 1000 > Date.now() + 60 * 1000) return conn.access_token;
  const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: conn.refresh_token });
  await supabaseAdmin.from('strava_connections').update({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at }).eq('user_id', conn.user_id);
  return t.access_token;
}

async function listActivities(token, afterUnix) {
  const out = [];
  for (let page = 1; page <= 5; page += 1) {
    const res = await fetch(`${API}/athlete/activities?after=${afterUnix}&per_page=100&page=${page}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Strava activities error ${res.status}`);
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < 100) break;
  }
  return out;
}

const RESISTANCE = new Set(['WeightTraining', 'Crossfit', 'HighIntensityIntervalTraining', 'Workout']);
const FLEX = new Set(['Yoga', 'Pilates']);
const label = (type) => ({
  TrailRun: 'Trail Run', VirtualRide: 'Ride', EBikeRide: 'E-Bike Ride', MountainBikeRide: 'Mountain Bike', GravelRide: 'Gravel Ride',
  StairStepper: 'Stair Stepper', VirtualRun: 'Run', RockClimbing: 'Rock Climbing', NordicSki: 'Nordic Ski', AlpineSki: 'Alpine Ski',
  Snowboard: 'Snowboard', StandUpPaddling: 'Paddleboarding', InlineSkate: 'Inline Skating', IceSkate: 'Ice Skating',
}[type] || String(type).replace(/([a-z])([A-Z])/g, '$1 $2'));

// Light / moderate / vigorous by heart rate (ACSM %HRmax), or a sensible guess without it.
function intensity(a, maxHr, type) {
  if (a.has_heartrate && a.average_heartrate && maxHr) {
    const pct = a.average_heartrate / maxHr;
    return pct < 0.64 ? 'light' : pct < 0.77 ? 'moderate' : 'vigorous';
  }
  if (FLEX.has(type)) return 'light';
  if (['Run', 'TrailRun', 'VirtualRun', 'Swim', 'Rowing'].includes(type)) return 'vigorous';
  if (type === 'Walk') return a.distance && a.moving_time && a.distance / a.moving_time >= 1.1 ? 'moderate' : 'light';
  return 'moderate';
}

// One Strava activity -> a finished Groove workout plus its single set.
export function mapActivity(a, userId, maxHr) {
  const type = a.sport_type || a.type || 'Workout';
  const seconds = a.moving_time || a.elapsed_time || 0;
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 3) return null;
  const start = new Date(a.start_date);
  const base = { user_id: userId, started_at: start.toISOString(), completed_at: new Date(start.getTime() + seconds * 1000).toISOString(), plan: [], external_id: `strava:${a.id}` };
  const level = intensity(a, maxHr, type);
  const mins = { light_minutes: level === 'light' ? minutes : null, moderate_minutes: level === 'moderate' ? minutes : null, vigorous_minutes: level === 'vigorous' ? minutes : null };
  if (RESISTANCE.has(type)) {
    return {
      workout: { ...base, muscle_groups: ['Full Body'], activities: [], movement_mode: 'Resistance', style: null, location: null },
      set: { user_id: userId, exercise_name: 'Strength Session', muscle_group: 'Full Body', set_number: 1, movement_type: 'resistance', duration_seconds: seconds },
    };
  }
  if (FLEX.has(type)) {
    return {
      workout: { ...base, muscle_groups: [], activities: ['Yoga'], movement_mode: 'Flexibility', location: null },
      set: { user_id: userId, exercise_name: 'Yoga', muscle_group: 'Flexibility', set_number: 1, movement_type: 'flexibility', duration_seconds: seconds, ...mins },
    };
  }
  const name = label(type);
  const miles = a.distance ? a.distance / 1609.34 : 0;
  return {
    workout: { ...base, muscle_groups: [], activities: [name], movement_mode: 'Aerobic', location: null },
    set: { user_id: userId, exercise_name: name, muscle_group: 'Cardio', set_number: 1, movement_type: 'aerobic', duration_seconds: seconds, distance: miles >= 0.1 ? `${miles.toFixed(1)} mi` : null, ...mins },
  };
}

// Which workouts duplicate each other? Strava is trusted for plain cardio and stretching (its timing
// and heart rate are real), so a hand-logged one of the same kind within ~10 hours is replaced by it.
// A hand-logged lifting session (or a mixed one) has the sets and reps Strava can't see, so that one
// stays and the Strava copy is the one that goes. Returns the workout ids to soft-delete.
export function findDuplicates(workouts) {
  const kind = (w) => {
    const m = (w.movement_mode || '').toLowerCase();
    return m === 'aerobic' ? 'aerobic' : m === 'flexibility' ? 'flexibility' : 'strength';
  };
  const WINDOW = 10 * 3600 * 1000;
  const isStrava = (w) => String(w.external_id || '').startsWith('strava:');
  const strava = workouts.filter(isStrava).sort((x, y) => new Date(x.started_at) - new Date(y.started_at));
  const manual = workouts.filter((w) => !isStrava(w) && w.completed_at);
  const used = new Set();
  const drop = [];
  strava.forEach((sw) => {
    const sk = kind(sw);
    const t = new Date(sw.started_at).getTime();
    const match = manual
      .filter((m) => !used.has(m.id) && Math.abs(new Date(m.started_at).getTime() - t) <= WINDOW
        && (kind(m) === sk || (m.movement_mode === 'Combined' && (sk === 'aerobic' || sk === 'strength'))))
      .sort((x, y) => Math.abs(new Date(x.started_at) - t) - Math.abs(new Date(y.started_at) - t))[0];
    if (!match) return;
    used.add(match.id);
    if ((sk === 'aerobic' || sk === 'flexibility') && kind(match) === sk) drop.push(match.id); // Strava wins
    else drop.push(sw.id); // the detailed hand-logged workout wins
  });
  return drop;
}

// Pulls new activities since the last sync (first time: the last 30 days) and adds the ones
// Groove doesn't have yet. Anything you already logged by hand around the same time is skipped.
export async function syncUser(userId) {
  const { data: conn } = await supabaseAdmin.from('strava_connections').select('*').eq('user_id', userId).maybeSingle();
  if (!conn) return { imported: 0, connected: false };
  const token = await freshToken(conn);
  const { data: profile } = await supabaseAdmin.from('profiles').select('age, max_hr_bpm').eq('id', userId).single();
  const maxHr = Number(profile?.max_hr_bpm) || (profile?.age ? 220 - Number(profile.age) : 0);

  const since = conn.last_synced_at ? new Date(conn.last_synced_at).getTime() - 2 * 864e5 : Date.now() - 30 * 864e5;
  const activities = await listActivities(token, Math.floor(since / 1000));
  if (!activities.length) {
    const removed = await reconcile(userId);
    await supabaseAdmin.from('strava_connections').update({ last_synced_at: new Date().toISOString() }).eq('user_id', userId);
    return { imported: 0, removed, connected: true };
  }

  // Includes deleted ones, so a Strava workout you removed is never brought back.
  const { data: known } = await supabaseAdmin.from('workouts').select('external_id').eq('user_id', userId).not('external_id', 'is', null);
  const have = new Set((known || []).map((w) => w.external_id));

  let imported = 0;
  for (const a of activities) {
    if (have.has(`strava:${a.id}`)) continue;
    const row = mapActivity(a, userId, maxHr);
    if (!row) continue;
    const { data: w, error } = await supabaseAdmin.from('workouts').insert(row.workout).select('id').single();
    if (error) { console.error('strava workout insert', error.message); continue; }
    const { error: setError } = await supabaseAdmin.from('workout_sets').insert({ ...row.set, workout_id: w.id });
    if (setError) console.error('strava set insert', setError.message);
    imported += 1;
  }
  const removed = await reconcile(userId);
  await supabaseAdmin.from('strava_connections').update({ last_synced_at: new Date().toISOString() }).eq('user_id', userId);
  return { imported, removed, connected: true };
}

// Tidies duplicates between hand-logged and Strava workouts (see findDuplicates). Deleted ones go to
// Birdseye's "Deleted Workouts", so nothing is lost for good.
async function reconcile(userId) {
  const from = new Date(Date.now() - 40 * 864e5).toISOString();
  const { data } = await supabaseAdmin.from('workouts').select('id, external_id, movement_mode, started_at, completed_at').eq('user_id', userId).is('deleted_at', null).gte('started_at', from);
  const ids = findDuplicates(data || []);
  if (ids.length) await supabaseAdmin.from('workouts').update({ deleted_at: new Date().toISOString() }).in('id', ids);
  return ids.length;
}
