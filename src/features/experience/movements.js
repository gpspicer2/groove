import { ADVANCED_LIFTS } from '../move/exerciseLibrary';

// The lifting experience survey: which movements a member knows, wants to learn, or wants left out.
// `names` are the library exercises each answer covers. Answers: 'know' | 'learn' | 'skip' (blank = no answer).
export const EXPERIENCE_GROUPS = [
  { title: 'Squats', items: [
    { id: 'back_squat', label: 'Back squat', names: ['Barbell Back Squat', 'Pause Back Squat'] },
    { id: 'front_squat', label: 'Front squat', names: ['Front Squat'] },
    { id: 'goblet', label: 'Goblet squat', names: ['Goblet Squat'] },
    { id: 'leg_press', label: 'Leg press', names: ['Leg Press'] },
    { id: 'lunges', label: 'Lunges and split squats', names: ['Walking Lunges', 'Reverse Lunges', 'Bulgarian Split Squat', 'Step-Ups'] },
  ] },
  { title: 'Hinges', items: [
    { id: 'deadlift', label: 'Conventional deadlift', names: ['Conventional Deadlift'] },
    { id: 'sumo', label: 'Sumo deadlift', names: ['Sumo Deadlift'] },
    { id: 'trap_bar', label: 'Trap bar deadlift', names: ['Trap Bar Deadlift'] },
    { id: 'rdl', label: 'Romanian deadlift', names: ['Romanian Deadlift', 'Single-Leg Romanian Deadlift'] },
    { id: 'good_morning', label: 'Good morning', names: ['Barbell Good Morning'] },
    { id: 'hip_thrust', label: 'Hip thrust', names: ['Hip Thrust', 'Dumbbell Hip Thrust'] },
    { id: 'kb_swing', label: 'Kettlebell swing', names: ['Kettlebell Swing'] },
  ] },
  { title: 'Pressing', items: [
    { id: 'bench', label: 'Bench press', names: ['Barbell Bench Press', 'Pause Bench Press'] },
    { id: 'close_grip', label: 'Close-grip bench', names: ['Close-Grip Bench Press'] },
    { id: 'ohp', label: 'Overhead press', names: ['Overhead Press'] },
    { id: 'push_press', label: 'Push press', names: ['Push Press'] },
    { id: 'dips', label: 'Dips', names: ['Dips'] },
    { id: 'db_press', label: 'Dumbbell presses', names: ['Dumbbell Chest Press', 'Incline Dumbbell Press', 'Arnold Press'] },
  ] },
  { title: 'Pulling', items: [
    { id: 'pullups', label: 'Pull-ups and chin-ups', names: ['Pull-Ups', 'Chin-Up (underhand)'] },
    { id: 'bb_row', label: 'Barbell row', names: ['Barbell Row'] },
    { id: 'pendlay', label: 'Pendlay row', names: ['Pendlay Row'] },
    { id: 'pulldown', label: 'Pulldowns and cable rows', names: ['Lat Pulldown', 'Seated Cable Row'] },
  ] },
  { title: 'Olympic lifts', items: [
    { id: 'clean', label: 'Power clean', names: ['Power Clean', 'Hang Power Clean'] },
    { id: 'snatch', label: 'Snatch', names: ['Power Snatch'] },
  ] },
];

export const EXPERIENCE_STATES = [
  { id: 'know', label: 'Know it' },
  { id: 'learn', label: 'Learn it' },
  { id: 'skip', label: 'Skip it' },
];

const ALL_ITEMS = EXPERIENCE_GROUPS.flatMap((g) => g.items);

// Library exercises to leave out of suggested workouts and programs: anything the member marked "Skip it", and the Olympic
// and other technical lifts unless they said they know them.
export function blockedByExperience(answers = {}) {
  const blocked = new Set();
  ALL_ITEMS.forEach((it) => { if (answers[it.id] === 'skip') it.names.forEach((n) => blocked.add(n)); });
  const known = new Set();
  ALL_ITEMS.forEach((it) => { if (answers[it.id] === 'know') it.names.forEach((n) => known.add(n)); });
  ADVANCED_LIFTS.forEach((n) => { if (!known.has(n)) blocked.add(n); });
  return [...blocked];
}
// True when the member said they know this exercise (used to prefer familiar lifts).
export function knowsLift(answers = {}, name) {
  return ALL_ITEMS.some((it) => answers[it.id] === 'know' && it.names.includes(name));
}
