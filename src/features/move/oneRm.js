// Estimated 1RMs (from Account) so lifts can show an NSCA %1RM target.
let byName = {};

export function setOneRms(rows) {
  const map = {};
  (rows || []).forEach((r) => {
    const key = String(r.exercise_name || '').trim().toLowerCase();
    if (!key || map[key]) return; // rows arrive newest first
    map[key] = Number(r.estimated_1rm_lb);
  });
  byName = map;
}

export function oneRmFor(exerciseName) {
  const n = String(exerciseName || '').toLowerCase();
  if (byName[n]) return byName[n];
  const hit = Object.keys(byName).find((k) => k.length > 3 && (n.includes(k) || k.includes(n)));
  return hit ? byName[hit] : null;
}

// NSCA load ranges (% of 1RM) by training goal.
export const PCT_1RM = { Strength: [85, 95], Hypertrophy: [67, 85], Endurance: [50, 67] };

export function targetLoad(style, oneRm) {
  const pct = PCT_1RM[style];
  if (!pct || !oneRm) return null;
  const r5 = (n) => Math.round(n / 5) * 5;
  return { low: r5(oneRm * pct[0] / 100), high: r5(oneRm * pct[1] / 100), pct };
}
