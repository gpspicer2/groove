import React, { useState } from 'react';
import { X } from './lib/icons';
import { INK_3, TEXT_SOFT, PAPER_DIM } from './theme';

// A one-time "swipe left to…" nudge — swipe-to-reveal has no visible
// affordance, so it's the usual thing people never discover. Dismissed
// (or acted on) once per kind of list, remembered on this device.
export default function SwipeHint({ id, children }) {
  const key = `groove:swipeHint:${id}`;
  const [seen, setSeen] = useState(() => {
    try { return localStorage.getItem(key) === '1'; } catch { return false; }
  });
  if (seen) return null;
  return (
    <div style={{ background: INK_3, color: PAPER_DIM }} className="rounded-md px-3 py-2 mb-3 text-sm flex items-center gap-2">
      <span className="flex-1 text-center">{children}</span>
      <button
        onClick={() => { try { localStorage.setItem(key, '1'); } catch { /* */ } setSeen(true); }}
        style={{ color: TEXT_SOFT }}
        className="p-1 -m-1 shrink-0"
        aria-label="Dismiss tip"
      >
        <X size={14} />
      </button>
    </div>
  );
}
