import React from 'react';
import Portal from '../../Portal';
import { X } from '../../lib/icons';
import { useSwipeDown, GRAB_BAR_CLASS } from '../../lib/swipeDown';
import { INK, INK_2, PAPER, PAPER_DIM, TEXT_SOFT, SKY } from '../../theme';
import ExperienceForm from './ExperienceForm';

// Account > Lifting Preferences. Saves as you tap.
export default function ExperienceSheet({ answers, gym, onSave, onClose }) {
  const sheet = useSwipeDown(onClose);
  const set = (next) => onSave({ answers: Object.fromEntries(Object.entries(next).filter(([, v]) => v)), gym: gym || {} });
  const setGym = (next) => onSave({ answers, gym: next });
  return (
    <Portal>
      <div style={{ background: 'rgba(0,0,0,0.5)' }} className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
        <div ref={sheet.ref} {...sheet.handlers} style={{ background: INK_2, ...sheet.style }} className="w-full max-w-md rounded-t-2xl px-5 py-4 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div style={{ background: TEXT_SOFT, opacity: 0.45 }} className={GRAB_BAR_CLASS} />
          <div className="flex items-center justify-between mb-1">
            <span className="w-6" />
            <h2 style={{ color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="text-lg font-medium">Lifting Preferences</h2>
            <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-1 -m-1" aria-label="Close"><X size={20} /></button>
          </div>
          <div style={{ color: PAPER_DIM }} className="text-sm text-center mb-3">Which lifts do you love, know, want to learn, or want to skip? Programs and suggested workouts lean on your answers. Olympic lifts only appear if you say you know them.</div>
          <ExperienceForm answers={answers} onChange={set} gym={gym || {}} onGym={setGym} />
          <button onClick={onClose} style={{ background: SKY, color: INK }} className="w-full rounded-md py-2.5 text-sm font-medium">Done</button>
        </div>
      </div>
    </Portal>
  );
}
