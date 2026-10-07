// Weekly summaries for Birdseye's "Last week" card: totals, which goals
// were hit, milestones, and a gentle goal-progression suggestion.

export const AEROBIC_GOAL_CEILING = 300; // ACSM: 150-300 min/week is the benefit range

function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export { dayKey };

// Totals for the week that starts `offset` weeks before `weekStart`.
export function summarizeWeek({ workouts, weekStart, offset, aerobicMinutesByWorkout, kcalByWorkout, hasResistance, hasFlexibility }) {
  const start = new Date(weekStart);
  start.setDate(start.getDate() - offset * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const inWeek = workouts.filter((w) => { const d = new Date(w.started_at); return d >= start && d < end; });
  let aerobicMin = 0;
  let kcal = 0;
  inWeek.forEach((w) => {
    const b = aerobicMinutesByWorkout[w.id];
    if (b) aerobicMin += b.moderate + b.vigorous * 2;
    kcal += kcalByWorkout[w.id] || 0;
  });
  return {
    start,
    sessions: inWeek.length,
    aerobicMin,
    resistance: inWeek.filter(hasResistance).length,
    flexibility: inWeek.filter(hasFlexibility).length,
    kcal,
  };
}

// Which tracked goals a summarized week hit.
export function goalsHit(s, g) {
  const rows = [];
  if (g.trackAerobic) rows.push({ label: 'Aerobic', hit: s.aerobicMin >= g.aerobicMinutes });
  if (g.trackResistance) rows.push({ label: 'Resistance', hit: s.resistance >= g.resistance });
  if (g.trackFlexibility) rows.push({ label: 'Flexibility', hit: s.flexibility >= g.flexibility });
  return rows;
}

// Everything the "Last week" card shows, or null when there's nothing to say.
export function buildRecap({ workouts, weekStart, aerobicMinutesByWorkout, kcalByWorkout, hasResistance, hasFlexibility, goals }) {
  const base = { workouts, weekStart, aerobicMinutesByWorkout, kcalByWorkout, hasResistance, hasFlexibility };
  const last = summarizeWeek({ ...base, offset: 1 });
  if (last.sessions === 0) return null;
  const rows = goalsHit(last, goals);
  const allHit = rows.length > 0 && rows.every((r) => r.hit);

  // Streak of weeks (ending last week) that hit every tracked goal.
  let streak = 0;
  for (let i = 1; i <= 52; i++) {
    const r = goalsHit(summarizeWeek({ ...base, offset: i }), goals);
    if (r.length > 0 && r.every((x) => x.hit)) streak++; else break;
  }

  const milestones = [];
  if (goals.trackAerobic && last.aerobicMin >= 150) {
    const earlier150 = Array.from({ length: 52 }, (_, k) => summarizeWeek({ ...base, offset: k + 2 })).some((s) => s.aerobicMin >= 150);
    if (!earlier150) milestones.push('Your first 150-minute week!');
  }
  if (allHit && streak >= 4 && streak % 4 === 0) milestones.push(`${streak} weeks in a row hitting your goals!`);
  const total = workouts.length;
  const prior = workouts.filter((w) => new Date(w.started_at) < weekStart).length;
  const before = prior - last.sessions; // workouts before last week
  const MARKS = [10, 25, 50, 100, 200];
  const mark = MARKS.filter((m) => before < m && prior >= m).pop();
  if (mark && total >= mark) milestones.push(`${mark} workouts logged!`);

  // Progression: met the aerobic goal two weeks running -> offer a small step up.
  let suggestion = null;
  if (goals.trackAerobic && goals.aerobicMinutes < AEROBIC_GOAL_CEILING) {
    const prev = summarizeWeek({ ...base, offset: 2 });
    if (last.aerobicMin >= goals.aerobicMinutes && prev.aerobicMin >= goals.aerobicMinutes) {
      const next = Math.min(AEROBIC_GOAL_CEILING, Math.round((goals.aerobicMinutes * 1.1) / 5) * 5);
      if (next > goals.aerobicMinutes) suggestion = { aerobicMinutes: next };
    }
  }

  return { last, rows, allHit, milestones, suggestion, key: dayKey(weekStart) };
}
