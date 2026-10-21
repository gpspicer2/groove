import React, { useState } from 'react';
import Portal from '../../Portal';
import { Info } from '../../lib/icons';
import { EXPERIENCE_GROUPS, EXPERIENCE_STATES } from './movements';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY } from '../../theme';

// A short "what is this lift?" popup.
function InfoPopup({ item, onClose }) {
  return (
    <Portal>
      <div style={{ background: 'rgba(0,0,0,0.5)' }} className="fixed inset-0 z-[60] flex items-center justify-center px-6" onClick={onClose}>
        <div style={{ background: INK_2 }} className="w-full max-w-xs rounded-xl px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
          <div style={{ color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="text-base font-medium mb-1.5">{item.label}</div>
          <div style={{ color: PAPER_DIM }} className="text-sm mb-3">{item.info}</div>
          <button onClick={onClose} style={{ background: SKY, color: INK }} className="w-full rounded-md py-2 text-sm font-medium">Got It</button>
        </div>
      </div>
    </Portal>
  );
}

// The survey itself: each movement with four small choices. Tap a choice again to clear it. The (i) explains the lift.
export default function ExperienceForm({ answers, onChange }) {
  const [info, setInfo] = useState(null);
  return (
    <div className="text-left">
      {EXPERIENCE_GROUPS.map((g) => (
        <div key={g.title} className="mb-3">
          <div style={{ color: TEXT_SOFT }} className="text-base font-medium uppercase tracking-wide mb-1.5 text-center">{g.title}</div>
          <div className="space-y-1">
            {g.items.map((it) => (
              <div key={it.id} style={{ background: INK_3 }} className="rounded-md px-3 py-1.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span style={{ color: PAPER }} className="text-base font-medium">{it.label}</span>
                  {it.info && <button onClick={() => setInfo(it)} style={{ color: SKY }} className="p-1 -m-0.5" aria-label={`What is ${it.label}?`}><Info size={16} /></button>}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {EXPERIENCE_STATES.map((s) => {
                    const on = answers[it.id] === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => onChange({ ...answers, [it.id]: on ? undefined : s.id })}
                        style={{ background: on ? SKY : 'transparent', color: on ? INK : PAPER_DIM, border: `1px solid ${on ? SKY : TEXT_SOFT}` }}
                        className="rounded-md py-1 text-[15px] leading-tight font-medium whitespace-nowrap"
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {info && <InfoPopup item={info} onClose={() => setInfo(null)} />}
    </div>
  );
}
