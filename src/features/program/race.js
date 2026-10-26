import { startOfWeek } from '../../lib/week.js';

// Train for a race: 5K, 10K, half marathon or marathon. Pure data and math, like programs.js.
//
// How the plan is built (plain words, with where each idea comes from):
// - Fitness is measured with a VDOT score (Jack Daniels' "Running Formula"): one number worked out from a recent race
//   or hard effort that gives equivalent race times and the pace for each kind of training run. Paces get a little
//   faster through the plan as fitness grows, and the plan is honest when a goal time is too big a jump.
// - About 80% of the running is easy (conversational) and the hard days are a few, well-planned ones (the "polarized" /
//   80-20 pattern, Seiler). Hard work is a tempo (threshold) run or intervals, then race-pace work close to race day.
// - Weekly distance builds about 10% a week at most, with a lighter "cutback" week every 3rd or 4th week so tendons and
//   joints can catch up. The 10% idea is a rule of thumb, not a guarantee, so beginners also start with run/walk.
// - The long run grows toward a distance cap for the race (the marathon long run tops out near 20 miles, 3 weeks out).
// - A taper cuts volume while keeping a little intensity: 3 weeks for a marathon, 2 for the shorter races (reviews of
//   tapering studies favor about 2 weeks and a 40-60% volume cut; marathons are longer because of more built-up fatigue).
// Everything is general guidance for healthy adults, not medical advice.

export const MI = 1609.344;

export const RACES = {
  '5k': { id: '5k', label: '5K', meters: 5000, minWeeks: { beginner: 8, novice: 6, intermediate: 5, advanced: 4 }, goodWeeks: { beginner: 10, novice: 8, intermediate: 7, advanced: 6 }, defaultWeeks: 8 },
  '10k': { id: '10k', label: '10K', meters: 10000, minWeeks: { beginner: 12, novice: 8, intermediate: 6, advanced: 5 }, goodWeeks: { beginner: 14, novice: 10, intermediate: 8, advanced: 7 }, defaultWeeks: 10 },
  half: { id: 'half', label: 'Half Marathon', meters: 21097.5, minWeeks: { beginner: 20, novice: 12, intermediate: 10, advanced: 8 }, goodWeeks: { beginner: 24, novice: 14, intermediate: 12, advanced: 10 }, defaultWeeks: 12 },
  marathon: { id: 'marathon', label: 'Marathon', meters: 42195, minWeeks: { beginner: 28, novice: 18, intermediate: 14, advanced: 12 }, goodWeeks: { beginner: 30, novice: 20, intermediate: 16, advanced: 14 }, defaultWeeks: 16 },
};
export const MAX_PLAN_WEEKS = 30;

const LEVELS = ['beginner', 'novice', 'intermediate', 'advanced'];
export const LEVEL_LABEL = { beginner: 'Beginner', novice: 'Novice', intermediate: 'Intermediate', advanced: 'Advanced' };

// Weekly running distance at the plan's peak (miles), the long-run ceiling, and the taper (share of peak volume per taper week).
const SPEC = {
  '5k': { peak: { beginner: 12, novice: 18, intermediate: 26, advanced: 36 }, longCap: { beginner: 5, novice: 8, intermediate: 9, advanced: 11 }, longShare: 0.42, taper: [0.85, 0.6] },
  '10k': { peak: { beginner: 15, novice: 22, intermediate: 32, advanced: 44 }, longCap: { beginner: 6, novice: 10, intermediate: 12, advanced: 14 }, longShare: 0.42, taper: [0.8, 0.55] },
  half: { peak: { beginner: 20, novice: 28, intermediate: 38, advanced: 50 }, longCap: { beginner: 10, novice: 12, intermediate: 14, advanced: 16 }, longShare: 0.42, taper: [0.75, 0.5] },
  marathon: { peak: { beginner: 28, novice: 38, intermediate: 50, advanced: 62 }, longCap: { beginner: 18, novice: 20, intermediate: 20, advanced: 22 }, longShare: 0.5, taper: [0.85, 0.7, 0.45] },
};

// ---------- Fitness math (Daniels' VDOT) ----------
const vo2 = (v) => -4.6 + 0.182258 * v + 0.000104 * v * v; // oxygen cost at v metres per minute
const pctMax = (min) => 0.8 + 0.1894393 * Math.exp(-0.012778 * min) + 0.2989558 * Math.exp(-0.1932605 * min); // share of VO2max you can hold for `min` minutes
export function vdotFromRace(meters, seconds) {
  const min = seconds / 60;
  return vo2(meters / min) / pctMax(min);
}
function velocityAtVo2(v) { // metres per minute at an oxygen cost
  const a = 0.000104; const b = 0.182258; const c = -4.6 - v;
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}
export function paceAtPct(vdot, pct) { return (MI / velocityAtVo2(vdot * pct)) * 60; } // seconds per mile
export function predictSeconds(vdot, meters) { // equivalent race time at this fitness
  let lo = meters / 8; let hi = meters / 0.8;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    if (vdotFromRace(meters, mid) > vdot) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
export const racePaceSec = (vdot, meters) => (predictSeconds(vdot, meters) / meters) * MI; // seconds per mile
// Training paces (seconds per mile). Easy is a range: [fast end, slow end].
export function paces(vdot, meters) {
  return {
    easy: [paceAtPct(vdot, 0.71), paceAtPct(vdot, 0.61)],
    tempo: paceAtPct(vdot, 0.88),
    interval: paceAtPct(vdot, 0.98),
    race: racePaceSec(vdot, meters),
  };
}

// ---------- Formatting ----------
export const kmFromMi = (m) => m * 1.609344;
export function fmtDist(miles, units = 'mi', digits = 1) {
  const x = units === 'km' ? kmFromMi(miles) : miles;
  const r = Math.round(x * 10 ** digits) / 10 ** digits;
  return `${Number.isInteger(r) ? r : r.toFixed(digits)} ${units}`;
}
export function fmtPace(secPerMile, units = 'mi') {
  const s = Math.round(units === 'km' ? secPerMile / 1.609344 : secPerMile);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
export const paceRange = (r, units) => `${fmtPace(r[0], units)}–${fmtPace(r[1], units)} /${units}`;
export const paceOne = (p, units) => `${fmtPace(p, units)} /${units}`;
export function fmtTime(sec) {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const r = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}
// "25:30", "1:45:00" or "4 hr 10 min" style input -> seconds (null when it doesn't read as a time).
export function parseTime(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  const parts = t.split(':').map((x) => Number(x));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

// ---------- Where are we starting? ----------
// Weekly running chips and longest-run chips map to a representative number of miles.
export const WEEKLY_CHOICES = [
  { id: 0, label: 'Not Running Yet', mi: 0 },
  { id: 1, label: 'Under 5 Miles', mi: 3 },
  { id: 2, label: '5 to 15 Miles', mi: 10 },
  { id: 3, label: '15 to 25 Miles', mi: 20 },
  { id: 4, label: '25 or More Miles', mi: 32 },
];
export const LONGEST_CHOICES = [
  { id: 0, label: "Can't Run 10 Minutes Straight", mi: 0 },
  { id: 1, label: 'About 20 Minutes (1 to 2 Miles)', mi: 1.8 },
  { id: 2, label: '3 to 5 Miles', mi: 4 },
  { id: 3, label: '6 to 9 Miles', mi: 7.5 },
  { id: 4, label: '10 to 13 Miles', mi: 11.5 },
  { id: 5, label: '14 Miles or More', mi: 15 },
];
export function levelFor({ weeklyMi, longestMi }) {
  if (weeklyMi < 4 || longestMi < 2.5) return 'beginner';
  if (weeklyMi < 15) return 'novice';
  if (weeklyMi < 28) return 'intermediate';
  return 'advanced';
}
const DEFAULT_VDOT = { beginner: 27, novice: 31, intermediate: 38, advanced: 45 };
// A fitness score from a recent race or hard effort, else a careful estimate for the level.
export function startingVdot({ level, recent }) {
  if (recent && recent.meters && recent.seconds) {
    const v = vdotFromRace(recent.meters, recent.seconds);
    if (Number.isFinite(v) && v > 15 && v < 85) return { vdot: Math.round(v * 10) / 10, estimated: false };
  }
  return { vdot: DEFAULT_VDOT[level], estimated: true };
}

// ---------- Weeks and feasibility ----------
const pad = (n) => String(n).padStart(2, '0');
export const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Plan weeks from the week you start through the week of the race (the race week counts).
export function weeksBetween(startedAt, raceDate, weekStartDay = 'sunday') {
  const a = startOfWeek(new Date(`${startedAt}T12:00:00`), weekStartDay);
  const b = startOfWeek(new Date(`${raceDate}T12:00:00`), weekStartDay);
  return Math.round((b - a) / (7 * 864e5)) + 1;
}
export const dateForWeeks = (startedAt, weeks, weekStartDay = 'sunday', longDay = 'sun') => {
  const a = startOfWeek(new Date(`${startedAt}T12:00:00`), weekStartDay);
  const want = longDay === 'sat' ? 6 : 0;
  const first = weekStartDay === 'monday' ? 1 : 0;
  const d = new Date(a.getTime() + ((weeks - 1) * 7 + ((want - first + 7) % 7)) * 864e5);
  d.setHours(12, 0, 0, 0);
  return isoDate(d);
};
export function feasibility({ distance, weeks, level }) {
  const spec = RACES[distance];
  const min = spec.minWeeks[level]; const good = spec.goodWeeks[level];
  if (weeks > MAX_PLAN_WEEKS) return { status: 'far', min, good, message: `That's more than ${MAX_PLAN_WEEKS} weeks away. Pick a date closer in, and keep your easy running going until then.` };
  if (weeks < min) {
    const msg = level === 'beginner' && distance !== '5k'
      ? `As a new runner, a ${spec.label} needs about ${min} weeks (a run/walk start, then a gradual build). Pick a later date, or start with a 5K.`
      : `A ${spec.label} plan for where you are now needs at least ${min} weeks. Pick a later date or a shorter race.`;
    return { status: 'short', min, good, message: msg };
  }
  if (weeks < good) return { status: 'tight', min, good, message: `That works, but it's on the short side (${good}+ weeks is more comfortable). The plan builds a little faster, so listen to your body.` };
  return { status: 'ok', min, good, message: `${weeks} weeks is a good runway.` };
}

// How realistic is the goal time? Compares the fitness the goal needs with the fitness you have and how much
// a runner can reasonably gain in the weeks available (a rule of thumb that depends on level).
const GAIN_PER_WEEK = { beginner: 0.5, novice: 0.4, intermediate: 0.25, advanced: 0.15 };
export const gainCap = (level, weeks) => Math.min(9, Math.max(0, weeks - 2) * GAIN_PER_WEEK[level]);
export function goalCheck({ distance, goalSeconds, vdot, level, weeks }) {
  const meters = RACES[distance].meters;
  const cap = gainCap(level, weeks);
  if (!goalSeconds) return { status: 'finish', predictedSeconds: predictSeconds(vdot + cap * 0.5, meters), targetVdot: vdot + cap * 0.5 };
  const goalVdot = vdotFromRace(meters, goalSeconds);
  const gain = goalVdot - vdot;
  if (gain <= 0.3) return { status: 'comfortable', goalVdot, targetVdot: Math.max(goalVdot, vdot), message: 'Your goal is within where your fitness already is, so the plan builds toward it comfortably.' };
  if (gain <= cap * 0.65) return { status: 'realistic', goalVdot, targetVdot: goalVdot, message: 'That is a realistic goal for the time you have.' };
  if (gain <= cap) return { status: 'ambitious', goalVdot, targetVdot: goalVdot, message: 'That is ambitious. It can happen with steady training and a good build. Treat it as a goal to chase, not a promise.' };
  const sug = predictSeconds(vdot + cap, meters);
  return { status: 'stretch', goalVdot, targetVdot: vdot + cap, suggestedSeconds: sug, message: `That is a big jump for ${weeks} weeks. A time near ${fmtTime(sug)} is more likely, so the plan paces you toward that.` };
}

// ---------- Plan builder ----------
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const half = (x) => Math.round(x * 2) / 2;

function volumeCurve(race, spec, level) {
  const W = race.weeks;
  const tl = spec.taper.length;
  const T = level === 'beginner' && race.distance === '5k' ? 1 : Math.min(tl, Math.max(1, Math.floor(W / 3)));
  const taper = spec.taper.slice(tl - T);
  const pre = W - T; // weeks before the taper
  const rw = level === 'beginner' ? Math.min(8, Math.max(0, pre - (race.distance === '5k' ? 0 : 2))) : 0; // run/walk weeks
  const engine = pre - rw;
  const start = level === 'beginner' ? 8 : Math.max(race.weeklyMi, level === 'novice' ? 8 : 12);
  const period = level === 'beginner' || level === 'novice' ? 3 : 4;
  const isCut = (j) => j > 0 && (j + 1) % period === 0 && j < engine - 2;
  const nonCut = []; for (let j = 0; j < engine; j += 1) if (!isCut(j)) nonCut.push(j);
  const c = nonCut.length;
  let peak = spec.peak[level];
  const reach = start * 1.1 ** Math.max(0, c - 1);
  peak = Math.max(Math.min(peak, reach), Math.min(start, spec.peak[level] * 1.25));
  const r = c > 1 ? clamp((peak / start) ** (1 / (c - 1)), 1, 1.1) : 1;
  const volumes = [];
  let lastNon = start;
  for (let j = 0; j < engine; j += 1) {
    if (isCut(j)) { volumes.push(Math.round(lastNon * 0.78 * 2) / 2); continue; }
    const k = nonCut.indexOf(j);
    lastNon = start * r ** k;
    volumes.push(Math.round(lastNon * 2) / 2);
  }
  const peakVol = volumes.length ? Math.max(...volumes) : start;
  return { W, T, taper, pre, rw, engine, volumes, peakVol, isCut, nonCut };
}

// Long runs climb toward the race's long-run ceiling across the non-cutback weeks.
function longRuns(race, spec, level, curve) {
  const cap = spec.longCap[level];
  const startLong = level === 'beginner' ? 3 : clamp(race.longestMi * 0.95, 3, cap);
  const out = [];
  const c = curve.nonCut.length;
  let last = startLong;
  for (let j = 0; j < curve.engine; j += 1) {
    if (curve.isCut(j)) { out.push(half(last * 0.75)); continue; }
    const k = curve.nonCut.indexOf(j);
    const want = c > 1 ? startLong + ((cap - startLong) * k) / (c - 1) : cap;
    last = Math.min(cap, half(Math.max(want, startLong)));
    out.push(last);
  }
  return out;
}

const RUNWALK = [
  { run: 1, walk: 1.5, n: 8 }, { run: 2, walk: 2, n: 6 }, { run: 3, walk: 2, n: 5 }, { run: 5, walk: 2, n: 4 },
  { run: 8, walk: 2, n: 3 }, { run: 10, walk: 1, n: 3 }, { run: 15, walk: 1, n: 2 }, { run: 20, walk: 0, n: 1 },
];

// Pace sets for week i (fitness rises from where you are toward the target).
function weekPaces(race, i, pre) {
  const t = pre > 1 ? clamp(i / (pre - 1), 0, 1) : 1;
  const v = race.vdot + (race.targetVdot - race.vdot) * t;
  const meters = RACES[race.distance].meters;
  const p = paces(v, meters);
  if (race.goalSeconds && i >= pre - 1) p.race = (race.goalSeconds / meters) * MI; // the last build week uses the goal pace itself
  return { vdot: v, ...p };
}

const wc = (level) => (level === 'advanced' || level === 'intermediate' ? 1.5 : 1);
const minutesAt = (miles, paceSec) => Math.round((miles * paceSec) / 60);
const U = (race) => race.units || 'mi';

// ---- Hard-day recipes. Each returns { name, miles, line, paceKey } ----
function tempoRun(race, p, level, f) {
  const lo = level === 'advanced' ? 20 : level === 'intermediate' ? 15 : 10;
  const hi = level === 'advanced' ? (race.distance === 'half' || race.distance === 'marathon' ? 45 : 35) : level === 'intermediate' ? 30 : 20;
  const mins = Math.round((lo + (hi - lo) * f) / 5) * 5;
  const w = wc(level);
  const miles = 2 * w + (mins * 60) / p.tempo;
  return { name: 'Tempo Run', miles, paceKey: 'tempo', line: `${fmtDist(w, U(race))} easy, ${mins} min at tempo pace (${paceOne(p.tempo, U(race))}, "comfortably hard"), ${fmtDist(w, U(race))} easy` };
}
function cruiseRun(race, p, level, f) {
  const reps = level === 'advanced' ? Math.round(3 + 2 * f) : Math.round(2 + 2 * f);
  const w = wc(level);
  const miles = 2 * w + reps * 1.0 + reps * 0.1;
  return { name: 'Cruise Intervals', miles, paceKey: 'tempo', line: `${fmtDist(w, U(race))} easy, ${reps} × 1 ${U(race) === 'km' ? 'km' : 'mile'} at tempo pace (${paceOne(p.tempo, U(race))}) with 1 min easy jog between, ${fmtDist(w, U(race))} easy` };
}
const LADDER_5K = [[6, 400], [5, 600], [5, 800], [4, 1000], [6, 800], [5, 1000]];
const LADDER_10K = [[5, 800], [6, 800], [5, 1000], [4, 1200], [3, 1600], [5, 1200]];
function intervalRun(race, p, level, f) {
  const lad = race.distance === '10k' || race.distance === 'half' || race.distance === 'marathon' ? LADDER_10K : LADDER_5K;
  const maxIdx = level === 'novice' ? 3 : lad.length - 1;
  const [n, m] = lad[Math.min(maxIdx, Math.round(f * (lad.length - 1)))];
  const w = wc(level);
  const hard = (n * m) / MI;
  const miles = 2 * w + hard + n * (m / MI) * 0.55;
  const rec = m <= 600 ? '60–90 sec' : m <= 1000 ? '2 min' : '2–3 min';
  return { name: 'Interval Run', miles, paceKey: 'interval', line: `${fmtDist(w, U(race))} easy, ${n} × ${m} m hard at interval pace (${paceOne(p.interval, U(race))}) with ${rec} easy jog between, ${fmtDist(w, U(race))} easy` };
}
function racePaceRun(race, p, level, f) {
  const w = wc(level);
  const label = RACES[race.distance].label;
  if (race.distance === '5k' || race.distance === '10k') {
    const reps = race.distance === '5k' ? [[4, 1000], [3, 1600], [4, 1200]][Math.min(2, Math.floor(f * 3))] : [[3, 1600], [4, 1600], [3, 2000]][Math.min(2, Math.floor(f * 3))];
    const [n, m] = reps;
    const miles = 2 * w + (n * m) / MI + n * 0.2;
    return { name: `${label} Pace Intervals`, miles, paceKey: 'race', line: `${fmtDist(w, U(race))} easy, ${n} × ${m} m at ${label} race pace (${paceOne(p.race, U(race))}) with 2 min easy jog between, ${fmtDist(w, U(race))} easy` };
  }
  const mins = race.distance === 'half' ? Math.round((20 + 15 * f) / 5) * 5 : Math.round((30 + 15 * f) / 5) * 5;
  const miles = 2 * w + (mins * 60) / p.race;
  return { name: `${label} Pace Run`, miles, paceKey: 'race', line: `${fmtDist(w, U(race))} easy, ${mins} min at ${label} race pace (${paceOne(p.race, U(race))}), ${fmtDist(w, U(race))} easy` };
}
function fartlekRun(race, p, level) {
  const n = level === 'advanced' ? 8 : 6;
  return { name: 'Fartlek Run', miles: 4 + (level === 'advanced' ? 1 : 0), paceKey: 'easy', line: `Easy running with ${n} pickups: 1 min comfortably hard (effort 7 of 10), 2 min easy between. Keep it playful, not a race.` };
}
function hillRun(race, p, level) {
  const n = level === 'advanced' ? 8 : 6;
  return { name: 'Hill Repeats', miles: 4.5, paceKey: 'easy', line: `${fmtDist(1.5, U(race))} easy, ${n} × 45 sec uphill at hard effort (strong, not a sprint), jog back down, ${fmtDist(1.5, U(race))} easy` };
}
function easyRun(race, p, miles, strides) {
  return { name: strides ? 'Easy Run + Strides' : 'Easy Run', miles, paceKey: 'easy', line: `${fmtDist(miles, U(race))} at an easy, conversational pace (${paceRange(p.easy, U(race))})${strides ? '. Finish with 6 × 20 sec strides: fast but relaxed, walk back to recover.' : '.'}` };
}
function longRun(race, p, miles, kind, f) {
  const u = U(race);
  if (kind === 'mp' && (race.distance === 'marathon' || race.distance === 'half')) {
    const label = race.distance === 'marathon' ? 'marathon' : 'half marathon';
    const seg = clamp(half(miles * (race.distance === 'marathon' ? 0.45 : 0.35)), 2, race.distance === 'marathon' ? 10 : 6);
    return { name: 'Long Run with Race Pace', miles, paceKey: 'race', line: `${fmtDist(miles, u)} total: ${fmtDist(miles - seg, u)} easy (${paceRange(p.easy, u)}), then the last ${fmtDist(seg, u)} at ${label} race pace (${paceOne(p.race, u)})` };
  }
  if (kind === 'progression') {
    const seg = clamp(half(miles * 0.25), 1, 4);
    return { name: 'Progression Long Run', miles, paceKey: 'easy', line: `${fmtDist(miles, u)} easy (${paceRange(p.easy, u)}), picking up to a steady effort for the last ${fmtDist(seg, u)}` };
  }
  return { name: 'Long Run', miles, paceKey: 'easy', line: `${fmtDist(miles, u)} at an easy, conversational pace (${paceRange(p.easy, u)}). Walk breaks are fine.` };
}

function phaseOf(i, rw, engine, pre, W) {
  if (i === W - 1) return 'Race Week';
  if (i >= pre) return 'Taper';
  if (i < rw) return 'Run/Walk';
  const j = i - rw;
  if (engine >= 6 && j < Math.round(engine * 0.25)) return 'Base';
  if (engine >= 4 && j >= engine - Math.max(2, Math.round(engine * 0.25))) return 'Peak';
  return 'Build';
}

const estMinutes = (s, p) => {
  if (s.minutes) return s.minutes;
  const sec = s.paceKey === 'tempo' ? p.tempo : s.paceKey === 'interval' ? p.interval : s.paceKey === 'race' ? p.race : (p.easy[0] + p.easy[1]) / 2;
  // Hard days include easy warm-up and cool-down, so blend toward the easy pace.
  const blend = s.paceKey === 'easy' ? sec : (sec * 0.5 + ((p.easy[0] + p.easy[1]) / 2) * 0.5);
  return Math.max(15, Math.round((s.miles * blend) / 60));
};

const memo = new Map();
export function racePlan(race) {
  const key = JSON.stringify(race);
  if (memo.has(key)) return memo.get(key);
  const spec = SPEC[race.distance];
  const level = race.level;
  const curve = volumeCurve(race, spec, level);
  const longs = longRuns(race, spec, level, curve);
  const d = clamp(race.runDays, 3, 6);
  const weeks = [];
  for (let i = 0; i < curve.W; i += 1) {
    const phase = phaseOf(i, curve.rw, curve.engine, curve.pre, curve.W);
    const p = weekPaces(race, i, curve.pre);
    const sessions = [];
    if (phase === 'Run/Walk') {
      const step = RUNWALK[Math.min(RUNWALK.length - 1, Math.round((i / Math.max(1, curve.rw - 1)) * (RUNWALK.length - 1)))];
      const body = step.run >= 20 ? 'Run 20 minutes easy and steady with no walking' : `${step.n} × (${step.run} min easy jog, ${step.walk} min walk)`;
      const minutes = 10 + (step.run + step.walk) * step.n;
      for (let k = 0; k < Math.min(d, 4); k += 1) sessions.push({ role: k === Math.min(d, 4) - 1 && d >= 4 ? 'long' : 'easy', name: 'Run/Walk', miles: 0, minutes, paceKey: 'easy', line: `5 min brisk walk, then ${body}, then 5 min easy walk. Go slow enough to hold a conversation.` });
      weeks.push({ n: i + 1, phase, volume: 0, long: 0, paces: p, sessions });
      continue;
    }
    if (phase === 'Race Week') {
      const vol = curve.peakVol * curve.taper[curve.taper.length - 1];
      sessions.push({ role: 'quality', ...tempoLite(race, p, level) });
      sessions.push({ role: 'easy', ...easyRun(race, p, clamp(half(vol * 0.22), 2, 5), true) });
      sessions.push({ role: 'shakeout', ...easyRun(race, p, clamp(half(vol * 0.12), 1.5, 3), true), name: 'Shakeout Run' });
      weeks.push({ n: i + 1, phase, volume: Math.round(vol), long: 0, paces: p, sessions });
      continue;
    }
    let vol; let long; let f;
    if (phase === 'Taper') {
      const ti = i - curve.pre;
      vol = curve.peakVol * curve.taper[ti];
      const capLong = longs.length ? Math.max(...longs) : spec.longCap[level];
      long = half(capLong * (curve.taper.length === 3 ? [0.7, 0.5][ti] || 0.5 : 0.5));
      f = 1;
    } else {
      const j = i - curve.rw;
      vol = curve.volumes[j];
      long = longs[j];
      f = curve.engine > 1 ? j / (curve.engine - 1) : 1;
      // The long run should not be more than its share of the week; lift the week a little if it is.
      vol = Math.max(vol, long / spec.longShare);
    }
    const cut = phase !== 'Taper' && curve.isCut(i - curve.rw);
    const quality = phase === 'Base' ? baseQuality(race, p, level, i) : phase === 'Taper' ? [taperQuality(race, p, level)] : buildQuality(race, p, level, f, i, phase, d, cut);
    const longKind = phase === 'Taper' ? 'easy' : cut ? 'easy' : longVariant(race, level, phase, i);
    const sLong = { role: 'long', ...longRun(race, p, long, longKind, f) };
    const easyCount = Math.max(1, d - 1 - quality.length);
    const qMiles = quality.reduce((a, q) => a + q.miles, 0);
    const easyEach = clamp(half((vol - long - qMiles) / easyCount), level === 'beginner' ? 1.5 : 2, 9);
    const list = [];
    quality.forEach((q) => list.push({ role: 'quality', ...q }));
    for (let k = 0; k < easyCount; k += 1) list.push({ role: 'easy', ...easyRun(race, p, easyEach, k === 0 && phase !== 'Taper' ? false : k === easyCount - 1 && phase !== 'Taper') });
    list.push(sLong);
    list.forEach((s) => sessions.push(s));
    weeks.push({ n: i + 1, phase, volume: Math.round(sessions.reduce((a, s) => a + s.miles, 0)), long, paces: p, sessions, cutback: cut });
  }
  weeks.forEach((w) => w.sessions.forEach((s) => { s.minutes = estMinutes(s, w.paces); }));
  const plan = { weeks, curve, spec };
  memo.set(key, plan);
  if (memo.size > 40) memo.delete(memo.keys().next().value);
  return plan;
}

function tempoLite(race, p, level) {
  return { name: 'Sharpener', miles: 3.5, paceKey: 'race', line: `${fmtDist(1, U(race))} easy, 3 × 2 min at ${RACES[race.distance].label} race pace (${paceOne(p.race, U(race))}) with 2 min easy between, ${fmtDist(1, U(race))} easy. Short and snappy, you should finish feeling fresh.` };
}
function taperQuality(race, p, level) {
  if (race.distance === 'marathon' || race.distance === 'half') {
    const t = tempoRun(race, p, level, 0.3); return { ...t, name: 'Short Tempo (Taper)', miles: Math.max(4, t.miles * 0.75) };
  }
  const t = intervalRun(race, p, level, 0.3); return { ...t, name: 'Short Intervals (Taper)', miles: Math.max(4, t.miles * 0.7) };
}
function baseQuality(race, p, level, i) {
  if (level === 'beginner' || level === 'novice') return [easyRun(race, p, 3.5, true)];
  return [i % 2 === 0 ? fartlekRun(race, p, level) : hillRun(race, p, level)];
}
function buildQuality(race, p, level, f, i, phase, d, cut) {
  const longDist = race.distance === 'half' || race.distance === 'marathon';
  const out = [];
  const flip = i % 2 === 0;
  if (level === 'beginner') return [easyRun(race, p, 3.5, true)];
  if (cut) return [tempoRun(race, p, level, Math.max(0, f - 0.3))];
  if (phase === 'Peak') out.push(racePaceRun(race, p, level, f));
  else out.push(flip ? tempoRun(race, p, level, f) : (longDist ? cruiseRun(race, p, level, f) : intervalRun(race, p, level, f)));
  const two = (level === 'intermediate' && d >= 5) || (level === 'advanced' && d >= 4);
  if (two) {
    if (phase === 'Peak') out.push(longDist ? tempoRun(race, p, level, f) : intervalRun(race, p, level, f));
    else out.push(longDist ? { ...easyRun(race, p, 6, false), name: 'Steady Aerobic Run', line: `${fmtDist(6, U(race))} steady, a touch faster than easy (${paceOne((p.easy[0] + p.tempo) / 2 + 20, U(race))}), still able to talk` } : (flip ? intervalRun(race, p, level, f) : hillRun(race, p, level)));
  }
  return out;
}
function longVariant(race, level, phase, i) {
  if (level === 'beginner') return 'easy';
  if (race.distance === 'marathon') return phase === 'Peak' && i % 2 === 0 ? 'mp' : phase === 'Build' && i % 3 === 0 ? 'progression' : 'easy';
  if (race.distance === 'half') return phase === 'Peak' && i % 2 === 0 ? 'mp' : 'easy';
  return phase === 'Peak' ? 'progression' : 'easy';
}

// ---------- Placing sessions on days ----------
const circ = (a, b) => Math.min((a - b + 7) % 7, (b - a + 7) % 7);
function assignDays(sessions, days, longDay) {
  // `days` are weekday numbers (0=Sun) in week order. Returns sessions with `day`.
  const free = [...days];
  const out = [];
  const take = (pick) => { const idx = free.indexOf(pick); free.splice(idx, 1); return pick; };
  const long = sessions.find((s) => s.role === 'long');
  let longD = null;
  if (long) {
    const want = longDay === 'sat' ? 6 : 0;
    longD = free.includes(want) ? want : free.includes(longDay === 'sat' ? 0 : 6) ? (longDay === 'sat' ? 0 : 6) : free[free.length - 1];
    out.push({ ...long, day: take(longD) });
  }
  const placed = longD != null ? [longD] : [];
  const far = (c) => Math.min(...placed.map((x) => circ(x, c)), 7);
  sessions.filter((s) => s.role === 'quality').forEach((s) => {
    const pick = [...free].sort((a, b) => far(b) - far(a))[0];
    out.push({ ...s, day: take(pick) }); placed.push(pick);
  });
  sessions.filter((s) => s.role === 'strength').forEach((s) => {
    const pick = [...free].filter((c) => longD == null || (longD - c + 7) % 7 !== 1).sort((a, b) => far(b) - far(a))[0] ?? free[0];
    out.push({ ...s, day: take(pick) });
  });
  sessions.filter((s) => s.role === 'easy' || s.role === 'shakeout').forEach((s) => {
    const pick = free[0];
    if (pick == null) return;
    out.push({ ...s, day: take(pick) });
  });
  return out;
}

const STRENGTH = [
  { name: 'Runner Strength A', groups: ['Legs', 'Glutes', 'Core'] },
  { name: 'Runner Strength B', groups: ['Hamstrings', 'Glutes', 'Core', 'Back'] },
];

// The program's sessions for one week (the same shape programs.js uses, so Move, Birdseye and the calendar just work).
export function raceSessionsForWeek(program, week) {
  const race = program.race;
  const W = race.weeks;
  if (week < 1 || week > W) return [];
  const plan = racePlan(race);
  const wk = plan.weeks[week - 1];
  const ordered = [...(program.weekdays || [])];
  const first = race.weekStart === 'monday' ? 1 : 0;
  const idx = (dnum) => (dnum - first + 7) % 7;
  const days = ordered.sort((a, b) => idx(a) - idx(b));
  const strengthN = race.strength || 0;
  const u = U(race);
  const raceDay = new Date(`${race.date}T12:00:00`).getDay();
  const isRaceWeek = week === W;
  let runDays = days.length - strengthN;
  let usable = days;
  if (isRaceWeek) {
    usable = days.filter((x) => idx(x) < idx(raceDay));
    runDays = usable.length;
  }
  // Which of the picked days are for runs vs strength: strength days go to the days nearest an easy day, never the race week.
  let sessions = wk.sessions;
  if (!isRaceWeek) {
    const want = Math.min(wk.phase === 'Run/Walk' ? 4 : race.runDays, days.length);
    sessions = sessions.slice(0, want);
    const allowedStrength = wk.phase === 'Taper' ? Math.min(strengthN, 1) : strengthN;
    for (let k = 0; k < allowedStrength; k += 1) {
      const t = STRENGTH[k % 2];
      sessions = [...sessions, { role: 'strength', strength: true, ...t }];
    }
  } else {
    sessions = sessions.filter((s) => s.role !== 'shakeout' || usable.some((x) => idx(x) === idx(raceDay) - 1));
    sessions = sessions.slice(0, Math.max(0, runDays));
  }
  const used = isRaceWeek ? usable : days;
  const placed = assignDays(sessions, used, race.longDay);
  const out = [];
  let ai = 0; let ri = 0;
  placed.forEach((s) => {
    if (s.strength) {
      out.push({
        id: `w${week}-r${ri}`, kind: 'resistance', name: s.name, shortName: s.name, groups: s.groups, style: 'Hypertrophy', day: s.day, label: '',
        presc: { sets: 2, reps: '10-12', rpe: '6-7', rest: '60 sec' }, sec: null, acc: null, leads: null, exercises: 5, mainCount: 0,
        phase: wk.phase, goal: 'race',
      });
      ri += 1;
      return;
    }
    const paceText = s.paceKey === 'easy' ? paceRange(wk.paces.easy, u) : paceOne(wk.paces[s.paceKey] || wk.paces.tempo, u);
    out.push({
      id: `w${week}-a${ai}`, kind: 'aerobic', run: true, name: s.name, shortName: s.name, day: s.day, minutes: s.minutes,
      miles: s.miles, runLine: s.line, paceLabel: paceLabelFor(s), paceText, zone: null, rpe: null,
      phase: wk.phase, variant: s.role, note: s.line,
    });
    ai += 1;
  });
  if (isRaceWeek) {
    const label = RACES[race.distance].label;
    const goal = race.goalSeconds || predictSeconds(race.targetVdot, RACES[race.distance].meters);
    const paceSec = (goal / RACES[race.distance].meters) * MI;
    out.push({
      id: `w${W}-a${ai}`, kind: 'aerobic', run: true, race: true, name: `Race Day: ${label}`, shortName: `Race Day`, day: raceDay,
      minutes: Math.round(goal / 60), miles: RACES[race.distance].meters / MI,
      runLine: `${label}${race.goalSeconds ? `, goal ${fmtTime(race.goalSeconds)}` : `, finish strong (about ${fmtTime(goal)} at your fitness)`}. Start a touch slower than goal pace (${paceOne(paceSec, u)}), settle in, and run the second half a little faster. Warm up lightly, eat what you practiced, and enjoy it.`,
      paceLabel: 'Race', paceText: paceOne(paceSec, u), zone: null, rpe: null, phase: 'Race Week', variant: 'race', note: 'Race day',
    });
  }
  return out.sort((x, y) => idx(x.day) - idx(y.day));
}
function paceLabelFor(s) {
  return s.paceKey === 'tempo' ? 'Tempo' : s.paceKey === 'interval' ? 'Interval' : s.paceKey === 'race' ? 'Race Pace' : 'Easy';
}

export function racePhaseLabel(program, week) {
  const W = program.race.weeks;
  const wk = racePlan(program.race).weeks[Math.min(W, Math.max(1, week)) - 1];
  return `${wk.phase}${wk.cutback ? ' (lighter week)' : ''} · week ${Math.min(week, W)} of ${W}`;
}
export const raceTitle = (program) => `${RACES[program.race.distance].label} Plan`;

// What the plan will look like, for the review screen.
export function raceSummary(race) {
  const plan = racePlan(race);
  const vols = plan.weeks.map((w) => w.volume).filter((v) => v > 0);
  const longs = plan.weeks.map((w) => w.long).filter((v) => v > 0);
  return {
    weeks: race.weeks,
    peakMiles: vols.length ? Math.max(...vols) : 0,
    longestRun: longs.length ? Math.max(...longs) : 0,
    startsRunWalk: plan.weeks[0].phase === 'Run/Walk',
    phases: plan.weeks.reduce((acc, w) => { acc[w.phase] = (acc[w.phase] || 0) + 1; return acc; }, {}),
  };
}
export const daysToRace = (race, from = new Date()) => {
  const a = new Date(`${race.date}T12:00:00`); const b = new Date(from); b.setHours(12, 0, 0, 0);
  return Math.round((a - b) / 864e5);
};
export const LEVELS_LIST = LEVELS;
