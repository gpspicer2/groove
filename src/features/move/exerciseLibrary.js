// A small curated exercise library, grouped by muscle group. Real
// recommendation engines (Fitbod included) draw from thousands of
// exercises with equipment/injury filters — this is a deliberately
// simple starting point: enough variety per muscle group to generate a
// different workout each time without repeating last session's picks.
export const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Quadriceps', 'Hamstrings', 'Glutes', 'Arms', 'Shoulders', 'Biceps', 'Triceps', 'Core'];

// Quick "select all" shortcuts on the muscle-group picker. Selecting one
// fills in every group in it; individual groups can still be deselected
// afterward without the region shortcut losing its highlighted state (see
// MuscleGroupPicker — it highlights on "any selected", not "all selected").
const UPPER_BODY = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'];
const LOWER_BODY = ['Legs', 'Quadriceps', 'Hamstrings', 'Glutes'];
export const BODY_REGION_GROUPS = {
  'Whole Body': [...UPPER_BODY, ...LOWER_BODY, 'Core'],
  'Upper Body': UPPER_BODY,
  'Lower Body': LOWER_BODY,
};

// "Legs" and "Arms" act as their own quick-select bundles right in the
// muscle-group chip row: clicking one fills in its whole bundle, and
// unselecting one member doesn't clear the bundle's highlight until
// every member is gone. "Legs" is itself a real, selectable muscle
// group (with its own exercise pool); "Arms" is a pure UI shortcut for
// Biceps/Triceps/Shoulders and is never stored as a value on its own.
export const LEGS_BUNDLE = ['Legs', 'Quadriceps', 'Hamstrings', 'Glutes'];
export const ARMS_BUNDLE = ['Biceps', 'Triceps', 'Shoulders'];

// What a session is made of. Aerobic/Resistance ask for one picker each;
// Combined requires both; Flexibility reuses the muscle-group picker but
// pulls from FLEXIBILITY_LIBRARY and logs as its own movement type.
export const MOVEMENT_MODES = ['Aerobic', 'Resistance', 'Combined', 'Flexibility'];

// What clients see. The stored value stays 'Combined' (it's in saved
// workouts and plans); only the label changed, to something friendlier.
export const MODE_LABELS = { Combined: 'Mixed' };
export function modeLabel(mode) {
  return MODE_LABELS[mode] || mode;
}

// One emoji per choice on the big once-per-workout questions — kept to
// type and training goal so the flow stays playful, not noisy.
export const MODE_EMOJI = { Aerobic: '🏃', Resistance: '🏋️', Flexibility: '🧘', Combined: '🔀' };
export const STYLE_EMOJI = { Strength: '💥', Hypertrophy: '📈', Endurance: '🔋' };

// Quick-pick suggestions for aerobic/cardio movements — these aren't part
// of the resistance library (no sets/reps/weight progression) so they
// live separately.
export const AEROBIC_ACTIVITIES_QUICK = [
  'Treadmill Run', 'Treadmill Walk', 'Outdoor Run', 'Stationary Bike', 'Rowing Machine', 'Elliptical', 'Stair Climber', 'Jump Rope',
];

// Built-in options for "what kind of movement are you doing today" —
// everyday/lifestyle activity, logged as aerobic (duration/distance)
// rather than sets and reps. A client's own typed-in additions are
// appended alongside these (see profiles.custom_activities).
export const LIFESTYLE_ACTIVITIES = [
  'Walking', 'Jogging', 'Cycling', 'Hiking', 'Swimming', 'Yoga', 'Dancing', 'Gardening', 'Yard Work',
  'Pickleball', 'Basketball', 'Tennis', 'Soccer', 'Volleyball', 'Golf',
];

// What kind of flexibility work, selected alongside which muscle groups
// to target — logged as its own timed entry (like an aerobic activity)
// in addition to the muscle-group-driven stretch plan.
export const FLEXIBILITY_ACTIVITIES = [
  'Static Stretching', 'Dynamic Stretching', 'Yoga', 'Pilates', 'Mobility Work',
  'Foam Rolling',
  'Tai Chi', 'Balance Training',
];

// ACSM's neuromotor (balance) work. Sessions with these count toward the
// optional Balance goal on Birdseye.
export const BALANCE_ACTIVITIES = ['Tai Chi', 'Balance Training', 'Single-Leg Stand', 'Tandem Stand', 'Heel-to-Toe Walk'];

const BALANCE_LIBRARY = [
  { name: 'Single-Leg Stand', sets: 2, reps: '20-30s per side' },
  { name: 'Tandem Stand', sets: 2, reps: '20-30s per side' },
  { name: 'Heel-to-Toe Walk', sets: 2, reps: '10 steps' },
];

// One stretch from the groups just trained and/or one balance drill,
// added to the end of a suggested workout so it counts toward the weekly
// Flexibility and Balance goals. Balance entries are flagged `balance`.
export function generateCooldown(muscleGroups, { flexibility = true, balance = false } = {}) {
  const out = [];
  if (flexibility) {
    const groups = muscleGroups.flatMap((g) => (FLEXIBILITY_LIBRARY[g] ? [g] : []));
    const pool = groups.length ? groups : Object.keys(FLEXIBILITY_LIBRARY);
    const group = pool[Math.floor(Math.random() * pool.length)];
    const ex = FLEXIBILITY_LIBRARY[group][Math.floor(Math.random() * FLEXIBILITY_LIBRARY[group].length)];
    out.push({ ...ex, muscleGroup: group, type: 'flexibility', supersetId: null });
  }
  if (balance) {
    const ex = BALANCE_LIBRARY[Math.floor(Math.random() * BALANCE_LIBRARY.length)];
    out.push({ ...ex, muscleGroup: 'Balance', type: 'flexibility', balance: true, supersetId: null });
  }
  return out;
}

// Each exercise is tagged with the equipment it needs, so the plan can be
// narrowed down based on where the session happens (see LOCATION_EQUIPMENT
// below) instead of always suggesting a full gym's worth of machines.
export const EXERCISE_LIBRARY = {
  Chest: [
    { name: 'Barbell Bench Press', sets: 4, reps: '8-10', equipment: 'barbell' },
    { name: 'Dumbbell Chest Press', sets: 4, reps: '10-12', equipment: 'dumbbell' },
    { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', equipment: 'dumbbell' },
    { name: 'Dumbbell Fly', sets: 3, reps: '12-15', equipment: 'dumbbell' },
    { name: 'Deficit Push-Ups', sets: 3, reps: '12-15', equipment: 'bodyweight' }, // hands elevated on blocks/plates for extra stretch — big ROM
    { name: 'Dips', sets: 3, reps: '10-15', equipment: 'bodyweight' },
    { name: 'Push-Ups', sets: 3, reps: '10-15', equipment: 'bodyweight' },
    { name: 'Machine Chest Press', sets: 3, reps: '10-12', equipment: 'machine' },
  ],
  Back: [
    { name: 'Pull-Ups', sets: 4, reps: '8-10', equipment: 'bodyweight' },
    { name: 'Lat Pulldown', sets: 3, reps: '10-12', equipment: 'machine' },
    { name: 'Barbell Row', sets: 4, reps: '8-10', equipment: 'barbell' },
    { name: 'Seated Cable Row', sets: 4, reps: '10-12', equipment: 'cable' },
    { name: 'Straight-Arm Pulldown', sets: 3, reps: '12-15', equipment: 'cable' }, // long lat stretch overhead
    { name: 'Dumbbell Pullover', sets: 3, reps: '10-12', equipment: 'dumbbell' },     // big overhead ROM
    { name: 'Single-Arm Dumbbell Row', sets: 3, reps: '10-12', equipment: 'dumbbell' },
    { name: 'Inverted Row', sets: 3, reps: '8-12', equipment: 'bodyweight' }, // under a sturdy table or low bar
    { name: 'Chest-Supported Dumbbell Row', sets: 3, reps: '10-12', equipment: 'dumbbell' },
    { name: 'Back Extension', sets: 3, reps: '10-15', equipment: 'bodyweight' },
    { name: 'Dumbbell Shrug', sets: 3, reps: '12-15', equipment: 'dumbbell' },
  ],
  Legs: [
    { name: 'Barbell Back Squat', sets: 4, reps: '8-10', equipment: 'barbell' },
    { name: 'Leg Press', sets: 4, reps: '10-15', equipment: 'machine' },
    { name: 'Walking Lunges', sets: 3, reps: '10-12', equipment: 'bodyweight' },
    { name: 'Romanian Deadlift', sets: 3, reps: '10-12', equipment: 'barbell' },
    { name: 'Bulgarian Split Squat', sets: 3, reps: '10-12', equipment: 'dumbbell' }, // deep single-leg stretch
    { name: 'Bodyweight Squat', sets: 4, reps: '15-20', equipment: 'bodyweight' },
    { name: 'Reverse Lunges', sets: 3, reps: '10-12', equipment: 'bodyweight' },
    { name: 'Calf Raises', sets: 3, reps: '12-20', equipment: 'bodyweight' },
  ],
  Quadriceps: [
    { name: 'Front Squat', sets: 4, reps: '8-10', equipment: 'barbell' },
    { name: 'Leg Extension', sets: 3, reps: '12-15', equipment: 'machine' },
    { name: 'Goblet Squat', sets: 3, reps: '10-15', equipment: 'dumbbell' },
    { name: 'Step-Ups', sets: 3, reps: '10-12', equipment: 'bodyweight' },
    { name: 'Wall Sit', sets: 3, reps: '30-45s', equipment: 'bodyweight' },
  ],
  Hamstrings: [
    { name: 'Leg Curl', sets: 3, reps: '10-15', equipment: 'machine' },
    { name: 'Romanian Deadlift', sets: 3, reps: '10-12', equipment: 'barbell' },
    { name: 'Nordic Curl (assisted)', sets: 3, reps: '6-10', equipment: 'bodyweight' },
    { name: 'Seated Hamstring Curl', sets: 3, reps: '10-15', equipment: 'machine' },
    { name: 'Single-Leg Romanian Deadlift', sets: 3, reps: '8-12', equipment: 'dumbbell' },
    { name: 'Hamstring Walkout', sets: 3, reps: '6-10', equipment: 'bodyweight' },
    { name: 'Bodyweight Good Morning', sets: 3, reps: '12-15', equipment: 'bodyweight' },
  ],
  Glutes: [
    { name: 'Hip Thrust', sets: 4, reps: '8-12', equipment: 'barbell' },
    { name: 'Single-Leg Glute Bridge', sets: 3, reps: '12-15', equipment: 'bodyweight' },
    { name: 'Cable Kickback', sets: 3, reps: '12-15', equipment: 'cable' },
    { name: 'Bulgarian Split Squat', sets: 3, reps: '10-12', equipment: 'dumbbell' },
    { name: 'Dumbbell Hip Thrust', sets: 3, reps: '10-15', equipment: 'dumbbell' },
    { name: 'Donkey Kicks', sets: 3, reps: '12-15', equipment: 'bodyweight' },
  ],
  Shoulders: [
    { name: 'Overhead Press', sets: 4, reps: '6-8', equipment: 'barbell' },
    { name: 'Lateral Raise', sets: 3, reps: '12-15', equipment: 'dumbbell' },
    { name: 'Face Pull', sets: 3, reps: '12-15', equipment: 'cable' },
    { name: 'Arnold Press', sets: 3, reps: '8-10', equipment: 'dumbbell' },
    { name: 'Front Raise', sets: 3, reps: '10-12', equipment: 'dumbbell' },
    { name: 'Rear Delt Fly', sets: 3, reps: '12-15', equipment: 'dumbbell' },
    { name: 'Pike Push-Up', sets: 3, reps: '8-12', equipment: 'bodyweight' },
    { name: 'Handstand Hold (wall)', sets: 3, reps: '20-30s', equipment: 'bodyweight' },
    { name: 'Plank Shoulder Taps', sets: 3, reps: '10-16', equipment: 'bodyweight' },
  ],
  Biceps: [
    { name: 'Barbell Curl', sets: 3, reps: '8-12', equipment: 'barbell' },
    { name: 'Incline Dumbbell Curl', sets: 3, reps: '10-15', equipment: 'dumbbell' }, // deep stretch at the bottom — good ROM pick
    { name: 'Hammer Curl', sets: 3, reps: '10-12', equipment: 'dumbbell' },
    { name: 'Concentration Curl', sets: 3, reps: '10-15', equipment: 'dumbbell' },
    { name: 'Cable Curl', sets: 3, reps: '12-15', equipment: 'cable' },
    { name: 'Preacher Curl', sets: 3, reps: '10-12', equipment: 'barbell' },
    { name: 'Chin-Up (underhand)', sets: 3, reps: '6-10', equipment: 'bodyweight' },
  ],
  Triceps: [
    { name: 'Tricep Pushdown', sets: 3, reps: '10-15', equipment: 'cable' },
    { name: 'Skull Crusher', sets: 3, reps: '8-12', equipment: 'barbell' },
    { name: 'Overhead Tricep Extension', sets: 3, reps: '10-15', equipment: 'dumbbell' }, // long stretch overhead — good ROM pick
    { name: 'Close-Grip Bench Press', sets: 3, reps: '8-10', equipment: 'barbell' },
    { name: 'Dips', sets: 3, reps: '8-12', equipment: 'bodyweight' },
    { name: 'Cable Kickback', sets: 3, reps: '12-15', equipment: 'cable' },
    { name: 'Diamond Push-Ups', sets: 3, reps: '10-15', equipment: 'bodyweight' },
    { name: 'Bench Dips', sets: 3, reps: '10-15', equipment: 'bodyweight' },
    { name: 'Dumbbell Kickback', sets: 3, reps: '12-15', equipment: 'dumbbell' },
  ],
  Core: [
    { name: 'Plank', sets: 3, reps: '30-60s', equipment: 'bodyweight' },
    { name: 'Hanging Leg Raise', sets: 3, reps: '10-12', equipment: 'bodyweight' },
    { name: 'Cable Crunch', sets: 3, reps: '12-15', equipment: 'cable' },
    { name: 'Russian Twist', sets: 3, reps: '15-20', equipment: 'bodyweight' },
    { name: 'Ab Wheel Rollout', sets: 3, reps: '8-10', equipment: 'bodyweight' },
    { name: 'Side Plank', sets: 3, reps: '30-45s', equipment: 'bodyweight' },
  ],
};

// Stretches for a Flexibility session, keyed by the same muscle groups as
// the resistance library. "sets"/"reps" here mean hold-time reps (e.g. 3
// holds of 20-30s each), not weight training sets.
export const FLEXIBILITY_LIBRARY = {
  Chest: [
    { name: 'Doorway Chest Stretch', sets: 3, reps: '20-30s' },
    { name: 'Cross-Body Shoulder Stretch', sets: 2, reps: '20-30s' },
  ],
  Back: [
    { name: "Child's Pose", sets: 2, reps: '30-45s' },
    { name: 'Cat-Cow', sets: 3, reps: '8-10 reps' },
  ],
  Legs: [
    { name: 'Standing Quad Stretch', sets: 2, reps: '20-30s per side' },
    { name: 'Seated Hamstring Stretch', sets: 2, reps: '20-30s per side' },
    { name: 'Figure-4 Glute Stretch', sets: 2, reps: '20-30s per side' },
  ],
  Quadriceps: [
    { name: 'Standing Quad Stretch', sets: 2, reps: '20-30s per side' },
    { name: 'Couch Stretch', sets: 2, reps: '20-30s per side' },
  ],
  Hamstrings: [
    { name: 'Seated Hamstring Stretch', sets: 2, reps: '20-30s per side' },
    { name: 'Standing Toe Touch', sets: 2, reps: '20-30s' },
  ],
  Glutes: [
    { name: 'Figure-4 Glute Stretch', sets: 2, reps: '20-30s per side' },
    { name: 'Pigeon Pose', sets: 2, reps: '20-30s per side' },
  ],
  Shoulders: [
    { name: 'Overhead Triceps/Shoulder Stretch', sets: 2, reps: '20-30s per side' },
    { name: 'Wall Shoulder Slide', sets: 2, reps: '10-12 reps' },
  ],
  Biceps: [
    { name: 'Extended Arm Wall Stretch', sets: 2, reps: '20-30s per side' },
  ],
  Triceps: [
    { name: 'Overhead Triceps Stretch', sets: 2, reps: '20-30s per side' },
  ],
  Core: [
    { name: 'Cobra Stretch', sets: 2, reps: '20-30s' },
    { name: 'Seated Spinal Twist', sets: 2, reps: '20-30s per side' },
  ],
};

// Two stretches per muscle group, or one each when many groups are picked (keeps the session short).
export function generateFlexibilityPlan(muscleGroups, perGroup = muscleGroups.length > 3 ? 1 : 2) {
  const picked = [];
  const used = new Set(); // the same stretch can sit under two groups (Legs and Quadriceps); never twice in one workout
  for (const group of muscleGroups) {
    const pool = (FLEXIBILITY_LIBRARY[group] || []).filter((e) => !used.has(e.name));
    for (const ex of shuffle(pool).slice(0, perGroup)) {
      used.add(ex.name);
      picked.push({ ...ex, muscleGroup: group, type: 'flexibility', supersetId: null });
    }
  }
  return picked;
}

// Where a session happens, and what equipment is realistically available
// there. Falls back to the full pool for a muscle group if filtering would
// leave it empty, rather than suggesting nothing.
export const WORKOUT_LOCATIONS = ['The Great Outdoors', 'In the Home', 'At the Gym'];

// Two emoji flank each location label. The person-shaped one swaps to
// match the account's gender (Female/Male); anything else stays fixed.
// Falls back to the plain, non-gendered glyph when gender isn't set.
export function locationEmojis(location, gender) {
  const g = gender === 'Female' ? 'female' : gender === 'Male' ? 'male' : 'neutral';
  const pick = (neutral, female, male) => (g === 'female' ? female : g === 'male' ? male : neutral);
  switch (location) {
    case 'The Great Outdoors':
      return ['🌲', pick('🚵', '🚵‍♀️', '🚵‍♂️')];
    case 'In the Home':
      return [pick('🧘', '🧘‍♀️', '🧘‍♂️'), '🏡'];
    case 'At the Gym':
      return [pick('🏋️', '🏋️‍♀️', '🏋️‍♂️'), pick('⛹️', '⛹️‍♀️', '⛹️‍♂️')];
    default:
      return ['', ''];
  }
}

export const LOCATION_EQUIPMENT = {
  'The Great Outdoors': ['bodyweight'],
  'In the Home': ['bodyweight', 'dumbbell'],
  'At the Gym': ['bodyweight', 'dumbbell', 'barbell', 'machine', 'cable'],
};

export function filterByLocation(pool, location) {
  const allowed = LOCATION_EQUIPMENT[location];
  if (!allowed) return pool;
  const filtered = pool.filter((e) => !e.equipment || allowed.includes(e.equipment));
  return filtered.length > 0 ? filtered : pool;
}

// The three training styles a client can pick for a session. Each one
// overrides the library's default sets/reps target and how aggressively
// weight progresses between sessions.
export const TRAINING_STYLES = ['Strength', 'Hypertrophy', 'Endurance'];

export const STYLE_CONFIG = {
  Strength: { sets: 4, reps: '3-6', incrementMultiplier: 1.5, restSeconds: 150, blurb: 'Heavy loads, low reps, full recovery between sets.', nsca: '85%+ of your max · rest 2-5 min', suggest: '4–5 exercises · 3–5 × 3–6 · RPE 8–9' },
  Hypertrophy: { sets: 4, reps: '8-12', incrementMultiplier: 1, restSeconds: 90, blurb: 'Moderate reps, steady load progression, shorter rests.', nsca: '67-85% of your max · rest 30-90 sec', suggest: '5–6 exercises · 3–4 × 8–12 · RPE 7–9' },
  Endurance: { sets: 3, reps: '15-20', incrementMultiplier: 0.6, restSeconds: 45, blurb: 'Lighter loads, higher reps, minimal rest.', nsca: 'Under 67% of your max · rest under 30 sec', suggest: '4–6 exercises · 2–3 × 15–20 · RPE 6–8' },
};

// NSCA program-design convention: multi-joint compound lifts (squat,
// deadlift, press, row, pull-up...) are placed before single-joint
// accessory/isolation work (curls, extensions, flys, raises...), since
// they demand the most technique and energy and should be done while
// fresh.
const COMPOUND_PATTERN = /Squat|Deadlift|Press|Push-Up|Row|Pulldown|Pull-Up|Chin-Up|Dip|Hip Thrust|Lunge|Step-Up|Good Morning/i;
function isCompound(name) {
  return COMPOUND_PATTERN.test(name);
}

const MAX_EXERCISES = 6;

// A leg day with no squat/leg-press variation anywhere in it is missing
// the single most load-bearing lower-body movement — guaranteed below
// rather than left to chance shuffling.
const LEG_GROUPS = ['Legs', 'Quadriceps']; // a glutes- or hamstrings-only day doesn't need a squat forced in
const SQUAT_PATTERN = /Squat|Leg Press/i;
function ensureSquatVariation(final, muscleGroups, style, location, recentNames, exclude = []) {
  if (!muscleGroups.some((g) => LEG_GROUPS.includes(g))) return final;
  if (final.some((ex) => SQUAT_PATTERN.test(ex.name))) return final;
  const styleConfig = STYLE_CONFIG[style] || {};
  for (const group of LEG_GROUPS) {
    if (!muscleGroups.includes(group)) continue;
    const pool = filterByLocation(EXERCISE_LIBRARY[group] || [], location).filter((e) => SQUAT_PATTERN.test(e.name) && !exclude.includes(e.name));
    if (pool.length === 0) continue;
    const pick = pool.find((e) => !recentNames.includes(e.name)) || pool[0];
    const added = { ...pick, muscleGroup: group, sets: styleConfig.sets ?? pick.sets, reps: holdReps(pick) ?? styleConfig.reps ?? pick.reps };
    // Bump the lowest-priority pick (the list is already sorted
    // barbell-compound-first) rather than growing past MAX_EXERCISES.
    return [...final.slice(0, -1), added];
  }
  return final;
}

// The exercise each muscle group's session should default to leading
// with — the single most load-bearing, technically-demanding lift for
// that group, done first while fresh. Back depends on gender: Pull-Ups
// are the default, Lat Pulldown the equivalent machine-assisted version.
const ANCHOR_EXERCISES = {
  Chest: () => 'Barbell Bench Press',
  Legs: () => 'Barbell Back Squat',
  Back: (gender) => (gender === 'Female' ? 'Lat Pulldown' : 'Pull-Ups'),
};

// Strength work repeats its main lifts on purpose. For hypertrophy and endurance the anchor lift takes turns:
// if it was in the last workout, a different lift for that muscle leads this time (it returns the next session).
function ensureAnchors(final, muscleGroups, gender, style, location, recentNames = [], exclude = []) {
  const styleConfig = STYLE_CONFIG[style] || {};
  let result = final;
  const keep = new Set(muscleGroups.map((g) => ANCHOR_EXERCISES[g]?.(gender)).filter(Boolean));
  for (const group of muscleGroups) {
    const anchorFn = ANCHOR_EXERCISES[group];
    if (!anchorFn) continue;
    const anchorName = anchorFn(gender);
    if (exclude.includes(anchorName)) continue; // sore or injured: never forced in
    if (result.some((ex) => ex.name === anchorName)) continue;
    if (style !== 'Strength' && recentNames.includes(anchorName)) continue;
    const pick = filterByLocation(EXERCISE_LIBRARY[group] || [], location).find((e) => e.name === anchorName);
    if (!pick) continue; // not available at this location (e.g. no pull-up bar outdoors)
    const added = { ...pick, muscleGroup: group, sets: styleConfig.sets ?? pick.sets, reps: holdReps(pick) ?? styleConfig.reps ?? pick.reps };
    // Bump the lowest-priority pick rather than growing past MAX_EXERCISES, but never another anchor lift
    // or the squat variation (otherwise each anchor added would push out the one before it).
    // Prefer dropping from a muscle that has two or more picks, so no muscle loses its only exercise.
    const perMuscle = {};
    result.forEach((ex) => { perMuscle[ex.muscleGroup] = (perMuscle[ex.muscleGroup] || 0) + 1; });
    const droppable = (ex) => !keep.has(ex.name) && !SQUAT_PATTERN.test(ex.name);
    let drop = -1;
    for (let i = result.length - 1; i >= 0; i -= 1) {
      if (droppable(result[i]) && perMuscle[result[i].muscleGroup] > 1) { drop = i; break; }
    }
    if (drop < 0) for (let i = result.length - 1; i >= 0; i -= 1) { if (droppable(result[i])) { drop = i; break; } }
    result = drop >= 0 ? [...result.slice(0, drop), ...result.slice(drop + 1), added] : [...result, added];
  }
  return result;
}

// Picks `count` exercises per selected muscle group, preferring ones not
// in `recentNames` (last workout's picks) so back-to-back sessions don't
// look identical — falls back to repeats only if a group runs out of
// fresh options. Sets/reps on each pick are overridden by the chosen
// training style rather than the library's default. The final list is
// then stably sorted compound-first (see COMPOUND_PATTERN above),
// preserving the muscle-group order otherwise.
// Holds (Plank, Wall Sit) are timed ("30-60s"), so a training style's rep range doesn't apply to them.
export const holdReps = (ex) => (/\d\s*s\b/i.test(String(ex?.reps || '')) ? ex.reps : null);

export function generateWorkout(muscleGroups, style, recentNames = [], location = null, perGroup = 2, gender = null, exclude = []) {
  const styleConfig = STYLE_CONFIG[style] || {};
  const picked = [];
  // Some movements (Romanian Deadlift, Bulgarian Split Squat...) are
  // listed under more than one muscle group on purpose, so two different
  // groups can otherwise both pick the exact same exercise into one
  // workout — a duplicate name, which breaks name-keyed UI state (the
  // active/collapsed exercise cards) downstream. Track what's already
  // picked and skip repeats.
  const usedNames = new Set();
  const lists = muscleGroups.map((group) => {
    const pool = filterByLocation(EXERCISE_LIBRARY[group] || [], location).filter((e) => !exclude.includes(e.name));
    const fresh = pool.filter((e) => !recentNames.includes(e.name));
    // recentNames runs most recent first, so when a muscle runs out of fresh options the one
    // done longest ago comes back first.
    const stale = pool.filter((e) => recentNames.includes(e.name)).sort((a, b) => recentNames.indexOf(b.name) - recentNames.indexOf(a.name));
    return { group, ordered: [...shuffle(fresh), ...stale], at: 0 };
  });
  // Round-robin: every muscle gets its first exercise before any muscle gets a second, so a short
  // session still covers each muscle (arms and core don't get squeezed out by extra chest and back).
  // A single-muscle day needs about five exercises and a two-muscle day six (ACSM/NSCA: several exercises and 2-4 sets
  // per major muscle group), so keep going round after round until that many are picked or the lists run dry.
  const target = Math.min(MAX_EXERCISES, Math.max(perGroup * muscleGroups.length, muscleGroups.length === 1 ? 5 : muscleGroups.length === 2 ? 6 : 0));
  for (let round = 0; round < 8 && picked.length < target; round += 1) {
    for (const l of lists) {
      if (picked.length >= target) break;
      while (l.at < l.ordered.length && usedNames.has(l.ordered[l.at].name)) l.at += 1;
      const ex = l.ordered[l.at];
      if (!ex) continue;
      l.at += 1;
      usedNames.add(ex.name);
      picked.push({ ...ex, muscleGroup: l.group, sets: styleConfig.sets ?? ex.sets, reps: holdReps(ex) ?? styleConfig.reps ?? ex.reps });
    }
  }
  // Each targeted group's anchor lift (see ANCHOR_EXERCISES) outranks
  // everything else — that's what "defaults to starting with X" means —
  // then barbell compounds, then other compounds, then isolation.
  const anchorNames = new Set(
    muscleGroups.map((g) => ANCHOR_EXERCISES[g]?.(gender)).filter(Boolean)
  );
  const tier = (ex) => (anchorNames.has(ex.name) ? 3 : ex.equipment === 'barbell' ? 2 : isCompound(ex.name) ? 1 : 0);
  const ordered = picked
    .map((ex, i) => ({ ex, i }))
    .sort((a, b) => (tier(b.ex) - tier(a.ex)) || (a.i - b.i))
    .map(({ ex }) => ex);
  // A 10-exercise session runs too long — 6 keeps the heaviest/most
  // important lifts (already sorted to the front) and trims the rest.
  const capped = ordered.slice(0, MAX_EXERCISES);
  const withSquat = ensureSquatVariation(capped, muscleGroups, style, location, recentNames, exclude);
  const withAnchors = ensureAnchors(withSquat, muscleGroups, gender, style, location, recentNames, exclude);
  return withAnchors
    .map((ex, i) => ({ ex, i }))
    .sort((a, b) => (tier(b.ex) - tier(a.ex)) || (a.i - b.i))
    .map(({ ex }) => ex);
}

function parseRepRange(repsStr) {
  const match = String(repsStr).match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return [null, null];
  return [Number(match[1]), Number(match[2])];
}

// A simple, style-aware progression rule, not a real algorithm: hit the
// top of your rep range → nudge weight up next time; miss the bottom →
// back off or hold; land in range → repeat the same weight for another
// clean set before adding load. Bigger, multi-joint lifts get a bigger
// jump than isolation/curl-type movements, and Power sessions push
// harder per jump than Endurance ones. `daysSince` (time since that last
// logged set) scales the jump further — a long layoff backs the
// suggestion off toward "match last time" rather than pushing more load
// on stale form, while a same-week repeat progresses at full strength.
export function suggestNextWeight(exercise, lastSet, style, daysSince = null) {
  if (!lastSet || lastSet.weight == null || lastSet.reps == null) return null;
  const [lo, hi] = parseRepRange(exercise.reps);
  // Compound barbell-type lifts jump by a real plate increment (5 lb a
  // side); isolation/dumbbell work jumps smaller — but either way, the
  // final number always lands on a multiple of 5. Rounding only the
  // increment (not the result) let fractional weights compound over
  // time into odd suggestions like 77.5 lb.
  const baseIncrement = isCompound(exercise.name) ? 10 : 5;
  const styleMultiplier = STYLE_CONFIG[style]?.incrementMultiplier ?? 1;
  const roundToFive = (n) => Math.round(n / 5) * 5;

  // Been away a while — don't push added load onto detrained form.
  const longLayoff = daysSince != null && daysSince > 21;
  const increment = Math.max(5, roundToFive(baseIncrement * styleMultiplier * (longLayoff ? 0.5 : 1)));
  const lastWeight = roundToFive(lastSet.weight);

  if (hi == null) return { weight: lastWeight, note: 'Match last time' };

  if (longLayoff) {
    return {
      weight: lastWeight,
      note: `It's been ${daysSince} days — start back at your last weight and see how it feels`,
    };
  }
  if (lastSet.reps >= hi) {
    return { weight: lastWeight + increment, note: `Hit ${lastSet.reps} last time — try +${increment} lb` };
  }
  if (lastSet.reps < lo) {
    return { weight: Math.max(0, lastWeight - increment), note: `Came up short last time — try -${increment} lb` };
  }
  return { weight: lastWeight, note: 'In range — repeat this weight for one more clean set' };
}

// A handful of dynamic (movement-based, not static-hold) drills per
// muscle group, to raise tissue temperature and rehearse the day's
// movement patterns before the first working set — not the same as the
// static FLEXIBILITY_LIBRARY stretches, which are for after/during.
export const DYNAMIC_WARMUP_LIBRARY = {
  Chest: ['Arm Circles', 'Band Pull-Aparts', 'Scapular Push-Ups'],
  Back: ['Band Pull-Aparts', 'Scapular Pulls', 'Cat-Cow'],
  Shoulders: ['Arm Circles', 'Band Pull-Aparts', 'Shoulder Rolls'],
  Biceps: ['Arm Circles', 'Band Pull-Aparts'],
  Triceps: ['Arm Circles', "Downward Dog to Cobra"],
  Legs: ['Leg Swings', 'Walking Lunges', 'Bodyweight Squats'],
  Quadriceps: ['Leg Swings', 'Bodyweight Squats', "World's Greatest Stretch"],
  Hamstrings: ['Leg Swings', "World's Greatest Stretch", 'Walking Lunges'],
  Glutes: ['Glute Bridges', 'Fire Hydrants', 'Walking Lunges'],
  Core: ['Cat-Cow', 'Torso Twists', 'Bird Dogs'],
};

// Picks 2-3 distinct drills covering the targeted muscle groups, in
// group order, rather than every group's own full set — a leg day
// doesn't need six different drills, just enough to get moving.
export function generateDynamicWarmup(muscleGroups) {
  const drills = [];
  for (const group of muscleGroups) {
    for (const name of DYNAMIC_WARMUP_LIBRARY[group] || []) {
      if (!drills.includes(name)) drills.push(name);
      if (drills.length >= 3) return drills;
    }
  }
  return drills.slice(0, 3);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Short, readable session title: collapses a full region or bundle back
// into its name, so "Whole Body" doesn't read as eleven muscle groups.
export function workoutTitle(muscleGroups = [], activities = []) {
  let rest = [...muscleGroups];
  const names = [];
  const take = (name, group) => {
    if (group.every((g) => rest.includes(g))) { names.push(name); rest = rest.filter((g) => !group.includes(g)); }
  };
  take('Whole Body', BODY_REGION_GROUPS['Whole Body']);
  take('Upper Body', BODY_REGION_GROUPS['Upper Body']);
  take('Lower Body', BODY_REGION_GROUPS['Lower Body']);
  take('Legs', LEGS_BUNDLE);
  take('Arms', ARMS_BUNDLE);
  return [...names, ...rest, ...activities].join(' + ') || 'Workout';
}

export function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

// "Anything sore or not feeling right?" before a suggested lifting workout. Each area lists the kinds of
// movement that load it hardest; those exercises are left out of the suggestion for that day.
export const BODY_AREAS = [
  { id: 'neck', label: 'Neck' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'elbows', label: 'Elbows / wrists' },
  { id: 'upper_back', label: 'Upper back' },
  { id: 'lower_back', label: 'Lower back' },
  { id: 'hips', label: 'Hips' },
  { id: 'knees', label: 'Knees' },
  { id: 'ankles', label: 'Ankles / feet' },
];
const AREA_AVOID = {
  neck: /Shrug|Overhead|Pull-Ups|Chin-Ups|Upright|Face Pull/i,
  shoulders: /Overhead|Shoulder Press|Military|Arnold|Incline.*Press|Decline.*Press|Landmine|Dips|Pike|Handstand|Raise|Upright|Pull-Ups|Chin-Ups|Pullover|Fly/i,
  elbows: /(Barbell|Dumbbell|Hammer|Cable|Preacher|Concentration|EZ) Curl|Pushdown|Tricep|Skull|Dips|Push-Up|Close-Grip|Kickback|Pull-Ups|Chin-Ups/i,
  upper_back: /Row|Pull-Ups|Chin-Ups|Pulldown|Pullover|Shrug|Face Pull|Rear Delt|Reverse Fly/i,
  lower_back: /Deadlift|Good Morning|Barbell Row|Bent|Back Squat|Front Squat|Goblet Squat|Back Extension|Hyperextension|Romanian|Overhead Press|Arnold|Seated Cable Row|Hanging Leg|Russian Twist|Ab Wheel|Bulgarian|Walking Lunges/i,
  hips: /Squat|Lunge|Step-Up|Hip Thrust|Deadlift|Abduction|Glute/i,
  knees: /Squat|Wall Sit|Lunge|Step-Up|Leg Press|Leg Extension|Jump|Nordic|Sissy/i,
  ankles: /Jump|Lunge|Step-Up|Calf|Skip|Sprint|Box|Bulgarian|Handstand/i,
};
export function avoidForAreas(areaIds = []) {
  const res = areaIds.map((id) => AREA_AVOID[id]).filter(Boolean);
  if (res.length === 0) return [];
  const names = new Set();
  Object.values(EXERCISE_LIBRARY).forEach((list) => list.forEach((e) => { if (res.some((re) => re.test(e.name))) names.add(e.name); }));
  return [...names];
}

// Shorten a long workout title ("Chest + Back + Legs + Core") to its first two items and a +N, keeping the order the
// muscles were chosen in (the ones that were prioritized come first).
export function shortWorkoutTitle(title) {
  const items = String(title || '').split(' + ');
  return items.length > 2 ? `${items[0]} + ${items[1]} +${items.length - 2}` : String(title || '');
}

// Foam rolling lives under Flexibility. Picking one of the three regions builds a short roll-through (slow passes,
// pausing on tender spots); with Clean slate it is just a timed Foam Rolling entry.
const ROLLS = {
  upperBack: { name: 'Foam Roll: Upper Back', muscleGroup: 'Back', sets: 1, reps: '30-60s' },
  lats: { name: 'Foam Roll: Lats', muscleGroup: 'Back', sets: 1, reps: '30-60s per side' },
  pecs: { name: 'Foam Roll: Chest', muscleGroup: 'Chest', sets: 1, reps: '30-60s per side' },
  rearShoulder: { name: 'Foam Roll: Rear Shoulder', muscleGroup: 'Shoulders', sets: 1, reps: '30-45s per side' },
  calves: { name: 'Foam Roll: Calves', muscleGroup: 'Legs', sets: 1, reps: '30-60s per side' },
  hamstrings: { name: 'Foam Roll: Hamstrings', muscleGroup: 'Hamstrings', sets: 1, reps: '30-60s per side' },
  quads: { name: 'Foam Roll: Quads', muscleGroup: 'Quadriceps', sets: 1, reps: '30-60s per side' },
  glutes: { name: 'Foam Roll: Glutes', muscleGroup: 'Glutes', sets: 1, reps: '30-60s per side' },
  lowerBack: { name: 'Foam Roll: Lower Back', muscleGroup: 'Back', sets: 1, reps: '30-45s' },
  itBand: { name: 'Foam Roll: Outer Thigh', muscleGroup: 'Legs', sets: 1, reps: '30-45s per side' },
  adductors: { name: 'Foam Roll: Inner Thigh', muscleGroup: 'Legs', sets: 1, reps: '30-45s per side' },
};
const FOAM_PLANS = {
  'Foam Roll: Upper Body': ['upperBack', 'lats', 'pecs', 'rearShoulder'],
  'Foam Roll: Lower Body': ['calves', 'hamstrings', 'quads', 'itBand', 'adductors', 'glutes', 'lowerBack'],
  'Foam Roll: Full Body': ['calves', 'hamstrings', 'quads', 'glutes', 'lowerBack', 'upperBack', 'lats', 'pecs'],
};
export const isFoamRegion = (name) => Object.prototype.hasOwnProperty.call(FOAM_PLANS, name);
// Rolls in a sensible order (feet up the body), skipping any already in the list.
export function generateFoamRollPlan(regionName, used = new Set()) {
  return (FOAM_PLANS[regionName] || []).map((k) => ROLLS[k]).filter((r) => !used.has(r.name)).map((r) => { used.add(r.name); return { ...r, type: 'flexibility', supersetId: null }; });
}

// How-to for each roll, shown from the (i) on a roll's card. Short on purpose: set up, move, what to watch.
export const ROLL_GUIDES = {
  'Foam Roll: Upper Back': { setup: 'Lie on your back with the roller across your upper back, just under your shoulder blades. Cross your arms over your chest or hold your head, and lift your hips.', move: 'Use your feet to roll slowly up toward your shoulders, a few inches at a time.', watch: 'Stay above your low back and keep your chin tucked. Skip your neck.' },
  'Foam Roll: Lats': { setup: 'Lie on your side with the roller under your armpit area and your bottom arm reaching overhead.', move: 'Roll slowly between your armpit and the middle of your ribs, turning a little toward your chest and back.', watch: 'Keep it moderate. This spot is often tender.' },
  'Foam Roll: Chest': { setup: 'Lie face down with the roller under the front of one shoulder and that arm out to the side, palm down.', move: 'Roll very slightly up and down, and turn your body a little to find tight spots.', watch: 'Stay on the muscle, not the collarbone or shoulder joint.' },
  'Foam Roll: Rear Shoulder': { setup: 'Lie on your side with the roller behind your shoulder, arm hugged across your chest.', move: 'Make small rolls along the back of the shoulder and shoulder blade edge.', watch: 'Small, gentle movements. Avoid pressing on the joint itself.' },
  'Foam Roll: Calves': { setup: 'Sit with the roller under your calves, hands behind you, and lift your hips. Cross the other leg on top for more pressure.', move: 'Roll from just above your ankle to just below your knee. Turn your toes in and out to reach every side.', watch: 'Skip the back of the knee and the Achilles tendon.' },
  'Foam Roll: Hamstrings': { setup: 'Sit with the roller under your thighs, hands behind you, and lift your hips. Cross legs for more pressure.', move: 'Roll from just above your knee up toward your sit bones.', watch: 'Stay off the back of the knee and the bony part under your butt.' },
  'Foam Roll: Quads': { setup: 'Lie face down on your forearms with the roller under your thighs, like a plank.', move: 'Roll from just above your knee up to the top of your thigh. Turn slightly in and out to catch the sides.', watch: 'Stay off the kneecap and the hip bone. Ease up if the area near your knee is sore.' },
  'Foam Roll: Outer Thigh': { setup: 'Lie on your side with the roller under the side of your thigh. Put your top foot on the floor in front for support.', move: 'Roll from your hip down to just above your knee, using your arms and top foot to control pressure.', watch: 'This one is tender. Use light pressure and stay off the knee.' },
  'Foam Roll: Inner Thigh': { setup: 'Lie face down with one leg bent out to the side and the roller along your inner thigh.', move: 'Roll gently from just above the knee toward the groin and back.', watch: 'Stay off the groin and knee. Keep pressure light.' },
  'Foam Roll: Lower Back': { setup: 'Lie on your back with the roller across your lower back, just above your hips, knees bent and hands crossed on your chest.', move: 'Lift your hips slightly and rock a few inches up and down, using your feet to control the pressure.', watch: 'Keep the pressure light and your core braced. Stop if you feel pinching or nerve-like pain. Rolling your glutes and hips often eases low back tightness more safely.' },
  'Foam Roll: Glutes': { setup: 'Sit on the roller with one ankle crossed over the opposite knee. Lean toward the crossed-leg side.', move: 'Roll in small lengths across the glute, from the top of the hip to the sit bone.', watch: 'Keep your low back relaxed and skip the tailbone.' },
};
export const ROLL_RULES = [
  'Roll slowly, about an inch per second, and breathe.',
  'When you find a tender spot, pause on it for 20 to 30 seconds.',
  'Mild to moderate discomfort is normal. Sharp pain, numbness or tingling means stop.',
  'Skip joints, your low back, your neck and any bruised or injured area.',
];

// Grip / handle / bar choices for exercises where it matters. Stored on each logged set (its `distance` column,
// which resistance sets don't otherwise use), so the weights and "Last" still follow the exercise as a whole.
// `perSet` exercises (Pull-Ups) pick a variation for every set; the others pick once and keep it for the workout.
const GRIPS = ['Wide', 'Neutral', 'Close'];
export const VARIATIONS = {
  'Lat Pulldown': { label: 'Grip', options: [...GRIPS, 'Underhand'] },
  'Pull-Ups': { label: 'Grip', options: GRIPS, perSet: true },
  'Chin-Up (underhand)': { label: 'Grip', options: GRIPS },
  'Barbell Row': { label: 'Grip', options: ['Overhand', 'Underhand', 'Neutral'] },
  'Seated Cable Row': { label: 'Grip', options: ['Overhand', 'Underhand', 'Neutral'] },
  'Barbell Curl': { label: 'Grip', options: ['Standard', 'Wide', 'Close', 'Reverse'] },
  'Cable Curl': { label: 'Grip', options: ['Standard', 'Wide', 'Close', 'Reverse'] },
  'Preacher Curl': { label: 'Grip', options: ['Standard', 'Wide', 'Close', 'Reverse'] },
  'Tricep Pushdown': { label: 'Handle', options: ['Straight Bar', 'Rope', 'V-Bar', 'Single Arm'] },
  'Overhead Tricep Extension': { label: 'Handle', options: ['Dumbbell', 'Rope', 'Straight Bar', 'Single Arm'] },
  'Skull Crusher': { label: 'Bar', options: ['EZ Bar', 'Straight Bar', 'Dumbbells'] },
  'Barbell Back Squat': { label: 'Bar', options: ['High Bar', 'Low Bar'] },
};
export const variationFor = (name) => VARIATIONS[name] || null;

// A first lifting session keeps to simple, forgiving moves: no barbell lifts, dips, hangs or other technical exercises.
const BEGINNER_AVOID = /Barbell|Deadlift|Front Squat|Dips|Pull-Ups|Chin-Up|Handstand|Pike|Nordic|Skull|Bulgarian|Arnold|Ab Wheel|Hanging|Walking Lunges|Step-Up|Pullover|Overhead Press|Close-Grip|Diamond|Deficit|Fly|Incline/i;
export function beginnerAvoid() {
  const names = new Set();
  Object.values(EXERCISE_LIBRARY).forEach((list) => list.forEach((e) => { if (BEGINNER_AVOID.test(e.name)) names.add(e.name); }));
  return [...names];
}
// The "New to lifting? Start here" session, shaped like a program session so Move builds it the same way.
export const STARTER_SESSION = {
  id: 'starter', kind: 'resistance', name: 'Full Body', shortName: 'Full Body', groups: ['Chest', 'Back', 'Legs', 'Shoulders', 'Core'], style: 'Hypertrophy', label: '',
  presc: { sets: 2, reps: '10-12', rpe: '6', rest: '60-90 sec' }, acc: null, exercises: 5, mainCount: 0, phase: 'Build', starter: true,
};

// Rolls for the muscles someone picked (Legs means the whole lower body), in a sensible feet-to-head order, at most 8.
const FOAM_ORDER = ['calves', 'hamstrings', 'quads', 'itBand', 'adductors', 'glutes', 'lowerBack', 'upperBack', 'lats', 'pecs', 'rearShoulder'];
const FOAM_GROUPS = {
  calves: ['Legs'], hamstrings: ['Hamstrings', 'Legs'], quads: ['Quadriceps', 'Legs'], itBand: ['Quadriceps', 'Legs'], adductors: ['Quadriceps', 'Legs'],
  glutes: ['Glutes', 'Legs'], lowerBack: ['Back'], upperBack: ['Back'], lats: ['Back'], pecs: ['Chest'], rearShoulder: ['Shoulders'],
};
export function generateFoamRollsForGroups(groups, used = new Set()) {
  const wanted = new Set(groups);
  return FOAM_ORDER.filter((k) => FOAM_GROUPS[k].some((g) => wanted.has(g)))
    .map((k) => ROLLS[k])
    .filter((r) => !used.has(r.name))
    .slice(0, 9)
    .map((r) => { used.add(r.name); return { ...r, type: 'flexibility', supersetId: null }; });
}
