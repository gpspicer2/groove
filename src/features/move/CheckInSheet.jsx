import React, { useState, useRef, useEffect } from 'react';
import Portal from '../../Portal';
import { useSwipeDown, GRAB_BAR_CLASS } from '../../lib/swipeDown';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY, BRICK } from '../../theme';

// Borg CR10-style effort scale, in plain words.
export const RPE_LABELS = {
  1: 'Very easy', 2: 'Easy', 3: 'Light', 4: 'Moderate', 5: 'Somewhat hard',
  6: 'Getting hard', 7: 'Hard', 8: 'Very hard', 9: 'Nearly max', 10: 'All out',
};

const ITEM_W = 64; // px per number in the scroller

// Quick, skippable check-in right after finishing a workout.
export default function CheckInSheet({ onSave, onSkip }) {
  const [rpe, setRpe] = useState(null);
  const [feltOff, setFeltOff] = useState(null); // null | false | true
  const [note, setNote] = useState('');
  const canSave = rpe != null || feltOff != null;
  const sheet = useSwipeDown(onSkip);
  const scrollerRef = useRef(null);
  const ready = useRef(false);

  // Start with 5 under the marker, but only count a rating once they move it or tap.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollLeft = 4 * ITEM_W;
    const t = setTimeout(() => { ready.current = true; }, 400);
    return () => clearTimeout(t);
  }, []);
  function handleScroll(e) {
    if (!ready.current) return;
    const n = Math.min(10, Math.max(1, Math.round(e.currentTarget.scrollLeft / ITEM_W) + 1));
    setRpe(n);
  }
  function pick(n) {
    setRpe(n);
    scrollerRef.current?.scrollTo({ left: (n - 1) * ITEM_W, behavior: 'smooth' });
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" onClick={onSkip} />
        <div ref={sheet.ref} {...sheet.handlers} style={{ background: INK_2, ...sheet.style }} className="relative w-full max-w-md rounded-t-xl px-4 pt-5 pb-6 space-y-4 text-center">
          <div style={{ background: TEXT_SOFT, opacity: 0.45 }} className={GRAB_BAR_CLASS} />
          <div style={{ color: PAPER }} className="text-base font-medium">Nice work! Quick check-in</div>

          <div>
            <div style={{ color: PAPER_DIM }} className="text-sm mb-1">How hard did that feel?</div>
            {/* The rating reads above the scroller, so a finger never covers it. */}
            <div style={{ color: rpe ? PAPER : TEXT_SOFT, fontFamily: 'Outfit, sans-serif' }} className="text-xl font-medium h-8 mb-1">
              {rpe ? `${rpe} · ${RPE_LABELS[rpe]}` : 'Slide to rate'}
            </div>
            <div className="relative" data-no-sheet-drag>
              <div
                ref={scrollerRef}
                onScroll={handleScroll}
                role="slider"
                aria-label="Effort from 1 to 10"
                aria-valuemin={1} aria-valuemax={10} aria-valuenow={rpe ?? undefined}
                style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', touchAction: 'pan-x', paddingInline: `calc(50% - ${ITEM_W / 2}px)` }}
                className="flex overflow-x-auto no-scrollbar py-1"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => pick(n)}
                    style={{ width: ITEM_W, scrollSnapAlign: 'center', color: rpe === n ? PAPER : TEXT_SOFT, fontFamily: 'Outfit, sans-serif' }}
                    className={`shrink-0 py-2 font-medium tabular-nums ${rpe === n ? 'text-3xl' : 'text-xl'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div
                style={{ width: ITEM_W, border: `2px solid ${SKY}`, opacity: rpe ? 1 : 0.5 }}
                className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 rounded-lg pointer-events-none"
              />
            </div>
            <div className="flex justify-between text-sm mt-1" style={{ color: TEXT_SOFT }}>
              <span>1 very easy</span><span>10 all out</span>
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
