// Resistance, flexibility and balance goals count training DAYS (ACSM), so two workouts on the same calendar day
// (a second session, or an abandoned one with a single set) count once.
export function distinctDays(workouts) {
  const days = new Set();
  workouts.forEach((w) => {
    const d = new Date(w.started_at || w.at);
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  });
  return days.size;
}
