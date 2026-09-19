// ACSM heart-rate-reserve (Karvonen) intensity zones, shared between the
// client-facing Birdseye card and the trainer's client view so both
// compute the exact same numbers.
export const HR_ZONES = [
  { label: 'Light', lowPct: 0.3, highPct: 0.39 },
  { label: 'Moderate', lowPct: 0.4, highPct: 0.59 },
  { label: 'Vigorous', lowPct: 0.6, highPct: 0.89 },
];

export function karvonenBpm(restingHR, maxHR, pct) {
  return Math.round(restingHR + pct * (maxHR - restingHR));
}

// Tanaka et al. (2001) — a better-fitting alternative to the classic
// 220-minus-age formula, used only when no measured max HR is on file.
export function predictedMaxHR(age) {
  if (!age) return null;
  return Math.round(208 - 0.7 * age);
}

export function computeHrZones(restingHR, maxHR) {
  if (restingHR == null || maxHR == null) return null;
  return HR_ZONES.map((z) => ({
    ...z,
    lowBpm: karvonenBpm(restingHR, maxHR, z.lowPct),
    highBpm: karvonenBpm(restingHR, maxHR, z.highPct),
  }));
}
