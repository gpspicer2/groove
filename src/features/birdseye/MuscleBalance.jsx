import React, { useState } from 'react';
import { Check, Info, X } from 'lucide-react';
import Portal from '../../Portal';
import { INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY } from '../../theme';
import { BALANCE_BUCKETS, BALANCE_TARGET_DAYS, balanceBucket } from '../move/muscles';

const PUSH = ['Chest', 'Shoulders', 'Triceps'];
const PULL = ['Back', 'Biceps'];

// This week's strength work by muscle group (NSCA: each major group 2-3
// days a week) and a push/pull check. Hidden until a lift is logged.
export default function MuscleBalance({ sets, bare = false }) {
  const [showInfo, setShowInfo] = useState(false);
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
    <div style={bare ? undefined : { background: INK_2, borderTop: `2px solid ${SKY}` }} className={bare ? '' : 'rounded-lg px-5 py-4'}>
      <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-2 flex items-center justify-center gap-1.5">
        Muscles This Week
        <button onClick={() => setShowInfo(true)} aria-label="About muscle goals" style={{ color: TEXT_SOFT }} className="p-1 -m-1"><Info size={14} /></button>
      </div>
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
      {showInfo && (
        <Portal>
          <div className="fixed inset-0 z-[60] flex items-end justify-center">
            <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" onClick={() => setShowInfo(false)} />
            <div style={{ background: INK_2 }} className="relative w-full max-w-md rounded-t-xl px-5 pt-4 pb-6 space-y-3 text-center">
              <div className="flex items-center justify-between">
                <div style={{ color: PAPER }} className="text-sm font-medium">Muscle goals</div>
                <button onClick={() => setShowInfo(false)} aria-label="Close" style={{ color: TEXT_SOFT }} className="p-2 -m-2"><X size={18} /></button>
              </div>
              {[
                ['What it is', 'How many days this week you trained each major muscle group. The goal is 2 days for each.'],
                ['Where it comes from', 'The ACSM and NSCA recommend training each major muscle group 2 to 3 days a week, with about 48 hours between sessions for the same muscles. That gives muscle time to repair and adapt.'],
                ['Why it matters', 'Muscle mass and strength are strong predictors of how long and how well you live. They are linked to lower risk of falls, injury, and chronic disease, and better metabolic health. Covering every group, and balancing pushing with pulling, keeps joints stable and loaded evenly.'],
              ].map(([h, t]) => (
                <div key={h}>
                  <div style={{ color: SKY }} className="text-sm font-medium">{h}</div>
                  <p style={{ color: PAPER_DIM }} className="text-sm">{t}</p>
                </div>
              ))}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
