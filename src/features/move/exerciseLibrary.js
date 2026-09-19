// A small curated exercise library, grouped by muscle group. Real
// recommendation engines (Fitbod included) draw from thousands of
// exercises with equipment/injury filters — this is a deliberately
// simple starting point: enough variety per muscle group to generate a
// different workout each time without repeating last session's picks.
export const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps', 'Core'];

export const EXERCISE_LIBRARY = {
  Chest: [
    { name: 'Barbell Bench Press', sets: 4, reps: '8-10' },
    { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12' },
    { name: 'Deficit Push-Ups', sets: 3, reps: '12-15' }, // hands elevated on blocks/plates for extra stretch — big ROM
    { name: 'Dumbbell Fly', sets: 3, reps: '12-15' },
    { name: 'Dumbbell Chest Press', sets: 4, reps: '10-12' },
    { name: 'Dips', sets: 3, reps: '10-15' },
  ],
  Back: [
    { name: 'Pull-Ups', sets: 4, reps: '8-10' },
    { name: 'Barbell Row', sets: 4, reps: '8-10' },
    { name: 'Lat Pulldown', sets: 3, reps: '10-12' },
    { name: 'Straight-Arm Pulldown', sets: 3, reps: '12-15' }, // long lat stretch overhead
    { name: 'Dumbbell Pullover', sets: 3, reps: '10-12' },     // big overhead ROM
    { name: 'Single-Arm Dumbbell Row', sets: 3, reps: '10-12' },
  ],
  Legs: [
    { name: 'Barbell Back Squat', sets: 4, reps: '8-10' },
    { name: 'Romanian Deadlift', sets: 3, reps: '10-12' },
    { name: 'Bulgarian Split Squat', sets: 3, reps: '10-12' }, // deep single-leg stretch
    { name: 'Walking Lunges', sets: 3, reps: '10-12' },
    { name: 'Leg Press (deep)', sets: 4, reps: '10-15' },
    { name: 'Leg Curl', sets: 3, reps: '10-15' },
  ],
  Shoulders: [
    { name: 'Overhead Press', sets: 4, reps: '6-8' },
    { name: 'Lateral Raise', sets: 3, reps: '12-15' },
    { name: 'Face Pull', sets: 3, reps: '12-15' },
    { name: 'Arnold Press', sets: 3, reps: '8-10' },
    { name: 'Front Raise', sets: 3, reps: '10-12' },
    { name: 'Rear Delt Fly', sets: 3, reps: '12-15' },
  ],
  Biceps: [
    { name: 'Barbell Curl', sets: 3, reps: '8-12' },
    { name: 'Incline Dumbbell Curl', sets: 3, reps: '10-15' }, // deep stretch at the bottom — good ROM pick
    { name: 'Hammer Curl', sets: 3, reps: '10-12' },
    { name: 'Concentration Curl', sets: 3, reps: '10-15' },
    { name: 'Cable Curl', sets: 3, reps: '12-15' },
    { name: 'Preacher Curl', sets: 3, reps: '10-12' },
  ],
  Triceps: [
    { name: 'Tricep Pushdown', sets: 3, reps: '10-15' },
    { name: 'Skull Crusher', sets: 3, reps: '8-12' },
    { name: 'Overhead Tricep Extension', sets: 3, reps: '10-15' }, // long stretch overhead — good ROM pick
    { name: 'Close-Grip Bench Press', sets: 3, reps: '8-10' },
    { name: 'Dips', sets: 3, reps: '8-12' },
    { name: 'Cable Kickback', sets: 3, reps: '12-15' },
  ],
  Core: [
    { name: 'Plank', sets: 3, reps: '30-60s' },
    { name: 'Hanging Leg Raise', sets: 3, reps: '10-12' },
    { name: 'Cable Crunch', sets: 3, reps: '12-15' },
    { name: 'Russian Twist', sets: 3, reps: '15-20' },
    { name: 'Ab Wheel Rollout', sets: 3, reps: '8-10' },
    { name: 'Side Plank', sets: 3, reps: '30-45s' },
  ],
};

// The three training styles a client can pick for a session. Each one
// overrides the library's default sets/reps target and how aggressively
// weight progresses between sessions.
export const TRAINING_STYLES = ['Strength', 'Hypertrophy', 'Endurance'];

export const STYLE_CONFIG = {
  Strength: { sets: 4, reps: '3-6', incrementMultiplier: 1.5, blurb: 'Heavy loads, low reps, full recovery between sets.' },
  Hypertrophy: { sets: 4, reps: '8-12', incrementMultiplier: 1, blurb: 'Moderate reps, steady load progression, shorter rests.' },
  Endurance: { sets: 3, reps: '15-20', incrementMultiplier: 0.6, blurb: 'Lighter loads, higher reps, minimal rest.' },
};

// Picks `count` exercises per selected muscle group, preferring ones not
// in `recentNames` (last workout's picks) so back-to-back sessions don't
// look identical — falls back to repeats only if a group runs out of
// fresh options. Sets/reps on each pick are overridden by the chosen
// training style rather than the library's default.
export function generateWorkout(muscleGroups, style, recentNames = [], perGroup = 2) {
  const styleConfig = STYLE_CONFIG[style] || {};
  const picked = [];
  for (const group of muscleGroups) {
    const pool = EXERCISE_LIBRARY[group] || [];
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
  return picked;
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
