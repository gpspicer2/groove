import { ADVANCED_LIFTS } from '../move/exerciseLibrary';

// The lifting experience survey: which movements a member knows, wants to learn, or wants left out.
// `names` are the library exercises each answer covers. Answers: 'know' | 'learn' | 'skip' (blank = no answer; 'love' counts as knowing it and is also favored).
export const EXPERIENCE_GROUPS = [
  { title: 'Squats', items: [
    { id: 'back_squat', label: 'Back Squat', info: 'A barbell rests across your upper back as you squat down and stand up. The classic leg lift.', names: ['Barbell Back Squat', 'Pause Back Squat'] },
    { id: 'front_squat', label: 'Front Squat', info: 'The barbell rests on the front of your shoulders while you squat. It keeps your chest upright and works the front of your thighs.', names: ['Front Squat'] },
    { id: 'goblet', label: 'Goblet Squat', info: 'Hold one dumbbell or kettlebell at your chest and squat. A friendly way to learn squatting.', names: ['Goblet Squat'] },
    { id: 'leg_press', label: 'Leg Press', info: 'Sit in a machine and push a weight away with your legs. Easy on your balance and back.', names: ['Leg Press'] },
    { id: 'lunges', label: 'Lunges and Split Squats', info: 'Step forward, back or to the side into a lunge, or rest your back foot on a bench for a split squat. Works one leg at a time.', names: ['Walking Lunges', 'Reverse Lunges', 'Bulgarian Split Squat', 'Step-Ups'] },
  ] },
  { title: 'Hinges', items: [
    { id: 'deadlift', label: 'Conventional Deadlift', info: 'Lift a barbell from the floor to standing, with your feet hip-width and hands just outside your knees.', names: ['Conventional Deadlift'] },
    { id: 'sumo', label: 'Sumo Deadlift', info: 'A deadlift with a wide stance and toes turned out, hands inside your knees.', names: ['Sumo Deadlift'] },
    { id: 'trap_bar', label: 'Trap Bar Deadlift', info: 'A deadlift standing inside a hexagon-shaped bar. Often feels easier on the back than a straight bar.', names: ['Trap Bar Deadlift'] },
    { id: 'rdl', label: 'Romanian Deadlift', info: 'Hinge at your hips with a barbell or dumbbells, sliding the weight down your legs with knees slightly bent. Works hamstrings and glutes.', names: ['Romanian Deadlift', 'Single-Leg Romanian Deadlift'] },
    { id: 'good_morning', label: 'Good Morning', info: 'A barbell on your upper back as you bow forward at the hips with a flat back, then stand tall.', names: ['Barbell Good Morning'] },
    { id: 'hip_thrust', label: 'Hip Thrust', info: 'Back against a bench with a barbell or dumbbell on your hips, drive your hips up. A glute builder.', names: ['Hip Thrust', 'Dumbbell Hip Thrust'] },
    { id: 'kb_swing', label: 'Kettlebell Swing', info: 'Swing a kettlebell from between your legs to chest height by snapping your hips forward.', names: ['Kettlebell Swing'] },
  ] },
  { title: 'Pressing', items: [
    { id: 'bench', label: 'Bench Press', info: 'Lie on a bench, lower a barbell to your chest, and press it back up.', names: ['Barbell Bench Press', 'Pause Bench Press'] },
    { id: 'close_grip', label: 'Close-Grip Bench', info: 'A bench press with your hands closer together, which works your triceps more.', names: ['Close-Grip Bench Press'] },
    { id: 'ohp', label: 'Overhead Press', info: 'Press a barbell or dumbbells from your shoulders to overhead while standing.', names: ['Overhead Press'] },
    { id: 'push_press', label: 'Push Press', info: 'An overhead press that starts with a small knee dip and leg drive to help the weight up.', names: ['Push Press'] },
    { id: 'dips', label: 'Dips', info: 'Lower and raise your body between parallel bars (or on a bench) by bending your elbows.', names: ['Dips'] },
    { id: 'db_press', label: 'Dumbbell Presses', info: 'Pressing dumbbells away from your chest (flat or incline) or overhead (Arnold press, with a twist).', names: ['Dumbbell Chest Press', 'Incline Dumbbell Press', 'Arnold Press'] },
  ] },
  { title: 'Pulling', items: [
    { id: 'pullups', label: 'Pull-Ups and Chin-Ups', info: 'Hang from a bar and pull your chin over it. Chin-ups use an underhand grip.', names: ['Pull-Ups', 'Chin-Up (underhand)'] },
    { id: 'bb_row', label: 'Barbell Row', info: 'Hinge forward and pull a barbell to your lower ribs.', names: ['Barbell Row'] },
    { id: 'pendlay', label: 'Pendlay Row', info: 'A strict row where the barbell starts on the floor every rep and you pull it to your chest.', names: ['Pendlay Row'] },
    { id: 'pulldown', label: 'Pulldowns and Cable Rows', info: 'Pull a bar down to your chest on a machine (lat pulldown), or pull a handle toward your belly while seated (cable row).', names: ['Lat Pulldown', 'Seated Cable Row'] },
  ] },
  { title: 'Olympic Lifts', items: [
    { id: 'clean', label: 'Power Clean', info: 'Pull a barbell from the floor (or knees) up to your shoulders in one fast motion, catching it in a quarter squat. Technical: get coaching first.', names: ['Power Clean', 'Hang Power Clean'] },
    { id: 'snatch', label: 'Snatch', info: 'Pull a barbell from the floor to overhead in one fast motion. The most technical lift: get coaching first.', names: ['Power Snatch'] },
  ] },
];

export const EXPERIENCE_STATES = [
  { id: 'know', label: 'Know It' },
  { id: 'love', label: 'Love It' },
  { id: 'learn', label: 'Learn It' },
  { id: 'skip', label: 'Skip It' },
];

const ALL_ITEMS = EXPERIENCE_GROUPS.flatMap((g) => g.items);

// Library exercises to leave out of suggested workouts and programs: anything the member marked "Skip it", and the Olympic
// and other technical lifts unless they said they know them.
export function blockedByExperience(answers = {}) {
  const blocked = new Set();
  ALL_ITEMS.forEach((it) => { if (answers[it.id] === 'skip') it.names.forEach((n) => blocked.add(n)); });
  const known = new Set();
  ALL_ITEMS.forEach((it) => { if (answers[it.id] === 'know' || answers[it.id] === 'love') it.names.forEach((n) => known.add(n)); });
  ADVANCED_LIFTS.forEach((n) => { if (!known.has(n)) blocked.add(n); });
  return [...blocked];
}
// True when the member said they know this exercise (used to prefer familiar lifts).
export function knowsLift(answers = {}, name) {
  return ALL_ITEMS.some((it) => (answers[it.id] === 'know' || answers[it.id] === 'love') && it.names.includes(name));
}
// Lifts the member loves: suggested workouts pick these first, and they win when a day's lift has options.
export function lovedLifts(answers = {}) {
  return ALL_ITEMS.filter((it) => answers[it.id] === 'love').flatMap((it) => it.names);
}
