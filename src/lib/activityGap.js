// How many days without any activity before we say something.
//
// The clearest published line is the ADA/ACSM guidance for people with
// diabetes: don't go more than 2 days in a row without activity, because
// the blood-sugar benefit of a session fades after about 48-72 hours. So a
// member gets a friendly nudge on the third day, and Greg is alerted two
// days after that. (Fitness itself takes about 2 weeks to start slipping,
// so this is about momentum and metabolic health, not an emergency.)
export const CLIENT_NUDGE_DAYS = 3;
export const COACH_ALERT_DAYS = CLIENT_NUDGE_DAYS + 2;

// Whole calendar days between two moments (Monday night to Thursday
// morning is 3 days, however many hours that is).
export function calendarDaysBetween(later, earlier) {
  const a = new Date(later); a.setHours(0, 0, 0, 0);
  const b = new Date(earlier); b.setHours(0, 0, 0, 0);
  return Math.round((a - b) / 864e5);
}
