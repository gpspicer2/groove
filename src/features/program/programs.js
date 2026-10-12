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
    weeks: [
      { phase: 'Build', main: rx(3, '12-15', '7', '60-90 sec') },
      { phase: 'Build', main: rx(3, '12-15', '8', '60-90 sec') },
      { phase: 'Build', main: rx(4, '10-12', '8', '90 sec') },
      { phase: 'Build', main: rx(4, '10-12', '8-9', '90 sec') },
      { phase: 'Build', main: rx(4, '8-10', '8-9', '90 sec-2 min') },
      { phase: 'Build', main: rx(4, '8-10', '9', '2 min') },
      { phase: 'Deload', main: rx(3, '10', '6', '60-90 sec') },
    ],
  },
  undulating: {
    len: 4, exercises: 6, mainCount: 0,
    days: [
      { label: 'Heavy', main: rx(4, '5-8', '8-9', '2-3 min') },
      { label: 'Moderate', main: rx(3, '8-12', '8', '90 sec') },
      { label: 'Light', main: rx(3, '12-20', '7-8', '60 sec') },
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

// The sessions for one week, with the prescription for that week.
export function sessionsForWeek(program, week) {
  const key = cycleKey(program);
  const cyc = CYCLES[key];
  const pos = cyclePosition(program, week);
  const deload = pos === cyc.len && (key !== 'undulating' ? cyc.weeks[pos - 1].phase === 'Deload' : true);
  const out = [];

  const lifts = program.goal === 'fat_loss' ? FAT_LOSS[program.days].lifts : SPLITS[program.days];
  const seq = program.goal === 'fat_loss' ? FAT_LOSS[program.days].seq : 'R'.repeat(program.days);
  const days = program.goal === 'fat_loss' ? FAT_LOSS[program.days].days : DAYS[program.days];
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
    let presc; let label = '';
    if (key === 'undulating') {
      const d = deload ? cyc.deload : cyc.days[(li + week - 1) % 3];
      presc = { main: d.main, acc: null };
      label = d.label;
    } else {
      const w = cyc.weeks[pos - 1];
      presc = { main: w.main, acc: w.acc || null };
      label = w.phase === 'Deload' ? 'Deload' : '';
    }
    const style = presc.main.reps && Number(String(presc.main.reps).split('-')[0]) <= 6 ? 'Strength' : 'Hypertrophy';
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
