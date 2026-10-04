// Energy-expenditure estimates using the ACSM metabolic relationship:
//   kcal/min = METs x 3.5 x body mass (kg) / 200
// Aerobic bursts use a per-activity MET scaled by intensity (falling back to the midpoint MET of each ACSM band
// (light < 3, moderate 3-5.9, vigorous 6+)). Resistance sets have no
// speed/grade to plug into ACSM's walking/running equations, so they use
// the Compendium's muscle-mass-based MET (3.5 isolation to 6.5 big compound lifts) over ~2.5 min per set
// (the set plus its rest). These are estimates, not measurements.
export const DEFAULT_BODYWEIGHT_LB = 170;
const MET = { light: 2.5, moderate: 4.5, vigorous: 7.0, resistance: 5.0 };
const MIN_PER_RESISTANCE_SET = 2.5;

export function kcalPerMinute(met, lb) {
  const kg = (lb || DEFAULT_BODYWEIGHT_LB) / 2.2046;
  return (met * 3.5 * kg) / 200;
}

// Typical-effort METs by activity keyword (Compendium values, rounded).
// The chosen intensity then scales them, so a Light run still counts
// for less than a Vigorous one.
const AEROBIC_KEYWORD_METS = [
  [/jump rope/i, 10.5], [/run|jog/i, 8.5], [/stair/i, 8.0], [/row/i, 6.5], [/cycl|bike|spin/i, 6.8],
  [/swim/i, 6.0], [/hik/i, 5.8], [/elliptical/i, 5.0], [/dance/i, 5.0], [/walk/i, 3.8],
];
const INTENSITY_SCALE = { light: 0.65, moderate: 1.0, vigorous: 1.3 };

function aerobicMet(name, band) {
  const hit = AEROBIC_KEYWORD_METS.find(([re]) => re.test(name || ''));
  return hit ? hit[1] * INTENSITY_SCALE[band] : MET[band];
}

// Resistance work costs more the more muscle mass moves: big compound
// lower-body lifts > big compound upper-body lifts > isolation work.
function resistanceMet(name, group) {
  const n = name || '';
  const g = (group || '').toLowerCase();
  if (/squat|deadlift|lunge|leg press|clean|snatch|thruster|step-?up|hip thrust/i.test(n)) return 6.5;
  if (/press|row|pull-?up|chin-?up|pulldown|dip|push-?up/i.test(n)) return 5.0;
  if (['legs', 'quadriceps', 'hamstrings', 'glutes'].includes(g)) return 5.5;
  if (['chest', 'back', 'shoulders'].includes(g)) return 4.5;
  return 3.5; // biceps, triceps, core, calves, forearms...
}

// sets: any objects exposing movementType + light/moderate/vigorousMinutes
export function estimateKcal(sets, lb) {
  let total = 0;
  for (const s of sets) {
    const type = s.movementType ?? s.movement_type ?? 'resistance';
    if (type === 'aerobic') {
      const name = s.distance || s.exerciseName || s.exercise_name || '';
      const l = Number(s.lightMinutes ?? s.light_minutes) || 0;
      const m = Number(s.moderateMinutes ?? s.moderate_minutes) || 0;
      const v = Number(s.vigorousMinutes ?? s.vigorous_minutes) || 0;
      total += l * kcalPerMinute(aerobicMet(name, 'light'), lb)
        + m * kcalPerMinute(aerobicMet(name, 'moderate'), lb)
        + v * kcalPerMinute(aerobicMet(name, 'vigorous'), lb);
    } else if (type === 'resistance') {
      const met = resistanceMet(s.exerciseName ?? s.exercise_name, s.muscleGroup ?? s.muscle_group);
      total += MIN_PER_RESISTANCE_SET * kcalPerMinute(met, lb);
    }
  }
  return Math.round(total);
}
