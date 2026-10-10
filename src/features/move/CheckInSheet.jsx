import React, { useState } from 'react';
import Portal from '../../Portal';
import { useSwipeDown, GRAB_BAR_CLASS } from '../../lib/swipeDown';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY, BRICK } from '../../theme';

// Borg CR10-style effort scale, in plain words.
export const RPE_LABELS = {
  1: 'Very easy', 2: 'Easy', 3: 'Light', 4: 'Moderate', 5: 'Somewhat hard',
  6: 'Getting hard', 7: 'Hard', 8: 'Very hard', 9: 'Nearly max', 10: 'All out',
};

// Quick, skippable check-in right after finishing a workout.
export default function CheckInSheet({ onSave, onSkip }) {
  const [rpe, setRpe] = useState(null);
  const [feltOff, setFeltOff] = useState(null); // null | false | true
  const [note, setNote] = useState('');
  const canSave = rpe != null || feltOff != null;
  const sheet = useSwipeDown(onSkip);

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" onClick={onSkip} />
        <div ref={sheet.ref} {...sheet.handlers} style={{ background: INK_2, ...sheet.style }} className="relative w-full max-w-md rounded-t-xl px-4 pt-5 pb-6 space-y-4 text-center">
          <div style={{ background: TEXT_SOFT, opacity: 0.45 }} className={GRAB_BAR_CLASS} />
          <div style={{ color: PAPER }} className="text-base font-medium">Nice work! Quick check-in</div>

          <div>
            <div style={{ color: PAPER_DIM }} className="text-sm mb-1">How hard did that feel? <span style={{ color: TEXT_SOFT }}>1 easy, 10 all out</span></div>
            {/* The chosen rating reads above the buttons, so a finger never covers it. */}
            <div style={{ color: rpe ? PAPER : TEXT_SOFT, fontFamily: 'Outfit, sans-serif' }} className="text-xl font-medium h-8 mb-2">
              {rpe ? `${rpe} · ${RPE_LABELS[rpe]}` : 'Tap a number'}
            </div>
            <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Effort from 1 to 10">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  role="radio"
                  aria-checked={rpe === n}
                  onClick={() => setRpe(n)}
                  style={{ background: rpe === n ? SKY : INK_3, color: rpe === n ? INK : PAPER }}
                  className="rounded-md py-2.5 text-base font-medium"
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ color: PAPER_DIM }} className="text-sm mb-2">Anything hurt or feel off?</div>
            <div className="flex gap-2">
              {[['Nope', false], ['Yes', true]].map(([label, val]) => (
                <button
                  key={label}
                  onClick={() => setFeltOff(val)}
                  style={{ background: feltOff === val ? (val ? BRICK : SKY) : INK_3, color: feltOff === val ? INK : PAPER }}
                  className="flex-1 py-2 rounded-md text-sm"
                >
                  {label}
                </button>
              ))}
            </div>
            {feltOff === true && (
              <>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What was it? (optional)"
                  style={{ background: INK_3, color: PAPER }}
                  className="w-full rounded-md px-3 py-2.5 mt-2 text-sm outline-none text-center"
                />
                <div style={{ color: TEXT_SOFT }} className="text-sm mt-1.5">Greg will see this.</div>
              </>
            )}
          </div>

          <button
            onClick={() => onSave({ rpe, felt_off: feltOff, felt_off_note: feltOff && note.trim() ? note.trim() : null })}
            disabled={!canSave}
            style={{ background: canSave ? SKY : INK_3, color: canSave ? INK : TEXT_SOFT }}
            className="w-full rounded-md py-3 text-sm font-medium"
          >
            Save
          </button>
          <button onClick={onSkip} style={{ color: TEXT_SOFT }} className="w-full text-sm">Skip</button>
        </div>
      </div>
    </Portal>
  );
}
