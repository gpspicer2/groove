import { supabase } from './supabaseClient';

// Builds up a history of resting HR, bodyweight, and VO2max so Birdseye can
// show trends. Fails quietly if the fitness_measurements table isn't set up yet.
export async function logMeasurement(userId, kind, value, { allowNonPositive = false } = {}) {
  const n = Number(value);
  if (!userId || !Number.isFinite(n) || (!allowNonPositive && !(n > 0))) return;
  try {
    await supabase.from('fitness_measurements').insert({ user_id: userId, kind, value: n });
  } catch { /* history is a nice-to-have */ }
}
