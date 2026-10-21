import React from 'react';
import { EXPERIENCE_GROUPS, EXPERIENCE_STATES } from './movements';
import { INK, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY } from '../../theme';

// The survey itself: each movement with three small choices. Tap a choice again to clear it.
export default function ExperienceForm({ answers, onChange }) {
  return (
    <div className="text-left">
      {EXPERIENCE_GROUPS.map((g) => (
        <div key={g.title} className="mb-3">
          <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-1.5">{g.title}</div>
          <div className="space-y-1.5">
            {g.items.map((it) => (
              <div key={it.id} style={{ background: INK_3 }} className="rounded-md px-3 py-2">
                <div style={{ color: PAPER }} className="text-sm font-medium mb-1.5">{it.label}</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {EXPERIENCE_STATES.map((s) => {
                    const on = answers[it.id] === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => onChange({ ...answers, [it.id]: on ? undefined : s.id })}
                        style={{ background: on ? SKY : 'transparent', color: on ? INK : PAPER_DIM, border: `1px solid ${on ? SKY : TEXT_SOFT}` }}
                        className="rounded-md py-1.5 text-[13px] font-medium"
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
    </div>
  );
}
