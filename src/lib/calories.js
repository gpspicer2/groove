// Energy-expenditure estimates using the ACSM metabolic relationship:
//   kcal/min = METs x 3.5 x body mass (kg) / 200
// Aerobic bursts use the midpoint MET of each ACSM intensity band
// (light < 3, moderate 3-5.9, vigorous 6+). Resistance sets have no
// speed/grade to plug into ACSM's walking/running equations, so they use
// the Compendium's general resistance-training MET over ~2 min per set
// (the set plus its rest). These are estimates, not measurements.
export const DEFAULT_BODYWEIGHT_LB = 170;
const MET = { light: 2.5, moderate: 4.5, vigorous: 7.0, resistance: 3.5 };
const MIN_PER_RESISTANCE_SET = 2;

export function kcalPerMinute(met, lb) {
  const kg = (lb || DEFAULT_BODYWEIGHT_LB) / 2.2046;
  return (met * 3.5 * kg) / 200;
}

// sets: any objects exposing movementType + light/moderate/vigorousMinutes
export function estimateKcal(sets, lb) {
  let total = 0;
  for (const s of sets) {
    const type = s.movementType ?? s.movement_type ?? 'resistance';
    if (type === 'aerobic') {
      const l = Number(s.lightMinutes ?? s.light_minutes) || 0;
      const m = Number(s.moderateMinutes ?? s.moderate_minutes) || 0;
      const v = Number(s.vigorousMinutes ?? s.vigorous_minutes) || 0;
      total += l * kcalPerMinute(MET.light, lb) + m * kcalPerMinute(MET.moderate, lb) + v * kcalPerMinute(MET.vigorous, lb);
    } else if (type === 'resistance') {
      total += MIN_PER_RESISTANCE_SET * kcalPerMinute(MET.resistance, lb);
    }
  }
  return Math.round(total);
}
