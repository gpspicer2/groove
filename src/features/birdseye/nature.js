// Time in nature: a weekly minutes goal (White et al. 2019, Scientific Reports: 120+ minutes a week outdoors was linked to
// better health and wellbeing, in one visit or several). Any outdoor movement counts, on top of counting toward its own goal.
export const NATURE_GOAL_MINUTES = 120;
export const NATURE_ACTIVITY = 'Time in Nature';

const OUTDOOR_STRAVA = /run|jog|ride|bike|cycl|walk|hike|swim|kayak|canoe|ski|snowboard|climb|paddle|surf|skate|golf/i;
const INDOOR_STRAVA = /virtual|indoor|treadmill|trainer|stationary|elliptical|stair/i;

// Where a workout happened: picked as The Great Outdoors, or imported from Strava as an outdoor activity.
export function isOutdoorWorkout(w) {
  if (w.location === 'The Great Outdoors') return true;
  if (String(w.external_id || '').startsWith('strava:')) {
    const names = (w.activities || []).join(' ');
    return OUTDOOR_STRAVA.test(names) && !INDOOR_STRAVA.test(names);
  }
  return false;
}

// Per-workout minute sums from logged sets: aerobic minutes (all intensities), timed holds, lifting sets (about 2.5 min each,
// the same estimate used for calories), and sets named "Time in Nature", which count wherever they were logged.
export function natureBaseFromSets(setRows) {
  const out = {};
  (setRows || []).forEach((s) => {
    const b = (out[s.workout_id] ||= { aerobic: 0, flex: 0, lift: 0, named: 0 });
    const type = s.movement_type || 'resistance';
    const aer = (Number(s.light_minutes) || 0) + (Number(s.moderate_minutes) || 0) + (Number(s.vigorous_minutes) || 0);
    if (type === 'aerobic') { b.aerobic += aer; if (/nature/i.test(s.exercise_name || '')) b.named += aer; }
    else if (type === 'flexibility') b.flex += (Number(s.duration_seconds) || 0) / 60;
    else if (s.muscle_group !== 'Warm-up') b.lift += 2.5;
  });
  return out;
}

export function natureMinutes(w, base) {
  const b = base[w.id];
  if (!b) return 0;
  if (isOutdoorWorkout(w)) return Math.round(b.aerobic > 0 ? b.aerobic + b.flex + b.lift : b.flex + b.lift);
  return Math.round(b.named);
}
