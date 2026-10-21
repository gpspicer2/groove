import { startOfWeek } from '../../lib/week.js';

// Self-guided training programs: pick a goal (and for hypertrophy a method),
// say how many days a week you can train, and the week is laid out for you.
// Everything here is plain data and math, so Move and Birdseye share it.

export const GOALS = [
  { id: 'strength', label: 'Strength', emoji: '💥', blurb: 'Heavier lifts, fewer reps, longer rests.' },
  { id: 'hypertrophy', label: 'Hypertrophy', emoji: '📈', blurb: 'Build muscle size with moderate reps.' },
  { id: 'fat_loss', label: 'Fat Loss', emoji: '🔥', blurb: 'Keep your muscle, add cardio, burn more.' },
];

export const MODELS = [
  { id: 'undulating', label: 'Undulating', blurb: 'Heavy, moderate and light days mixed through every week.' },
  { id: 'linear', label: 'Linear', blurb: 'A steady build over weeks: lighter and higher reps first, then heavier.' },
];

export const GOAL_INFO = {
  strength: 'Strength work uses heavier loads for fewer reps with long rests. Each week the main lifts get a little harder, and every 4th week is a lighter deload so you recover and come back stronger.',
  hypertrophy: 'Hypertrophy is muscle growth. Moderate loads, 8-15 reps, hard sets close to failure, and enough weekly volume per muscle. Pick how the weeks progress below.',
  fat_loss: 'Fat loss comes from a modest calorie deficit over time. Lifting keeps your muscle while you lose fat, and cardio adds to the energy you burn. Strength sessions here use shorter rests and a little higher reps.',
};
export const MODEL_INFO = {
  undulating: 'Daily undulating periodization (DUP) changes the rep range from workout to workout. Heavy days build strength, moderate days build size, light days add volume with less strain. Each muscle gets all three through the week, and the pattern shifts every week.',
  linear: 'Linear periodization changes the target in one direction over several weeks. You start with lighter loads and higher reps, then move toward heavier loads and fewer reps, finish with a deload, and repeat.',
};

const UPPER = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'];
const LOWER = ['Legs', 'Quadriceps', 'Hamstrings', 'Glutes', 'Core'];
const FULL = {
  A: ['Legs', 'Chest', 'Back', 'Core'],
  B: ['Hamstrings', 'Glutes', 'Shoulders', 'Back', 'Triceps'],
  C: ['Quadriceps', 'Chest', 'Back', 'Biceps', 'Core'],
};
const T = {
  fullA: { name: 'Full Body A', groups: FULL.A },
  fullB: { name: 'Full Body B', groups: FULL.B },
  fullC: { name: 'Full Body C', groups: FULL.C },
  upperA: { name: 'Upper A', groups: UPPER },
  lowerA: { name: 'Lower A', groups: LOWER },
  upperB: { name: 'Upper B', groups: UPPER },
  lowerB: { name: 'Lower B', groups: LOWER },
  push: { name: 'Push', groups: ['Chest', 'Shoulders', 'Triceps'] },
  pull: { name: 'Pull', groups: ['Back', 'Biceps', 'Core'] },
  legs: { name: 'Legs', groups: ['Legs', 'Hamstrings', 'Glutes'] },
  upperC: { name: 'Upper C', groups: UPPER },
  lowerC: { name: 'Lower C', groups: LOWER },
  fullMix: { name: 'Full Body', groups: FULL.A },
  chestTri: { name: 'Chest & Triceps', groups: ['Chest', 'Triceps'] },
  backBi: { name: 'Back & Biceps', groups: ['Back', 'Biceps'] },
  legsOnly: { name: 'Legs', groups: ['Legs', 'Quadriceps', 'Hamstrings', 'Glutes'] },
  shouldersCore: { name: 'Shoulders & Core', groups: ['Shoulders', 'Core'] },
  chest: { name: 'Chest', groups: ['Chest'] },
  back: { name: 'Back', groups: ['Back'] },
  shoulders: { name: 'Shoulders', groups: ['Shoulders', 'Core'] },
  arms: { name: 'Arms', groups: ['Biceps', 'Triceps'] },
  pushB: { name: 'Push B', groups: ['Chest', 'Shoulders', 'Triceps'] },
  pullB: { name: 'Pull B', groups: ['Back', 'Biceps', 'Core'] },
  legsB: { name: 'Legs B', groups: ['Legs', 'Hamstrings', 'Glutes'] },
};

const SPLITS = {
  2: [T.fullA, T.fullB],
  3: [T.fullA, T.fullB, T.fullC],
  4: [T.upperA, T.lowerA, T.upperB, T.lowerB],
  5: [T.upperA, T.lowerA, T.push, T.pull, T.legs],
  6: [T.push, T.pull, T.legs, T.pushB, T.pullB, T.legsB],
};

// Splits to choose from for each number of days, best-supported first. Meta-analyses
// (Schoenfeld et al., 2016 and 2019) find that training a muscle about twice a week
// beats once a week, and that once weekly volume is matched, the exact split matters
// much less than total hard sets, effort and sticking with it.
export const SPLIT_OPTIONS = {
  2: [
    { id: 'full2', label: 'Full Body ×2', freq: 'Each muscle 2× a week', tag: 'Best supported', sessions: [T.fullA, T.fullB], info: 'Two full-body days hit every muscle twice a week, the frequency with the most support, in a schedule that is easy to keep.' },
    { id: 'ul2', label: 'Upper / Lower', freq: 'Each muscle 1× a week', tag: 'Less efficient', sessions: [T.upperA, T.lowerA], info: 'Each half of the body is trained once a week. It works, but a muscle only gets one hit, so it usually needs more sets per session to match the progress of twice-weekly training.' },
  ],
  3: [
    { id: 'full3', label: 'Full Body ×3', freq: 'Each muscle 3× a week', tag: 'Best supported', sessions: [T.fullA, T.fullB, T.fullC], info: 'Every muscle is trained three times a week with fewer sets per day. Great for beginners and for fitting training around a busy life.' },
    { id: 'ulf', label: 'Upper / Lower / Full', freq: 'Each muscle 1.5–2× a week', tag: 'Good', sessions: [T.upperA, T.lowerA, T.fullMix], info: 'An upper day, a lower day and a full-body day. Most muscles get close to two hits a week.' },
    { id: 'ppl3', label: 'Push / Pull / Legs', freq: 'Each muscle 1× a week', tag: 'Less efficient', sessions: [T.push, T.pull, T.legs], info: 'Each muscle group is trained once a week. Fine for variety, but a single weekly hit is usually the least efficient way to use three training days.' },
  ],
  4: [
    { id: 'ul4', label: 'Upper / Lower ×2', freq: 'Each muscle 2× a week', tag: 'Best supported', sessions: [T.upperA, T.lowerA, T.upperB, T.lowerB], info: 'The best default for most lifters: every muscle twice a week, balanced, and easy to recover from.' },
    { id: 'bro4', label: 'Body-part Split', freq: 'Each muscle 1× a week', tag: 'Less efficient', sessions: [T.chestTri, T.backBi, T.legsOnly, T.shouldersCore], info: 'The classic bodybuilding split: chest and triceps, back and biceps, legs, shoulders and core. Each muscle is hit hard once a week. It can work for advanced lifters but is usually less efficient.' },
  ],
  5: [
    { id: 'ulppl', label: 'Upper / Lower / Push / Pull / Legs', freq: 'Each muscle about 2× a week', tag: 'Best supported', sessions: [T.upperA, T.lowerA, T.push, T.pull, T.legs], info: 'Chest, back, shoulders and legs get about two hits a week, arms a little more. A popular hybrid that adds volume without getting repetitive.' },
    { id: 'bro5', label: 'Body-part Split', freq: 'Each muscle 1× a week', tag: 'Less efficient', sessions: [T.chest, T.back, T.legsOnly, T.shoulders, T.arms], info: 'One muscle group a day: chest, back, legs, shoulders, arms. Lots of volume per muscle in one session, but only one hit a week.' },
  ],
  6: [
    { id: 'ppl6', label: 'Push / Pull / Legs ×2', freq: 'Each muscle 2× a week', tag: 'Best supported', sessions: [T.push, T.pull, T.legs, T.pushB, T.pullB, T.legsB], info: 'Each muscle twice a week with room for plenty of volume. The most bodybuilder-style plan, but it needs good recovery and time.' },
    { id: 'ul6', label: 'Upper / Lower ×3', freq: 'Each muscle 3× a week', tag: 'Good', sessions: [T.upperA, T.lowerA, T.upperB, T.lowerB, T.upperC, T.lowerC], info: 'Every muscle three times a week with fewer sets per day. A high frequency approach that works well if recovery is good.' },
  ],
};
export function splitOptions(program) {
  return program.goal === 'fat_loss' ? [] : SPLIT_OPTIONS[program.days] || [];
}
export function chosenSplit(program) {
  const opts = splitOptions(program);
  return opts.find((o) => o.id === program.split) || opts[0] || null;
}

// Fat loss: fewer lifting days, the rest are cardio days.
const FAT_LOSS = {
  2: { seq: 'RR', days: [1, 4], lifts: [T.fullA, T.fullB] },
  3: { seq: 'RAR', days: [1, 3, 5], lifts: [T.fullA, T.fullB] },
  4: { seq: 'RARR', days: [1, 2, 4, 6], lifts: [T.fullA, T.fullB, T.fullC] },
  5: { seq: 'RARAR', days: [1, 2, 3, 5, 6], lifts: [T.fullA, T.fullB, T.fullC] },
  6: { seq: 'RARRAR', days: [1, 2, 3, 4, 5, 6], lifts: [T.upperA, T.lowerA, T.upperB, T.lowerB] },
};
const DAYS = { 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 4, 5, 6], 6: [1, 2, 3, 4, 5, 6] };
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Weekdays (0 = Sunday) in Monday-first order, so sessions run in calendar order.
export const orderedWeekdays = (list) => [...list].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
// True once the member has picked exactly as many training days as the program needs.
export const hasChosenDays = (program) => Array.isArray(program?.weekdays) && program.weekdays.length === program.days;


const rx = (sets, reps, rpe, rest) => ({ sets, reps, rpe, rest });

// Weeks repeat in a wave; the last week of each wave is a lighter deload.
const CYCLES = {
  strength: {
    len: 4, exercises: 5, mainCount: 2,
    weeks: [
      { phase: 'Build', main: rx(4, '5', '7', '3 min'), acc: rx(3, '8-10', '8', '90 sec') },
      { phase: 'Build', main: rx(4, '5', '8', '3 min'), acc: rx(3, '8-10', '8', '90 sec') },
      { phase: 'Build', main: rx(5, '3-5', '8-9', '3-4 min'), acc: rx(3, '8-10', '8', '90 sec') },
      { phase: 'Deload', main: rx(3, '5', '6', '2-3 min'), acc: rx(2, '8-10', '6', '60 sec') },
    ],
  },
  linear: {
    len: 7, exercises: 6, mainCount: 0,
    // NSCA hypertrophy range: 6-12 reps at roughly 67-85% of max, rest 30-90 sec (a little longer on the heaviest weeks).
    weeks: [
      { phase: 'Build', main: rx(3, '9-11', '7', '60-90 sec') },
      { phase: 'Build', main: rx(3, '9-11', '8', '60-90 sec') },
      { phase: 'Build', main: rx(4, '8-10', '8', '90 sec') },
      { phase: 'Build', main: rx(4, '8-10', '8-9', '90 sec') },
      { phase: 'Build', main: rx(4, '7-9', '8-9', '90 sec') },
      { phase: 'Build', main: rx(4, '7-9', '9', '90 sec-2 min') },
      { phase: 'Deload', main: rx(3, '10', '6', '60-90 sec') },
    ],
  },
  undulating: {
    len: 4, exercises: 6, mainCount: 0,
    days: [
      { label: 'Heavy', main: rx(4, '6-8', '8-9', '2 min') },
      { label: 'Moderate', main: rx(3, '8-12', '8', '90 sec') },
      { label: 'Light', main: rx(3, '12-15', '7-8', '60 sec') },
    ],
    deload: { label: 'Deload', main: rx(3, '10', '6', '60-90 sec') },
  },
  fat_loss: {
    len: 4, exercises: 6, mainCount: 0, minutes: [30, 35, 40, 30],
    weeks: [
      { phase: 'Build', main: rx(3, '12-15', '7', '45-60 sec') },
      { phase: 'Build', main: rx(3, '12-15', '8', '45-60 sec') },
      { phase: 'Build', main: rx(4, '10-15', '8', '45-60 sec') },
      { phase: 'Deload', main: rx(2, '12', '6', '45-60 sec') },
    ],
  },
};

export function cycleKey(program) {
  if (program.goal === 'hypertrophy') return program.model === 'linear' ? 'linear' : 'undulating';
  return program.goal;
}
export function cycleLength(program) { return CYCLES[cycleKey(program)].len; }

export function programTitle(program) {
  const g = GOALS.find((x) => x.id === program.goal);
  if (program.goal === 'hypertrophy') return `${g.label} · ${program.model === 'linear' ? 'Linear' : 'Undulating'}`;
  return g.label;
}

export function resistanceDays(program) {
  return program.goal === 'fat_loss' ? FAT_LOSS[program.days].seq.split('R').length - 1 : program.days;
}

// 1-based week number since the program started (weeks follow the member's week start).
export function weekNumber(program, today = new Date(), weekStartDay = 'sunday') {
  const start = startOfWeek(new Date(`${program.startedAt}T12:00:00`), weekStartDay);
  const now = startOfWeek(today, weekStartDay);
  return Math.max(1, Math.round((now - start) / (7 * 864e5)) + 1);
}
export function cyclePosition(program, week) {
  return ((week - 1) % cycleLength(program)) + 1;
}

// Moves a rep target up or down by `d`, keeping its width and keeping it inside the range NSCA gives for that goal
// (strength 2-6, hypertrophy 6-12, fat loss circuits 8-20). E.g. 9-11 by -2 is 7-9; 5 by -2 is 3.
function shiftReps(reps, d, min, max) {
  const m = String(reps).match(/^(\d+)(?:-(\d+))?$/);
  if (!m) return reps;
  const width = m[2] ? Number(m[2]) - Number(m[1]) : 0;
  let lo = Number(m[1]) + d;
  if (lo < min) lo = min;
  if (lo + width > max) lo = Math.max(min, max - width);
  const hi = Math.min(max, lo + width);
  return hi > lo ? `${lo}-${hi}` : String(lo);
}
// Each week's prescription is the "Moderate" day. Within the week the sessions rotate Heavy / Moderate / Light
// (like the undulating program does), so no two lifting days in a row look the same. Strength stays at 6 reps or
// fewer every day (NSCA: heavy loads, 85%+ of max); hypertrophy stays within 6-12.
const DAY_SHIFT = {
  strength: { min: 2, max: 6, Heavy: -2, Light: 1 },
  hypertrophy: { min: 6, max: 12, Heavy: -2, Light: 2 },
  fat_loss: { min: 8, max: 20, Heavy: -3, Light: 3 },
};
function flavored(main, label, goal) {
  const c = DAY_SHIFT[goal];
  const d = c?.[label];
  return d ? { ...main, reps: shiftReps(main.reps, d, c.min, c.max) } : main;
}

// The sessions for one week, with the prescription for that week.
export function sessionsForWeek(program, week) {
  const key = cycleKey(program);
  const cyc = CYCLES[key];
  const pos = cyclePosition(program, week);
  const deload = pos === cyc.len && (key !== 'undulating' ? cyc.weeks[pos - 1].phase === 'Deload' : true);
  const out = [];

  const lifts = program.goal === 'fat_loss' ? FAT_LOSS[program.days].lifts : chosenSplit(program).sessions;
  const seq = program.goal === 'fat_loss' ? FAT_LOSS[program.days].seq : 'R'.repeat(program.days);
  const defaultDays = program.goal === 'fat_loss' ? FAT_LOSS[program.days].days : DAYS[program.days];
  // The days the member picked (Mon-first order), else a sensible default spread.
  const days = hasChosenDays(program) ? orderedWeekdays(program.weekdays) : defaultDays;
  let li = 0; let ai = 0;
  seq.split('').forEach((c, i) => {
    const day = days[i];
    if (c === 'A') {
      const minutes = cyc.minutes ? cyc.minutes[pos - 1] + (ai % 2) * 5 : 30;
      out.push({ id: `w${week}-a${ai}`, kind: 'aerobic', name: 'Cardio', day, minutes, rpe: '5-6', phase: deload ? 'Deload' : 'Build', note: 'Steady, conversational pace. Walking, cycling, rowing, whatever you enjoy.' });
      ai += 1;
      return;
    }
    const t = lifts[li % lifts.length];
    // Push / Pull / Legs x2: the second push day (and pull, legs) takes a different flavor than the first.
    const flavorSkew = chosenSplit(program)?.id === 'ppl6' && li >= 3 ? 1 : 0;
    let presc; let label = '';
    if (key === 'undulating') {
      const d = deload ? cyc.deload : cyc.days[(li + flavorSkew + week - 1) % 3];
      presc = { main: d.main, acc: null };
      label = d.label;
    } else {
      const w = cyc.weeks[pos - 1];
      label = w.phase === 'Deload' ? 'Deload' : ['Heavy', 'Moderate', 'Light'][(li + flavorSkew + week - 1) % 3];
      presc = { main: flavored(w.main, label, program.goal), acc: w.acc || null };
    }
    const style = program.goal === 'strength' ? 'Strength' : 'Hypertrophy';
    out.push({
      id: `w${week}-r${li}`, kind: 'resistance', name: t.name + (label && key === 'undulating' ? ` · ${label}` : ''),
      shortName: t.name, groups: t.groups, style, day, label,
      presc: presc.main, acc: presc.acc, exercises: cyc.exercises, mainCount: cyc.mainCount,
      phase: deload ? 'Deload' : 'Build',
    });
    li += 1;
  });
  return out;
}

export function phaseLabel(program, week) {
  const key = cycleKey(program);
  const cyc = CYCLES[key];
  const pos = cyclePosition(program, week);
  const deload = key === 'undulating' ? pos === cyc.len : cyc.weeks[pos - 1].phase === 'Deload';
  return `${deload ? 'Deload' : 'Build'} · week ${pos} of ${cyc.len}`;
}

const dash = (s) => String(s).replace('-', '–');
export function prescriptionLine(s) {
  if (s.kind === 'aerobic') return `${s.minutes} min · RPE ${dash(s.rpe)}`;
  const p = s.presc;
  const main = `${p.sets} × ${dash(p.reps)} · RPE ${dash(p.rpe)} · rest ${dash(p.rest)}`;
  return main;
}
export function accessoryLine(s) {
  if (!s.acc) return null;
  return `Accessories ${s.acc.sets} × ${dash(s.acc.reps)} · RPE ${dash(s.acc.rpe)}`;
}

// The program's sessions laid onto real calendar dates (today onward), for the Birdseye
// calendar. Sessions already done this week are left off. Needs the member's chosen days.
// Where a session naturally falls (YYYY-MM-DD) before any moves.
function naturalDate(program, week, day, weekStartDay) {
  const start = startOfWeek(new Date(`${program.startedAt}T12:00:00`), weekStartDay);
  const first = weekStartDay === 'monday' ? 1 : 0;
  const d = new Date(start.getTime() + ((week - 1) * 7 + ((day - first + 7) % 7)) * 864e5);
  d.setHours(12, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// The program's moved sessions, tidied so the sessions of one kind always run in
// order: whichever lifting day comes first in a week is the first workout (A, then B,
// then C), so moving B past C just makes the old C day the new B. `change` is an
// optional { id, date } for a move being made now. Returns { sessionId: 'YYYY-MM-DD' }.
export function normalizeMoves(program, weekStartDay = 'sunday', change = null) {
  const moves = { ...(program.moves || {}) };
  if (change) moves[change.id] = change.date;
  const weeks = new Set(Object.keys(moves).map((id) => Number((id.match(/^w(\d+)-/) || [])[1])).filter(Boolean));
  weeks.forEach((week) => {
    const sessions = sessionsForWeek(program, week);
    ['resistance', 'aerobic'].forEach((kind) => {
      const same = sessions.filter((x) => x.kind === kind);
      const dates = same.map((x) => moves[x.id] || naturalDate(program, week, x.day, weekStartDay)).sort();
      same.forEach((x, i) => {
        if (dates[i] === naturalDate(program, week, x.day, weekStartDay)) delete moves[x.id];
        else moves[x.id] = dates[i];
      });
    });
  });
  return moves;
}

export function programPlans(program, weekStartDay = 'sunday', doneIds = new Set(), horizonDays = 84) {
  if (!hasChosenDays(program)) return [];
  const out = [];
  const placed = new Set();
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayStr = iso(today);
  const moves = normalizeMoves(program, weekStartDay); // a session moved to another day: { sessionId: 'YYYY-MM-DD' }
  const plan = (sess, dateStr) => ({
    id: `program-${sess.id}`,
    planned_for: dateStr,
    title: sess.name,
    notes: null,
    details: sess.kind === 'aerobic' ? { kind: 'aerobic', minutes: sess.minutes } : { kind: 'resistance' },
    programSession: sess,
  });
  for (let i = 0; i < horizonDays; i += 1) {
    const d = new Date(today.getTime() + i * 864e5);
    if (d < new Date(`${program.startedAt}T00:00:00`)) continue;
    const week = weekNumber(program, d, weekStartDay);
    const sess = sessionsForWeek(program, week).find((x) => x.day === d.getDay());
    if (!sess || doneIds.has(sess.id) || placed.has(sess.id)) continue;
    const moved = moves[sess.id];
    if (moved && moved >= todayStr) continue; // shown on its new day below
    placed.add(sess.id);
    out.push(plan(sess, iso(d)));
  }
  // Moved sessions land on the day they were moved to (even if their old day has passed).
  Object.entries(moves).forEach(([id, dateStr]) => {
    if (dateStr < todayStr || doneIds.has(id)) return;
    const week = Number((id.match(/^w(\d+)-/) || [])[1]);
    const sess = week ? sessionsForWeek(program, week).find((x) => x.id === id) : null;
    if (sess) out.push(plan(sess, dateStr));
  });
  return out.sort((x, y) => (x.planned_for < y.planned_for ? -1 : 1));
}
