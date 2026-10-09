// Numbers for the coach screens: each member's week so far, last activity,
// and what needs Greg's attention. Uses the same rules as a client's
// Birdseye (aerobic in moderate-equivalent minutes, resistance and
// flexibility in days; yoga counts as both aerobic and flexibility).
import { needsClearance } from '../screening/screening.js';
import { COACH_ALERT_DAYS, calendarDaysBetween } from '../../lib/activityGap.js';

export const DAY = 864e5;

// Weeks run Monday to Sunday on the coach screens.
export function weekStartMonday(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

const isYoga = (name) => /^yoga$/i.test(String(name || '').trim());

// Which kinds of movement a workout counted as, from its mode and its sets.
function kindsOf(w, wSets) {
  const mode = w.movement_mode;
  const k = { resistance: false, aerobic: false, flexibility: false };
  if (mode === 'Resistance' || mode === 'Combined' || (w.muscle_groups || []).length > 0) k.resistance = true;
  if (mode === 'Aerobic' || mode === 'Combined' || (mode !== 'Flexibility' && (w.activities || []).length > 0)) k.aerobic = true;
  if (mode === 'Flexibility') k.flexibility = true;
  wSets.forEach((s) => {
    const t = s.movement_type || 'resistance';
    if (t === 'resistance' && s.muscle_group !== 'Warm-up') k.resistance = true;
    if (t === 'aerobic') k.aerobic = true;
    if (t === 'flexibility') k.flexibility = true;
    if (isYoga(s.exercise_name)) { k.aerobic = true; k.flexibility = true; }
  });
  return k;
}

export function goalsFor(profile) {
  return {
    aerobic: profile.aerobic_goal_minutes || 150,
    resistance: profile.resistance_goal || 3,
    flexibility: profile.flexibility_goal || 2,
    trackAerobic: profile.track_aerobic_goal !== false,
    trackResistance: profile.track_resistance_goal !== false,
    trackFlexibility: profile.track_flexibility_goal !== false,
  };
}

export function computeMemberStats(clients, workouts, sets, now = new Date()) {
  const start = weekStartMonday(now);
  const setsByWorkout = {};
  sets.forEach((s) => { (setsByWorkout[s.workout_id] ||= []).push(s); });
  const out = {};
  clients.forEach((c) => {
    out[c.id] = { week: { sessions: 0, aerobic: 0, resistance: 0, flexibility: 0 }, lastAt: null, feltOff: null, rpes: [], sessions14: 0 };
  });
  workouts.forEach((w) => {
    const st = out[w.user_id];
    if (!st) return;
    const at = new Date(w.started_at);
    if (!st.lastAt || at > st.lastAt) st.lastAt = at;
    if (now - at < 14 * DAY) {
      st.sessions14 += 1;
      if (w.rpe) st.rpes.push(Number(w.rpe));
      if (w.felt_off && (!st.feltOff || at > st.feltOff.at)) st.feltOff = { at, note: w.felt_off_note || '' };
    }
    if (at >= start) {
      const wSets = setsByWorkout[w.id] || [];
      const k = kindsOf(w, wSets);
      st.week.sessions += 1;
      if (k.resistance) st.week.resistance += 1;
      if (k.flexibility) st.week.flexibility += 1;
      if (k.aerobic) {
        let mins = 0;
        wSets.forEach((s) => {
          if ((s.movement_type || '') === 'aerobic' || isYoga(s.exercise_name)) {
            mins += (Number(s.moderate_minutes) || 0) + 2 * (Number(s.vigorous_minutes) || 0);
          }
        });
        st.week.aerobic += mins;
      }
    }
  });
  clients.forEach((c) => {
    const st = out[c.id]; const g = goalsFor(c);
    const rows = [];
    if (g.trackAerobic) rows.push(st.week.aerobic >= g.aerobic);
    if (g.trackResistance) rows.push(st.week.resistance >= g.resistance);
    if (g.trackFlexibility) rows.push(st.week.flexibility >= g.flexibility);
    st.allGoalsMet = rows.length > 0 && rows.every(Boolean);
    st.avgRpe = st.rpes.length ? st.rpes.reduce((a, b) => a + b, 0) / st.rpes.length : null;
    st.daysSince = st.lastAt ? calendarDaysBetween(now, st.lastAt) : null;
  });
  return out;
}

// Who needs Greg's attention, most urgent first. level: 'red' | 'amber'.
export function buildAttention(clients, stats, now = new Date()) {
  const items = [];
  clients.forEach((c) => {
    const st = stats[c.id];
    const name = c.full_name || c.email;
    const s = c.screening;
    const joinedDays = c.created_at ? Math.floor((now - new Date(c.created_at)) / DAY) : 0;
    if (s && s.result === 'stop_and_clearance' && !s.cleared_at) items.push({ id: c.id, level: 'red', title: name, text: 'Reported symptoms. Paused until a doctor clears them.' });
    if (st.feltOff) items.push({ id: c.id, level: 'red', title: name, text: `Felt off after a workout${st.feltOff.note ? `: ${st.feltOff.note}` : ''}` });
    if (c.membership_status === 'past_due') items.push({ id: c.id, level: 'red', title: name, text: 'Membership payment failed.' });
    if (s && s.result !== 'stop_and_clearance' && needsClearance(s)) items.push({ id: c.id, level: 'amber', title: name, text: 'Needs a doctor’s okay before vigorous exercise.' });
    if (!s && joinedDays >= 2) items.push({ id: c.id, level: 'amber', title: name, text: 'Hasn’t finished the health check.' });
    if (st.daysSince == null && joinedDays >= 3) items.push({ id: c.id, level: 'amber', title: name, text: 'Hasn’t logged a workout yet.' });
    else if (st.daysSince != null && st.daysSince >= COACH_ALERT_DAYS) items.push({ id: c.id, level: 'amber', title: name, text: `${st.daysSince} days since the last workout.` });
  });
  const rank = { red: 0, amber: 1 };
  return items.sort((a, b) => rank[a.level] - rank[b.level]);
}

export function timeAgo(date, now = new Date()) {
  const mins = Math.floor((now - date) / 6e4);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}
