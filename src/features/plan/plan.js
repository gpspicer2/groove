// Planned workouts: a workout scheduled for a future day. Either vague
// ("Outdoor walk") or detailed, carrying the same choices Move's start
// flow collects (location, type, muscle groups, style, activities).

export const PLAN_SUGGESTIONS = ['Outdoor walk', 'Gym session', 'Yoga', 'Bike ride', 'Run', 'Stretching'];

// One short line describing a detailed plan, e.g. "Resistance · Hypertrophy · At the Gym".
export function planSummary(plan) {
  const d = plan?.details;
  if (!d) return '';
  return [d.mode, d.style, d.location].filter(Boolean).join(' · ');
}

export function friendlyPlanDate(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
