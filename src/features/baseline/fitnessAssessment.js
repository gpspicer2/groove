// The physical self-assessment now lives inside the app as its own
// optional, step-by-step flow (not bundled into the required intake
// form) — a client can time an activity right in-app, or just describe
// their ability in words if they'd rather not guess a number.
export const RATING_SCALE = [
  'Much less than I\'d like',
  'Poor',
  'Less than average',
  'Decent',
  'Above average',
  'Excellent',
];

export const AEROBIC_ACTIVITIES = [
  { key: 'walk', label: 'Walk ~600m (about 1/3 mile)', instructions: 'Walk at a brisk, sustainable pace. Tap Start, then Stop when you finish the distance.' },
  { key: 'stairs', label: 'Climb stairs for up to 5 minutes', instructions: "Climb at a steady pace for as long as feels right, up to 5 minutes. Tap Start, then Stop when you're done." },
];

export const ONE_RM_LIFTS = ['Bench Press', 'Back Squat', 'Deadlift', 'Overhead Press'];
