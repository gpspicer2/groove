// Numbers for the coach screens: each member's week so far, last activity,
// and what needs Greg's attention. Uses the same rules as a client's
// Birdseye (aerobic in moderate-equivalent minutes, resistance and
// flexibility in days; yoga counts as both aerobic and flexibility).
import { needsClearance, clearanceReason } from '../screening/screening.js';
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
  // (A flexibility workout stores the muscle groups it stretches; that doesn't make it lifting.)
  if (mode === 'Resistance' || mode === 'Combined' || (mode !== 'Flexibility' && (w.muscle_groups || []).length > 0)) k.resistance = true;
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
    resistance: profile.resistance_goal || 2,
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
    out[c.id] = { week: { sessions: 0, aerobic: 0, resistance: 0, flexibility: 0 }, resDays: new Set(), flexDays: new Set(), lastAt: null, feltOff: null, rpes: [], sessions14: 0 };
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
      // Resistance and flexibility goals count days, not workouts.
      const dk = `${at.getFullYear()}-${at.getMonth()}-${at.getDate()}`;
      if (k.resistance) { st.resDays.add(dk); st.week.resistance = st.resDays.size; }
      if (k.flexibility) { st.flexDays.add(dk); st.week.flexibility = st.flexDays.size; }
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
// Each item has a `kind` and a `sig` (what the issue looks like right now). Once Greg has
// opened a member, their items are acknowledged: an item stays hidden until its signature
// changes (a new "felt off", a new workout and then a new gap, a different screening result).
// `acks` is { memberId: { kind: sig } }, merged with the member's saved `coach_ack`.
export function buildAttention(clients, stats, now = new Date(), acks = {}) {
  const items = [];
  clients.forEach((c) => {
    const st = stats[c.id];
    const name = c.full_name || c.email;
    const s = c.screening;
    const joinedDays = c.created_at ? Math.floor((now - new Date(c.created_at)) / DAY) : 0;
    const add = (level, kind, sig, text) => items.push({ id: c.id, level, kind, sig: String(sig), title: name, text });
    if (joinedDays < 7 && c.consented_at) add('new', 'newMember', 'joined', joinedDays === 0 ? 'Just joined today. Say hi!' : `Joined ${joinedDays} day${joinedDays === 1 ? '' : 's'} ago. Say hi!`);
    if (s && s.result === 'stop_and_clearance' && !s.cleared_at) add('red', 'symptoms', s.result, `Reported symptoms. Paused until a doctor clears them.${clearanceReason(s) ? ` Why: ${clearanceReason(s)}.` : ''}`);
    if (st.feltOff) add('red', 'feltOff', +new Date(st.feltOff.at), `Felt off after a workout${st.feltOff.note ? `: ${st.feltOff.note}` : ''}`);
    if (c.membership_status === 'past_due') add('red', 'pastDue', 'past_due', 'Membership payment failed.');
    if (s && s.result !== 'stop_and_clearance' && needsClearance(s)) add('amber', 'clearance', s.result, `Needs a doctor’s okay before vigorous exercise.${clearanceReason(s) ? ` Why: ${clearanceReason(s)}.` : ''}`);
    if (!s && joinedDays >= 2) add('amber', 'healthCheck', 'none', 'Hasn’t finished the health check.');
    if (st.daysSince == null && joinedDays >= 3) add('amber', 'gap', 'none', 'Hasn’t logged a workout yet.');
    else if (st.daysSince != null && st.daysSince >= COACH_ALERT_DAYS) add('amber', 'gap', +new Date(st.lastAt), `${st.daysSince} days since the last workout.`);
  });
  const byId = Object.fromEntries(clients.map((c) => [c.id, c]));
  const seen = (item) => {
    const mine = { ...(byId[item.id]?.coach_ack || {}), ...(acks[item.id] || {}) };
    return mine[item.kind] === item.sig;
  };
  const rank = { red: 0, new: 1, amber: 2 };
  return items.filter((i) => !seen(i)).sort((a, b) => rank[a.level] - rank[b.level]);
}

export function timeAgo(date, now = new Date()) {
  const mins = Math.floor((now - date) / 6e4);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}
