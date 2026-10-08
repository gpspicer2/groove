import { modeLabel } from '../move/exerciseLibrary';

// Planned workouts: a workout scheduled for a future day. Either vague
// ("Outdoor walk") or detailed, carrying the same choices Move's start
// flow collects (location, type, muscle groups, style, activities).
//
// Everything beyond the title lives in the plan's `details` object:
//   quick plan:    { kind: 'aerobic' | 'resistance' | 'flexibility', minutes? }
//   detailed plan: { mode, location, groups, style, activities, ..., minutes? }

export const DEFAULT_PLAN_MINUTES = 30;
export const PLAN_MINUTE_OPTIONS = [15, 30, 45, 60, 90];

export const PLAN_SUGGESTIONS = [
  { label: 'Outdoor walk', emoji: '🚶', kind: 'aerobic' },
  { label: 'Gym session', emoji: '🏋️', kind: 'resistance' },
  { label: 'Yoga', emoji: '🧘', kind: 'flexibility' },
  { label: 'Bike ride', emoji: '🚴', kind: 'aerobic' },
  { label: 'Run', emoji: '🏃', kind: 'aerobic' },
  { label: 'Stretching', emoji: '🤸', kind: 'flexibility' },
];

// True once a plan has the full workout choices (not just a title).
export function hasDetails(plan) {
  return Boolean(plan?.details?.mode);
}

// Which kinds of movement a plan counts as: 'aerobic', 'resistance', 'flexibility'.
export function planKinds(plan) {
  const d = plan?.details;
  const kinds = new Set();
  if (d?.mode === 'Resistance') kinds.add('resistance');
  else if (d?.mode === 'Flexibility') kinds.add('flexibility');
  else if (d?.mode === 'Combined') { kinds.add('aerobic'); kinds.add('resistance'); }
  else if (d?.mode === 'Aerobic') kinds.add('aerobic');
  else kinds.add(d?.kind || 'aerobic');
  return kinds;
}

// Planned aerobic minutes (assumed moderate intensity), 0 if none.
export function planMinutes(plan) {
  return planKinds(plan).has('aerobic') ? Number(plan?.details?.minutes) || DEFAULT_PLAN_MINUTES : 0;
}

// One short line describing a plan, e.g. "Resistance · Hypertrophy · At the Gym".
export function planSummary(plan) {
  const d = plan?.details;
  if (!d) return '';
  const parts = hasDetails(plan) ? [modeLabel(d.mode), d.style, d.location] : (d.groups?.length ? [d.groups.join(', ')] : []);
  const minutes = planMinutes(plan);
  if (minutes) parts.push(`${minutes} min`);
  return parts.filter(Boolean).join(' · ');
}

export function friendlyPlanDate(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
