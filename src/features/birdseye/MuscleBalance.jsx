import React from 'react';
import { Check } from 'lucide-react';
import { INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY } from '../../theme';
import { BALANCE_BUCKETS, BALANCE_TARGET_DAYS, balanceBucket } from '../move/muscles';

const PUSH = ['Chest', 'Shoulders', 'Triceps'];
const PULL = ['Back', 'Biceps'];

// This week's strength work by muscle group (NSCA: each major group 2-3
// days a week) and a push/pull check. Hidden until a lift is logged.
export default function MuscleBalance({ sets }) {
  // sets: [{ workout_id, muscle_group }] for resistance sets this week
  if (sets.length === 0) return null;
  const days = {};
  let push = 0;
  let pull = 0;
  sets.forEach((s) => {
    const bucket = balanceBucket(s.muscle_group);
    if (bucket) (days[bucket] ||= new Set()).add(s.workout_id);
    if (PUSH.includes(s.muscle_group)) push += 1;
    if (PULL.includes(s.muscle_group)) pull += 1;
  });
  const missing = BALANCE_BUCKETS.filter((b) => !days[b]);
  let note = null;
  if (push >= 6 && pull < push * 0.6) note = 'Lots of pushing. Add some pulling, like rows or pulldowns, to balance it.';
  else if (pull >= 6 && push < pull * 0.6) note = 'Lots of pulling. Add some pushing, like presses or push-ups, to balance it.';
  else if (missing.length > 0 && missing.length < BALANCE_BUCKETS.length) note = `Still to go: ${missing.join(', ')}.`;

  return (
    <div style={{ background: INK_2, borderTop: `2px solid ${SKY}` }} className="rounded-lg px-5 py-4">
      <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-2">Muscles This Week</div>
      <div className="flex flex-wrap justify-center gap-2">
        {BALANCE_BUCKETS.map((b) => {
          const n = days[b]?.size || 0;
          const done = n >= BALANCE_TARGET_DAYS;
          return (
            <span key={b} style={{ background: INK_3, color: n === 0 ? TEXT_SOFT : done ? SKY : PAPER }} className="rounded-full px-3 py-1 text-sm inline-flex items-center gap-1">
              {done && <Check size={13} strokeWidth={3} />}{b} {n}/{BALANCE_TARGET_DAYS}
            </span>
          );
        })}
      </div>
      {note && <div style={{ color: PAPER_DIM }} className="text-sm mt-2">{note}</div>}
    </div>
  );
}
