import React, { useState } from 'react';
import { X } from '../../lib/icons';
import { TEXT_SOFT } from '../../theme';

// A one-line, tab-colored nudge for first-timers. Tapping the words does the thing; the small x puts it away for good
// (remembered per person on this device). Each screen decides when it is still relevant (e.g. "no plans yet"), so a hint
// also disappears by itself once the member has done what it suggests.
const key = (id, userId) => `groove:hint:${id}:${userId || ''}`;
export function hintDismissed(id, userId) {
  try { return localStorage.getItem(key(id, userId)) === '1'; } catch { return false; }
}
export default function FirstTimeHint({ id, userId, label, color, onOpen, className = '' }) {
  const [gone, setGone] = useState(() => hintDismissed(id, userId));
  if (gone) return null;
  const dismiss = () => {
    setGone(true);
    try { localStorage.setItem(key(id, userId), '1'); } catch { /* storage blocked */ }
  };
  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      <button onClick={onOpen} style={{ color }} className="text-base font-bold py-1">{label}</button>
      <button onClick={dismiss} aria-label={`Hide: ${label}`} style={{ color: TEXT_SOFT }} className="p-1.5"><X size={14} /></button>
    </div>
  );
}
