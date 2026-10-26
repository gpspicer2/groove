import { startOfWeek } from '../../lib/week.js';
import { karvonenBpm } from '../../lib/heartRate.js';
import { raceSessionsForWeek, racePhaseLabel, raceTitle, daysToRace } from './race.js';

// Self-guided training programs: pick a goal (and for hypertrophy a method),
// say how many days a week you can train, and the week is laid out for you.
// Everything here is plain data and math, so Move and Birdseye share it.

export const GOALS = [
  { id: 'strength', label: 'Strength', emoji: '🏋️', blurb: 'Powerlifting-style: squat, bench and deadlift.' },
  { id: 'hypertrophy', label: 'Hypertrophy', emoji: '💪', blurb: 'Bodybuilding-style: muscle size and shape.' },
  { id: 'fat_loss', label: 'Fat Loss', emoji: '📉', blurb: 'Heart-rate cardio you choose, plus 2 short strength days.' },
  { id: 'fitness', label: 'Improve Fitness', emoji: '😃', blurb: 'Stay in shape or get fitter: steady cardio plus 2 full-body strength days.' },
];
// Cardio-plus-strength programs share one engine: cardio days you fill with any activity, and two full-body strength days.
// The strength emoji follows the member's gender setting, like the location tiles in Move.
export const goalEmoji = (goal, gender) => {
  const g = GOALS.find((x) => x.id === goal);
  if (goal === 'strength') return gender === 'Female' ? '🏋️‍♀️' : gender === 'Male' ? '🏋️‍♂️' : '🏋️';
  return g ? g.emoji : '';
};
// A race program (program.goal === 'race', details in program.race) is its own engine in race.js.
export const isRace = (program) => program?.goal === 'race' && !!program.race;
export const isHybridGoal = (goal) => goal === 'fat_loss' || goal === 'fitness';

// A program can blend several goals (program.goals); program.goal stays the first one so older code and older programs
// keep working. Lifting goals (strength, hypertrophy) share the lifting days; a cardio goal (fat loss, fitness) adds the
// cardio days and minutes.
export const programGoals = (program) => (Array.isArray(program?.goals) && program.goals.length ? program.goals : program?.goal ? [program.goal] : []);
export const isBlend = (program) => programGoals(program).length > 1;
export const liftGoalsOf = (program) => programGoals(program).filter((g) => g === 'strength' || g === 'hypertrophy');
export const cardioGoalOf = (program) => { const g = programGoals(program); return g.includes('fat_loss') ? 'fat_loss' : g.includes('fitness') ? 'fitness' : null; };
export const hasCardio = (program) => cardioGoalOf(program) != null;
export const hasGoal = (program, id) => programGoals(program).includes(id);
// The short name on cards: the goal (Strength, Fat Loss...), or both names for a blend.
export const programLabel = (program) => (isRace(program) ? raceTitle(program) : isBlend(program) ? programTitle(program) : (GOALS.find((g) => g.id === program.goal) || { label: 'Training' }).label);
// A short plain description of a blend, shown when more than one goal is picked.
export function blendInfo(goals) {
  const lift = goals.filter((g) => g === 'strength' || g === 'hypertrophy');
  const cardio = goals.includes('fat_loss') ? 'Fat Loss' : goals.includes('fitness') ? 'Improve Fitness' : null;
  const parts = [];
  if (lift.length === 2) parts.push('Your lifting days alternate between powerlifting-style strength days (squat, bench, deadlift) and muscle-building days.');
  else if (lift[0] === 'strength') parts.push('Your lifting days are powerlifting-style strength days: squat, bench and deadlift.');
  else if (lift[0] === 'hypertrophy') parts.push('Your lifting days are muscle-building days: sets of 6-12 across every muscle.');
  if (cardio) parts.push(`Your cardio days follow ${goals.includes('fat_loss') && goals.includes('fitness') ? 'Fat Loss and Improve Fitness together' : cardio}: minutes build gently, in a heart-rate zone or by effort.`);
  parts.push('Everything runs on one 4-week wave: three build weeks, then a lighter week.');
  return parts.join(' ');
}

export const MODELS = [
  { id: 'undulating', label: 'Undulating', blurb: 'Heavy, moderate and light days mixed through every week.' },
  { id: 'linear', label: 'Linear', blurb: 'A steady build over weeks: lighter and higher reps first, then heavier.' },
];

export const GOAL_INFO = {
  strength: 'Prepares you for powerlifting, with no meet needed. The squat, bench press and deadlift get heavy work in low reps (6 or fewer, about 85%+ of your max) with long rests, then a second lift and smaller supporting lifts. Effort climbs over three weeks, then a lighter deload week.',
  hypertrophy: 'Prepares you for bodybuilding, with no show needed. Muscle size comes from enough hard sets per muscle each week (about 10-20), mostly 6-12 reps taken close to failure, with a good mix of big lifts and isolation work. Pick how the weeks progress below.',
  fat_loss: 'Fat loss comes mostly from a modest calorie deficit; exercise adds to it. ACSM finds 150-250 minutes a week of moderate activity gives modest loss, and more than 250 minutes gives clinically meaningful loss. Cardio minutes build gradually and you pick activities you enjoy, guided by heart rate or effort. Two short strength days help you keep muscle. We do not push the scale: it swings daily and can stay flat while you gain muscle and lose fat. You will see cardio minutes, resting heart rate, strength and fitness tests instead.',
  fitness: 'ACSM\'s general guidance for healthy adults: 150-300 minutes of moderate cardio a week plus strength work on 2 days. Cardio starts from what you already do and builds gently, with a lighter week every fourth week, and you pick activities you enjoy. The two full-body strength days use moderate weights and 8-12 reps.',
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

// Powerlifting templates for the Strength goal. `leads` are the day's lifts in order (the first gets the heavy
// prescription, the second a lighter "secondary" one); each lists the exercise to use first and fallbacks if the
// member skips it or lacks the equipment. `volume` days (lighter variations) run at a lighter effort.
const LEAD = {
  squat: { label: 'Squat', names: ['Barbell Back Squat', 'Front Squat', 'Leg Press'] },
  bench: { label: 'Bench', names: ['Barbell Bench Press', 'Dumbbell Chest Press', 'Machine Chest Press'] },
  deadlift: { label: 'Deadlift', names: ['Conventional Deadlift', 'Trap Bar Deadlift', 'Sumo Deadlift', 'Romanian Deadlift'] },
  press: { label: 'Press', names: ['Overhead Press', 'Arnold Press'] },
  rdl: { label: 'RDL', names: ['Romanian Deadlift', 'Barbell Good Morning', 'Single-Leg Romanian Deadlift'] },
  row: { label: 'Row', names: ['Barbell Row', 'Pendlay Row', 'Seated Cable Row'] },
  pullups: { label: 'Pull-ups', names: ['Pull-Ups', 'Lat Pulldown'] },
  pauseSquat: { label: 'Pause Squat', names: ['Pause Back Squat', 'Barbell Back Squat', 'Front Squat'] },
  frontSquat: { label: 'Front Squat', names: ['Front Squat', 'Goblet Squat', 'Leg Press'] },
  pauseBench: { label: 'Pause Bench', names: ['Pause Bench Press', 'Close-Grip Bench Press', 'Barbell Bench Press'] },
  closeGrip: { label: 'Close-Grip Bench', names: ['Close-Grip Bench Press', 'Barbell Bench Press'] },
};
const PL = {
  squat: { name: 'Squat Day', groups: ['Legs', 'Hamstrings', 'Core'], leads: [LEAD.squat, LEAD.rdl] },
  bench: { name: 'Bench Day', groups: ['Chest', 'Shoulders', 'Triceps'], leads: [LEAD.bench, LEAD.press] },
  deadlift: { name: 'Deadlift Day', groups: ['Back', 'Glutes', 'Biceps', 'Core'], leads: [LEAD.deadlift, LEAD.row] },
  squatBench: { name: 'Squat + Bench', groups: ['Legs', 'Chest', 'Core'], leads: [LEAD.squat, LEAD.bench] },
  deadPress: { name: 'Deadlift + Press', groups: ['Back', 'Shoulders', 'Hamstrings'], leads: [LEAD.deadlift, LEAD.press] },
  pressPull: { name: 'Press + Pull', groups: ['Shoulders', 'Back', 'Triceps', 'Biceps'], leads: [LEAD.press, LEAD.pullups], volume: true },
  squatB: { name: 'Squat Variation', groups: ['Legs', 'Quadriceps', 'Glutes', 'Core'], leads: [LEAD.pauseSquat, LEAD.frontSquat], volume: true },
  benchB: { name: 'Bench Variation', groups: ['Chest', 'Triceps', 'Back'], leads: [LEAD.pauseBench, LEAD.row], volume: true },
  deadliftB: { name: 'Deadlift Variation', groups: ['Hamstrings', 'Back', 'Glutes', 'Core'], leads: [LEAD.rdl, LEAD.pullups], volume: true },
};
const POWER_SPLITS = {
  2: { label: 'Powerlifting ×2', freq: 'Each big lift 1× a week', sessions: [PL.squatBench, PL.deadPress] },
  3: { label: 'Squat / Bench / Deadlift', freq: 'Each big lift 1× a week', sessions: [PL.squat, PL.bench, PL.deadlift] },
  4: { label: 'Big Three + Press', freq: 'Each big lift 1× a week, plus a press and pull day', sessions: [PL.squat, PL.bench, PL.deadlift, PL.pressPull] },
  5: { label: 'Big Three + Variations', freq: 'Squat and bench twice a week', sessions: [PL.squat, PL.bench, PL.deadlift, PL.benchB, PL.squatB] },
  6: { label: 'Big Three ×2', freq: 'Each big lift twice a week (the second day is lighter)', sessions: [PL.squat, PL.bench, PL.deadlift, PL.squatB, PL.benchB, PL.deadliftB] },
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
  if (isBlend(program) || isHybridGoal(program.goal) || isRace(program)) return [];
  if (program.goal === 'strength') {
    const p = POWER_SPLITS[program.days];
    return p ? [{ id: `pl${program.days}`, label: p.label, freq: p.freq, tag: 'Powerlifting', sessions: p.sessions, info: 'The squat, bench press and deadlift each get a heavy day, with a second lift and supporting work after. Days that train a lift a second time are lighter variations.' }] : [];
  }
  return SPLIT_OPTIONS[program.days] || [];
}
export function chosenSplit(program) {
  const opts = splitOptions(program);
  return opts.find((o) => o.id === program.split) || opts[0] || null;
}

// Weight loss: cardio days you fill with any activity you enjoy (in a heart-rate zone) plus two short
// full-body strength days to keep muscle. 4-6 days a week (the old 2-3 day layouts stay for existing programs).
const FAT_LOSS = {
  2: { seq: 'AR', days: [1, 4], lifts: [T.fullA, T.fullB] },
  3: { seq: 'ARA', days: [1, 3, 5], lifts: [T.fullA, T.fullB] },
  4: { seq: 'ARAR', days: [1, 2, 4, 5], lifts: [T.fullA, T.fullB] },
  5: { seq: 'ARARA', days: [1, 2, 3, 5, 6], lifts: [T.fullA, T.fullB] },
  6: { seq: 'ARAARA', days: [1, 2, 3, 4, 6, 0], lifts: [T.fullA, T.fullB] },
};

// Improve Fitness uses the same layouts (4-6 days: enough room for ACSM's cardio minutes plus two strength days).
// A blend with lifting goals and cardio gives lifting a bit more room (3 lifting days at 5 and 6 days a week).
const BLEND_CARDIO = {
  4: { seq: 'ARAR', days: [1, 2, 4, 5] },
  5: { seq: 'RARAR', days: [1, 2, 3, 5, 6] },
  6: { seq: 'RARARA', days: [1, 2, 3, 4, 6, 0] },
};
const hybridPlan = (program) => (isBlend(program) && liftGoalsOf(program).length > 0 && BLEND_CARDIO[program.days]) || FAT_LOSS[program.days] || FAT_LOSS[4];

const DAYS = { 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 4, 5, 6], 6: [1, 2, 3, 4, 5, 6] };
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Weekdays (0 = Sunday) in Monday-first order, so sessions run in calendar order.
export const orderedWeekdays = (list) => [...list].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
// True once the member has picked exactly as many training days as the program needs.
export const hasChosenDays = (program) => Array.isArray(program?.weekdays) && program.weekdays.length === program.days;

const rx = (sets, reps, rpe, rest) => ({ sets, reps, rpe, rest });

// Weeks repeat in a wave; the last week of each wave is a lighter deload.
const CYCLES = {
  // Powerlifting: low reps at 85%+ of max on the day's first lift, a lighter second lift, then accessories.
  strength: {
    len: 4, exercises: 5, mainCount: 1,
    weeks: [
      { phase: 'Build', main: rx(4, '5', '8', '3 min'), sec: rx(3, '6-8', '7', '2 min'), acc: rx(3, '8-12', '8', '90 sec') },
      { phase: 'Build', main: rx(4, '4', '8-9', '3-4 min'), sec: rx(3, '6', '7-8', '2 min'), acc: rx(3, '8-12', '8', '90 sec') },
      { phase: 'Build', main: rx(5, '2-3', '9', '4-5 min'), sec: rx(3, '5', '8', '2-3 min'), acc: rx(3, '8-12', '8', '90 sec') },
      { phase: 'Deload', main: rx(3, '5', '6', '2-3 min'), sec: rx(2, '6', '6', '2 min'), acc: rx(2, '8-10', '6', '60 sec') },
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
  // The two strength days: moderate loads, a few good lifts, enough to hold on to muscle in a calorie deficit.
  fat_loss: {
    len: 4, exercises: 5, mainCount: 0,
    weeks: [
      { phase: 'Build', main: rx(3, '10-12', '7', '60-90 sec') },
      { phase: 'Build', main: rx(3, '10-12', '8', '60-90 sec') },
      { phase: 'Build', main: rx(3, '8-12', '8', '60-90 sec') },
      { phase: 'Deload', main: rx(2, '10', '6', '60 sec') },
    ],
  },
  // Improve Fitness: ACSM's general guidance for healthy adults (2-4 sets of 8-12 at a moderate effort), eased in over
  // three weeks, then a lighter week.
  fitness: {
    len: 4, exercises: 6, mainCount: 0,
    weeks: [
      { phase: 'Build', main: rx(2, '10-12', '6', '60-90 sec') },
      { phase: 'Build', main: rx(3, '10-12', '7', '60-90 sec') },
      { phase: 'Build', main: rx(3, '8-12', '7-8', '60-90 sec') },
      { phase: 'Deload', main: rx(2, '10', '6', '60 sec') },
    ],
  },
};

export function cycleKey(program) {
  if (isBlend(program)) return 'strength'; // blends run one 4-week frame: three build weeks, then a lighter one
  if (program.goal === 'hypertrophy') return program.model === 'linear' ? 'linear' : 'undulating';
  return program.goal;
}
export function cycleLength(program) { if (isRace(program)) return program.race.weeks; return CYCLES[cycleKey(program)].len; }

export function programTitle(program) {
  if (isRace(program)) return raceTitle(program);
  if (isBlend(program)) {
    const gs = programGoals(program);
    return gs.length > 2 ? 'Custom Blend' : gs.map((id) => GOALS.find((x) => x.id === id)?.label || id).join(' + ');
  }
  const g = GOALS.find((x) => x.id === program.goal);
  if (program.goal === 'hypertrophy') return `${g.label} · ${program.model === 'linear' ? 'Linear' : 'Undulating'}`;
  return g.label;
}

export function resistanceDays(program) {
  if (isRace(program)) return program.race.strength || 0;
  return hasCardio(program) ? hybridPlan(program).seq.split('R').length - 1 : program.days;
}

// 1-based week number since the program started (weeks follow the member's week start).
export function weekNumber(program, today = new Date(), weekStartDay = 'sunday') {
  const start = startOfWeek(new Date(`${program.startedAt}T12:00:00`), weekStartDay);
  const now = startOfWeek(today, weekStartDay);
  return Math.max(1, Math.round((now - start) / (7 * 864e5)) + 1);
}
export function cyclePosition(program, week) {
  if (isRace(program)) return Math.min(week, program.race.weeks);
  return ((week - 1) % cycleLength(program)) + 1;
}

// ---- Weight loss cardio: weekly minutes in heart-rate zones ----
export const WEEKLY_MINUTES_CAP = 250; // ACSM: more than 250 min/week for clinically significant weight loss
export function cardioDays(program) {
  return hybridPlan(program).seq.split('A').length - 1;
}
// The week's cardio minutes: start where the member is (program.startMinutes), build about 10% a week, and make every
// 4th week a lighter one (70%). Capped at ACSM's 250, or about 60 minutes per cardio day if that is lower.
// Improve Fitness builds more gently (about 5% a week, 80% in the lighter week) toward ACSM's 300 minutes, about 90 minutes
// per cardio day at most.
const CARDIO_RULES = {
  fat_loss: { cap: WEEKLY_MINUTES_CAP, perDay: 60, growth: 1.1, light: 0.7 },
  fitness: { cap: 300, perDay: 90, growth: 1.05, light: 0.8 },
};
// Both cardio goals picked: the numbers sit halfway between the two.
function cardioRules(program) {
  const gs = programGoals(program).filter(isHybridGoal);
  if (gs.length === 2) { const [a, b] = [CARDIO_RULES.fat_loss, CARDIO_RULES.fitness]; return { cap: (a.cap + b.cap) / 2, perDay: (a.perDay + b.perDay) / 2, growth: (a.growth + b.growth) / 2, light: (a.light + b.light) / 2 }; }
  return CARDIO_RULES[gs[0]] || CARDIO_RULES.fat_loss;
}
export function weeklyMinutes(program, week) {
  const r = cardioRules(program);
  const start = Math.max(60, Number(program.startMinutes) || 90);
  const cap = Math.max(start, Math.min(r.cap, cardioDays(program) * r.perDay));
  const pos = ((week - 1) % 4) + 1;
  const blocks = Math.floor((week - 1) / 4);
  const build = (b) => Math.min(cap, start * r.growth ** b);
  const m = pos === 4 ? r.light * build(blocks * 3 + 2) : build(blocks * 3 + (pos - 1));
  return Math.round(m / 5) * 5;
}
export const ZONES = {
  moderate: { label: 'Moderate', lowPct: 0.4, highPct: 0.59, rpe: '5-6', talk: 'you can talk but not sing' },
  easy: { label: 'Easy to Moderate', lowPct: 0.4, highPct: 0.5, rpe: '4-5', talk: 'you can chat easily' },
  hard: { label: 'Hard', lowPct: 0.6, highPct: 0.79, rpe: '7-8', talk: 'only a few words at a time' },
};
// "128-142 bpm" when the member guides by heart rate and their resting and max are known; otherwise effort (RPE, a 0-10 scale)
// with the talk test, so no watch is needed.
export function zoneText(zone, hr) {
  if (hr && hr.rest != null && hr.max != null) return `${karvonenBpm(hr.rest, hr.max, zone.lowPct)}–${karvonenBpm(hr.rest, hr.max, zone.highPct)} bpm`;
  return `effort ${zone.rpe.replace('-', '–')} of 10, ${zone.talk}`;
}
// One cardio session. `n` cardio days a week; the last one is the long one, the first are steady, and from week 3
// one steady day can become an interval day (short harder bursts), which is optional.
function cardioSession(program, week, ai, n, day, deload) {
  const total = weeklyMinutes(program, week);
  const intervalAt = n >= 3 ? 1 : -1; // second session
  const kinds = Array.from({ length: n }, (_, i) => (i === n - 1 && n >= 2 ? 'long' : week >= 3 && !deload && i === intervalAt ? 'intervals' : 'steady'));
  const kind = kinds[ai];
  const weight = { steady: 1, intervals: 0.75, long: 1.6 };
  const sum = kinds.reduce((a, k) => a + weight[k], 0);
  const minutes = Math.max(20, Math.round((total * weight[kind]) / sum / 5) * 5);
  const base = { id: `w${week}-a${ai}`, kind: 'aerobic', day, minutes, phase: deload ? 'Deload' : 'Build', variant: kind };
  if (kind === 'intervals') {
    const rounds = Math.max(3, Math.floor((minutes - 10) / 4));
    return { ...base, name: 'Intervals', zone: ZONES.hard, easyZone: ZONES.easy, rpe: ZONES.hard.rpe, intervals: { rounds, hard: 2, easy: 2, warm: 5, cool: 5 },
      note: 'Short harder bursts with easy recovery. Optional: swap for a steady session if you would rather.' };
  }
  if (kind === 'long') return { ...base, name: 'Long Cardio', zone: ZONES.easy, rpe: ZONES.easy.rpe, note: 'Your longest session. Keep it easy enough to chat.' };
  return { ...base, name: 'Steady Cardio', zone: ZONES.moderate, rpe: ZONES.moderate.rpe, note: 'Steady and comfortable, a little breathless but you can still talk.' };
}
export function intervalLine(s) {
  const i = s.intervals;
  return i ? `${i.warm} min easy, ${i.rounds} × (${i.hard} min hard + ${i.easy} min easy), ${i.cool} min easy` : null;
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
  fitness: { min: 8, max: 15, Heavy: -2, Light: 3 },
};
function flavored(main, label, goal) {
  const c = DAY_SHIFT[goal];
  const d = c?.[label];
  return d ? { ...main, reps: shiftReps(main.reps, d, c.min, c.max) } : main;
}

// The sessions for one week, with the prescription for that week.
export function sessionsForWeek(program, week) {
  if (isRace(program)) return raceSessionsForWeek(program, week);
  return isBlend(program) ? blendSessions(program, week) : plainSessions(program, week);
}

// The lift templates a goal contributes when it gets `n` of the week's lifting days.
function templatesFor(goal, n) {
  if (goal === 'strength') return n >= 2 ? POWER_SPLITS[Math.min(n, 6)].sessions : [PL.squatBench];
  return n >= 2 ? (SPLIT_OPTIONS[Math.min(n, 6)] || SPLIT_OPTIONS[3])[0].sessions : [T.fullA];
}

// A blend: the lifting days are shared between the lifting goals (alternating strength and muscle-building days), and a
// cardio goal adds its cardio days. One 4-week frame: three build weeks, then a lighter week.
function blendSessions(program, week) {
  const lift = liftGoalsOf(program);
  if (lift.length === 0) { const cg = cardioGoalOf(program); return plainSessions({ ...program, goal: cg }, week, cg); } // Fat Loss + Improve Fitness
  const cyc = CYCLES.strength;
  const pos = cyclePosition(program, week);
  const w = cyc.weeks[pos - 1];
  const deload = w.phase === 'Deload';
  const plan = hasCardio(program) ? hybridPlan(program) : null;
  const seq = plan ? plan.seq : 'R'.repeat(program.days);
  const days = hasChosenDays(program) ? orderedWeekdays(program.weekdays) : (plan ? plan.days : DAYS[program.days]);
  const nR = seq.split('R').length - 1;
  const counts = lift.length === 1 ? [nR] : [Math.ceil(nR / 2), nR - Math.ceil(nR / 2)];
  const templates = lift.map((g, i) => templatesFor(g, counts[i]));
  const order = [];
  for (let k = 0; order.length < nR && k < 8; k += 1) lift.forEach((g, i) => { if (templates[i][k] && order.length < nR) order.push({ g, t: templates[i][k] }); });
  const und = CYCLES.undulating;
  const out = [];
  let li = 0; let ai = 0; let hi = 0;
  seq.split('').forEach((c, i) => {
    const day = days[i];
    if (c === 'A') { out.push(cardioSession(program, week, ai, cardioDays(program), day, deload)); ai += 1; return; }
    const { g, t } = order[li];
    let presc; let label = ''; let exercises; let mainCount;
    if (g === 'strength') {
      label = deload ? 'Deload' : t.volume ? 'Volume' : '';
      let top = t.volume && !deload ? flavored(w.main, 'Light', 'strength') : w.main;
      if (t.leads && t.leads[0] === LEAD.deadlift && top.sets > 3) top = { ...top, sets: Math.max(3, top.sets - 2) };
      presc = { main: top, sec: w.sec || null, acc: w.acc || null };
      exercises = cyc.exercises; mainCount = cyc.mainCount;
    } else {
      const d = deload ? und.deload : und.days[(hi + week - 1) % 3];
      presc = { main: d.main, sec: null, acc: null };
      label = d.label; hi += 1;
      exercises = (t.groups || []).length <= 3 ? 7 : 6; mainCount = 0;
    }
    out.push({
      id: `w${week}-r${li}`, kind: 'resistance', name: t.name + (g === 'hypertrophy' && label ? ` · ${label}` : ''),
      shortName: t.name, groups: t.groups, style: g === 'strength' ? 'Strength' : 'Hypertrophy', day, label, goal: g,
      presc: presc.main, sec: presc.sec, acc: presc.acc, leads: t.leads || null, exercises, mainCount, phase: deload ? 'Deload' : 'Build',
    });
    li += 1;
  });
  return out;
}

function plainSessions(program, week, keyOverride) {
  const key = keyOverride || cycleKey(program);
  const cyc = CYCLES[key];
  const pos = cyclePosition(program, week);
  const deload = pos === cyc.len && (key !== 'undulating' ? cyc.weeks[pos - 1].phase === 'Deload' : true);
  const out = [];

  const hybrid = isHybridGoal(program.goal);
  const lifts = hybrid ? hybridPlan(program).lifts : chosenSplit(program).sessions;
  const seq = hybrid ? hybridPlan(program).seq : 'R'.repeat(program.days);
  const defaultDays = hybrid ? hybridPlan(program).days : DAYS[program.days];
  // The days the member picked (Mon-first order), else a sensible default spread.
  const days = hasChosenDays(program) ? orderedWeekdays(program.weekdays) : defaultDays;
  let li = 0; let ai = 0;
  seq.split('').forEach((c, i) => {
    const day = days[i];
    if (c === 'A') {
      out.push(cardioSession(program, week, ai, cardioDays(program), day, deload));
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
      if (program.goal === 'strength') {
        // Powerlifting days: the first lift is the week's top work; variation (volume) days run lighter.
        label = w.phase === 'Deload' ? 'Deload' : t.volume ? 'Volume' : '';
        let top = t.volume && !deload ? flavored(w.main, 'Light', 'strength') : w.main;
        if (t.leads && t.leads[0] === LEAD.deadlift && top.sets > 3) top = { ...top, sets: Math.max(3, top.sets - 2) }; // deadlifts are taxing: fewer heavy sets
        presc = { main: top, sec: w.sec || null, acc: w.acc || null };
      } else {
        label = w.phase === 'Deload' ? 'Deload' : ['Heavy', 'Moderate', 'Light'][(li + flavorSkew + week - 1) % 3];
        presc = { main: flavored(w.main, label, program.goal), acc: w.acc || null };
      }
    }
    const style = program.goal === 'strength' ? 'Strength' : 'Hypertrophy';
    out.push({
      id: `w${week}-r${li}`, kind: 'resistance', name: t.name + (label && key === 'undulating' ? ` · ${label}` : ''),
      shortName: t.name, groups: t.groups, style, day, label,
      presc: presc.main, sec: presc.sec || null, acc: presc.acc, leads: t.leads || null,
      exercises: program.goal === 'hypertrophy' && (t.groups || []).length <= 3 ? 7 : cyc.exercises, mainCount: cyc.mainCount,
      phase: deload ? 'Deload' : 'Build',
    });
    li += 1;
  });
  return out;
}

export function phaseLabel(program, week) {
  if (isRace(program)) return racePhaseLabel(program, week);
  const key = cycleKey(program);
  const cyc = CYCLES[key];
  const pos = cyclePosition(program, week);
  const deload = key === 'undulating' ? pos === cyc.len : cyc.weeks[pos - 1].phase === 'Deload';
  return `${deload ? 'Deload' : 'Build'} · week ${pos} of ${cyc.len}`;
}

const dash = (s) => String(s).replace('-', '–');
export function prescriptionLine(s, hr) {
  if (s.run) return `about ${s.minutes} min · ${s.paceLabel} ${s.paceText}`;
  if (s.kind === 'aerobic') return s.zone ? `${s.minutes} min · ${s.zone.label} · ${zoneText(s.zone, hr)}` : `${s.minutes} min · RPE ${dash(s.rpe)}`;
  const p = s.presc;
  const main = `${p.sets} × ${dash(p.reps)} · RPE ${dash(p.rpe)} · rest ${dash(p.rest)}`;
  return main;
}
export function leadText(s) {
  return s.leads && s.leads.length ? s.leads.map((l) => l.label).join(' + ') : null;
}
export function secondaryLine(s) {
  if (!s.sec) return null;
  return `Second lift ${s.sec.sets} × ${dash(s.sec.reps)} · RPE ${dash(s.sec.rpe)}`;
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
  if (isRace(program)) return moves; // run days are not interchangeable (long run, hard days), so keep each where it was put
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
  if (isRace(program)) horizonDays = Math.max(horizonDays, daysToRace(program.race) + 2);
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
    details: sess.kind === 'aerobic' ? { kind: 'aerobic', minutes: sess.minutes, ...(sess.run ? { run: true } : {}) } : { kind: 'resistance' },
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
