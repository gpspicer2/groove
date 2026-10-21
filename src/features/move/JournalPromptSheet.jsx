import React from 'react';
import Portal from '../../Portal';
import { useSwipeDown, GRAB_BAR_CLASS } from '../../lib/swipeDown';
import { INK_2, PAPER, PAPER_DIM, TEXT_SOFT, AMBER, ON_AMBER } from '../../theme';

// Right after a workout (and its check-in): a gentle nudge toward the
// Post-Movement Reflection in the Journal. Journal is amber.
export default function JournalPromptSheet({ onJournal, onSkip }) {
  const sheet = useSwipeDown(onSkip);
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" onClick={onSkip} />
        <div ref={sheet.ref} {...sheet.handlers} style={{ background: INK_2, borderTop: `2px solid ${AMBER}`, ...sheet.style }} className="relative w-full max-w-md rounded-t-xl px-4 pt-5 pb-6 text-center">
          <div style={{ background: TEXT_SOFT, opacity: 0.45 }} className={GRAB_BAR_CLASS} />
          <div style={{ color: PAPER }} className="text-base font-medium">How was that, really?</div>
          <div style={{ color: PAPER_DIM }} className="text-sm mt-1 mb-4">A quick reflection while it's fresh. Only you can read it.</div>
          <button onClick={onJournal} style={{ background: AMBER, color: ON_AMBER }} className="w-full rounded-md py-3 text-sm font-medium mb-2">
            Write a Post-Movement Reflection
          </button>
          <button onClick={onSkip} style={{ color: TEXT_SOFT }} className="w-full text-sm py-1.5">Not Now</button>
        </div>
      </div>
    </Portal>
  );
}
