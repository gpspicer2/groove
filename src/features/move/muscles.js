// Muscle-group helpers shared by Move (recovery warning) and Birdseye
// (weekly balance). NSCA: train each major group 2-3 days a week, with
// about 48 hours between sessions for the same muscles.

export const RECOVERY_HOURS = 48;

const LEGS = ['Legs', 'Quadriceps', 'Hamstrings', 'Glutes'];
const ARMS = ['Arms', 'Biceps', 'Triceps'];
const UPPER = ['Chest', 'Back', 'Shoulders', ...ARMS];

// Every specific group a selection touches ("Upper Body" -> chest, back...).
export function expandGroup(g) {
  if (g === 'Whole Body') return [...UPPER, ...LEGS, 'Core'];
  if (g === 'Upper Body') return UPPER;
  if (g === 'Lower Body' || g === 'Legs') return LEGS;
  if (g === 'Arms') return ARMS;
  return [g];
}

// The six buckets the weekly balance card tracks.
export function balanceBucket(g) {
  if (g === 'Chest') return 'Chest';
  if (g === 'Back') return 'Back';
  if (g === 'Shoulders') return 'Shoulders';
  if (ARMS.includes(g)) return 'Arms';
  if (LEGS.includes(g)) return 'Legs';
  if (g === 'Core') return 'Core';
  return null;
}
export const BALANCE_BUCKETS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'];
export const BALANCE_TARGET_DAYS = 2;

// Groups in `selected` that were already trained within the last 48 hours.
// `trained` is [{ group, at }] (ISO times).
export function recentlyTrained(selected, trained, now = Date.now()) {
  const wanted = new Set(selected.flatMap(expandGroup));
  const hits = new Map();
  trained.forEach(({ group, at }) => {
    const hours = (now - new Date(at).getTime()) / 36e5;
    if (hours < 0 || hours >= RECOVERY_HOURS) return;
    expandGroup(group).forEach((g) => { if (wanted.has(g)) hits.set(g, Math.min(hits.get(g) ?? Infinity, hours)); });
  });
  return hits; // group -> hours since
}
