import { CLIENT_NUDGE_DAYS } from '../../src/lib/activityGap.js';

// What a member's morning reminder says (at most one per day), or null.
export function memberMessage({ planTitle, daysSince, loggedToday }) {
  if (loggedToday) return null;
  if (planTitle) return { title: 'Planned for today', body: `${planTitle}. Ready when you are.`, tag: 'plan' };
  if (daysSince != null && daysSince >= CLIENT_NUDGE_DAYS) {
    return { title: `${daysSince} days since your last workout`, body: 'Even a 20 minute walk gets you moving again.', tag: 'gap' };
  }
  return null;
}

// Greg's morning summary from the attention list, or null if all clear.
export function coachMessage(attention) {
  if (!attention.length) return null;
  const names = [...new Set(attention.map((a) => a.title))];
  const shown = names.slice(0, 3).join(', ') + (names.length > 3 ? ` and ${names.length - 3} more` : '');
  return {
    title: names.length === 1 ? '1 member needs you' : `${names.length} members need you`,
    body: shown,
    tag: 'coach-digest',
  };
}
