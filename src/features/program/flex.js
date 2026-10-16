import { balanceBucket, BALANCE_BUCKETS, BALANCE_TARGET_DAYS } from '../move/muscles';

// "Flex day": the lifting session that fills in what this week's training has left out. Each muscle area
// wants about two days a week (NSCA), so the areas with the fewest days so far, trained longest ago, come first.
const BUCKET_GROUPS = { Chest: ['Chest'], Back: ['Back'], Shoulders: ['Shoulders'], Arms: ['Biceps', 'Triceps'], Legs: ['Legs'], Core: ['Core'] };
const dayKey = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

// trained: [{ group, at }] (one per logged set, ISO time). Without `force`, returns null once every area has its days;
// with it (a flex day after the plan is done), the least-trained areas are suggested anyway.
export function flexSuggestion(trained, weekStart, now = Date.now(), force = false) {
  const info = new Map(BALANCE_BUCKETS.map((b) => [b, { bucket: b, days: new Set(), last: 0 }]));
  trained.forEach(({ group, at }) => {
    const b = balanceBucket(group);
    const t = new Date(at).getTime();
    if (!b || Number.isNaN(t)) return;
    const row = info.get(b);
    if (t >= weekStart.getTime()) row.days.add(dayKey(at));
    row.last = Math.max(row.last, t);
  });
  const hours = (r) => (r.last ? (now - r.last) / 36e5 : Infinity);
  const needs = [...info.values()]
    .filter((r) => force || r.days.size < BALANCE_TARGET_DAYS)
    .sort((a, b) => a.days.size - b.days.size || hours(b) - hours(a));
  // Muscles hit in the last 48 hours wait their turn; if that leaves fewer than two, the most rested of the rest
  // (at least a day) fill in, so a flex day is never a single lonely muscle.
  const ready = needs.filter((r) => hours(r) >= 48);
  const rest = needs.filter((r) => hours(r) < 48 && hours(r) >= 24).sort((x, y) => hours(y) - hours(x));
  const picked = ready.slice(0, 3);
  if (picked.length < 2) rest.slice(0, 2 - picked.length).forEach((r) => picked.push(r));
  if (force && picked.length < 2) needs.filter((r) => !picked.includes(r)).sort((x, y) => hours(y) - hours(x)).slice(0, 2 - picked.length).forEach((r) => picked.push(r));
  const picks = picked.map((r) => r.bucket);
  if (picks.length === 0) return null;
  return {
    buckets: picks,
    groups: picks.flatMap((b) => BUCKET_GROUPS[b]),
    label: picks.join(', '),
  };
}

// A session shaped like a program session, so Move builds it the same way (moderate reps, volume work).
export function flexSession(sug) {
  return {
    id: `flex-${Date.now()}`, kind: 'resistance', name: 'Flex Day', shortName: 'Flex Day', groups: sug.groups, style: 'Hypertrophy', label: '',
    presc: { sets: 3, reps: '8-12', rpe: '7-8', rest: '90 sec' }, acc: null, exercises: 5, mainCount: 0, phase: 'Build', flex: true,
  };
}
