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
];

// What kind of flexibility work, selected alongside which muscle groups
// to target — logged as its own timed entry (like an aerobic activity)
// in addition to the muscle-group-driven stretch plan.
export const FLEXIBILITY_ACTIVITIES = [
  'Static Stretching', 'Dynamic Stretching', 'Yoga', 'Pilates', 'Mobility Work', 'Foam Rolling',
];

// Each exercise is tagged with the equipment it needs, so the plan can be
// narrowed down based on where the session happens (see LOCATION_EQUIPMENT
// below) instead of always suggesting a full gym's worth of machines.
export const EXERCISE_LIBRARY = {
  Chest: [
    { name: 'Barbell Bench Press', sets: 4, reps: '8-10', equipment: 'barbell' },
    { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', equipment: 'dumbbell' },
    { name: 'Deficit Push-Ups', sets: 3, reps: '12-15', equipment: 'bodyweight' }, // hands elevated on blocks/plates for extra stretch — big ROM
    { name: 'Dumbbell Fly', sets: 3, reps: '12-15', equipment: 'dumbbell' },
    { name: 'Dumbbell Chest Press', sets: 4, reps: '10-12', equipment: 'dumbbell' },
    { name: 'Dips', sets: 3, reps: '10-15', equipment: 'bodyweight' },
  ],
  Back: [
    { name: 'Pull-Ups', sets: 4, reps: '8-10', equipment: 'bodyweight' },
    { name: 'Barbell Row', sets: 4, reps: '8-10', equipment: 'barbell' },
    { name: 'Lat Pulldown', sets: 3, reps: '10-12', equipment: 'machine' },
    { name: 'Straight-Arm Pulldown', sets: 3, reps: '12-15', equipment: 'cable' }, // long lat stretch overhead
    { name: 'Dumbbell Pullover', sets: 3, reps: '10-12', equipment: 'dumbbell' },     // big overhead ROM
    { name: 'Single-Arm Dumbbell Row', sets: 3, reps: '10-12', equipment: 'dumbbell' },
  ],
  Legs: [
    { name: 'Barbell Back Squat', sets: 4, reps: '8-10', equipment: 'barbell' },
    { name: 'Romanian Deadlift', sets: 3, reps: '10-12', equipment: 'barbell' },
    { name: 'Bulgarian Split Squat', sets: 3, reps: '10-12', equipment: 'dumbbell' }, // deep single-leg stretch
    { name: 'Walking Lunges', sets: 3, reps: '10-12', equipment: 'bodyweight' },
    { name: 'Leg Press (deep)', sets: 4, reps: '10-15', equipment: 'machine' },
    { name: 'Bodyweight Squat', sets: 4, reps: '15-20', equipment: 'bodyweight' },
  ],
  Quadriceps: [
    { name: 'Front Squat', sets: 4, reps: '8-10', equipment: 'barbell' },
    { name: 'Leg Extension', sets: 3, reps: '12-15', equipment: 'machine' },
    { name: 'Goblet Squat', sets: 3, reps: '10-15', equipment: 'dumbbell' },
    { name: 'Step-Ups', sets: 3, reps: '10-12', equipment: 'bodyweight' },
  ],
  Hamstrings: [
    { name: 'Leg Curl', sets: 3, reps: '10-15', equipment: 'machine' },
    { name: 'Romanian Deadlift', sets: 3, reps: '10-12', equipment: 'barbell' },
    { name: 'Nordic Curl (assisted)', sets: 3, reps: '6-10', equipment: 'bodyweight' },
    { name: 'Good Morning', sets: 3, reps: '10-12', equipment: 'barbell' },
  ],
  Glutes: [
    { name: 'Hip Thrust', sets: 4, reps: '8-12', equipment: 'barbell' },
    { name: 'Single-Leg Glute Bridge', sets: 3, reps: '12-15', equipment: 'bodyweight' },
    { name: 'Cable Kickback', sets: 3, reps: '12-15', equipment: 'cable' },
    { name: 'Bulgarian Split Squat', sets: 3, reps: '10-12', equipment: 'dumbbell' },
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

export function generateFlexibilityPlan(muscleGroups, perGroup = 2) {
  const picked = [];
  for (const group of muscleGroups) {
    const pool = FLEXIBILITY_LIBRARY[group] || [];
    for (const ex of shuffle(pool).slice(0, perGroup)) {
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
      return ['🏂', pick('🚵', '🚵‍♀️', '🚵‍♂️')];
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
  Strength: { sets: 4, reps: '3-6', incrementMultiplier: 1.5, restSeconds: 150, blurb: 'Heavy loads, low reps, full recovery between sets.' },
  Hypertrophy: { sets: 4, reps: '8-12', incrementMultiplier: 1, restSeconds: 90, blurb: 'Moderate reps, steady load progression, shorter rests.' },
  Endurance: { sets: 3, reps: '15-20', incrementMultiplier: 0.6, restSeconds: 45, blurb: 'Lighter loads, higher reps, minimal rest.' },
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

// Picks `count` exercises per selected muscle group, preferring ones not
// in `recentNames` (last workout's picks) so back-to-back sessions don't
// look identical — falls back to repeats only if a group runs out of
// fresh options. Sets/reps on each pick are overridden by the chosen
// training style rather than the library's default. The final list is
// then stably sorted compound-first (see COMPOUND_PATTERN above),
// preserving the muscle-group order otherwise.
export function generateWorkout(muscleGroups, style, recentNames = [], location = null, perGroup = 2) {
  const styleConfig = STYLE_CONFIG[style] || {};
  const picked = [];
  for (const group of muscleGroups) {
    const pool = filterByLocation(EXERCISE_LIBRARY[group] || [], location);
    const fresh = pool.filter((e) => !recentNames.includes(e.name));
    const stale = pool.filter((e) => recentNames.includes(e.name));
    const ordered = [...shuffle(fresh), ...shuffle(stale)];
    for (const ex of ordered.slice(0, perGroup)) {
      picked.push({
        ...ex,
        muscleGroup: group,
        sets: styleConfig.sets ?? ex.sets,
        reps: styleConfig.reps ?? ex.reps,
      });
    }
  }
  return picked
    .map((ex, i) => ({ ex, i }))
    .sort((a, b) => (isCompound(b.ex.name) - isCompound(a.ex.name)) || (a.i - b.i))
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
  const baseIncrement = /Squat|Deadlift|Press|Row|Pulldown/.test(exercise.name) ? 5 : 2.5;
  const styleMultiplier = STYLE_CONFIG[style]?.incrementMultiplier ?? 1;

  // Been away a while — don't push added load onto detrained form.
  const longLayoff = daysSince != null && daysSince > 21;
  const roundToHalf = (n) => Math.round(n * 2) / 2;
  const increment = roundToHalf(baseIncrement * styleMultiplier * (longLayoff ? 0.5 : 1));

  if (hi == null) return { weight: lastSet.weight, note: 'Match last time' };

  if (longLayoff) {
    return {
      weight: lastSet.weight,
      note: `It's been ${daysSince} days — start back at your last weight and see how it feels`,
    };
  }
  if (lastSet.reps >= hi) {
    return { weight: lastSet.weight + increment, note: `Hit ${lastSet.reps} last time — try +${increment} lb` };
  }
  if (lastSet.reps < lo) {
    return { weight: Math.max(0, lastSet.weight - increment), note: `Came up short last time — try -${increment} lb` };
  }
  return { weight: lastSet.weight, note: 'In range — repeat this weight for one more clean set' };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
