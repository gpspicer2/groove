import React, { useRef, useState } from 'react';
import Portal from '../../Portal';
import { Info } from '../../lib/icons';
import { EXPERIENCE_GROUPS, EXPERIENCE_STATES } from './movements';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY, LIME, AMBER, ON_AMBER, BRICK } from '../../theme';

const TONES = { LIME: [LIME, INK], AMBER: [AMBER, ON_AMBER], SKY: [SKY, INK], BRICK: [BRICK, PAPER] }; // [color, text on that color]

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

// A four-stop slider from Love It to Skip It. Drag the pill, or just tap a stop. Nothing is chosen until it is touched.
function ExperienceSlider({ value, onChange, label }) {
  const ref = useRef(null);
  const dragging = useRef(false);
  const idx = EXPERIENCE_STATES.findIndex((x) => x.id === value);
  const pick = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - r.left, 0), r.width - 1);
    const next = EXPERIENCE_STATES[Math.floor((x / r.width) * EXPERIENCE_STATES.length)].id;
    if (next !== value) onChange(next);
  };
  const move = (d) => onChange(EXPERIENCE_STATES[Math.min(EXPERIENCE_STATES.length - 1, Math.max(0, (idx < 0 ? (d > 0 ? -1 : EXPERIENCE_STATES.length) : idx) + d))].id);
  const [tone, onTone] = idx >= 0 ? TONES[EXPERIENCE_STATES[idx].tone] : [TEXT_SOFT, INK];
  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={EXPERIENCE_STATES.length - 1}
      aria-valuenow={idx < 0 ? undefined : idx}
      aria-valuetext={idx < 0 ? 'Not answered' : EXPERIENCE_STATES[idx].label}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); move(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); } }}
      onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); pick(e); }}
      onPointerMove={(e) => { if (dragging.current) pick(e); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
      style={{ touchAction: 'none', background: INK_2 }}
      className="relative h-11 rounded-full select-none cursor-pointer"
    >
      <div className="absolute inset-0 grid grid-cols-4 rounded-full overflow-hidden">
        {EXPERIENCE_STATES.map((st) => {
          const [c] = TONES[st.tone];
          return <div key={st.id} style={{ background: `color-mix(in srgb, ${c} 22%, transparent)`, color: c }} className="flex items-center justify-center text-[15px] font-medium leading-tight whitespace-nowrap">{st.label}</div>;
        })}
      </div>
      {idx >= 0 && (
        <div
          style={{ left: `${idx * 25}%`, width: '25%', background: tone, color: onTone, boxShadow: '0 1px 4px rgba(0,0,0,0.3)', transition: 'left 0.15s ease-out, background 0.15s' }}
          className="absolute top-0.5 bottom-0.5 rounded-full flex items-center justify-center text-[15px] font-semibold leading-tight whitespace-nowrap pointer-events-none"
        >
          {EXPERIENCE_STATES[idx].label}
        </div>
      )}
    </div>
  );
}

// The survey itself: each movement with a slider from Love It to Skip It. The (i) explains the lift; Clear removes an answer.
export default function ExperienceForm({ answers, onChange }) {
  const [info, setInfo] = useState(null);
  return (
    <div className="text-left">
      {EXPERIENCE_GROUPS.map((g) => (
        <div key={g.title} className="mb-3">
          <div style={{ color: TEXT_SOFT }} className="text-base font-medium uppercase tracking-wide mb-1.5 text-center">{g.title}</div>
          <div className="space-y-1">
            {g.items.map((it) => (
              <div key={it.id} style={{ background: INK_3 }} className="rounded-md px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span style={{ color: PAPER }} className="text-base font-medium">{it.label}</span>
                  {it.info && <button onClick={() => setInfo(it)} style={{ color: SKY }} className="p-1 -m-0.5" aria-label={`What is ${it.label}?`}><Info size={16} /></button>}
                  {answers[it.id] && <button onClick={() => onChange({ ...answers, [it.id]: undefined })} style={{ color: TEXT_SOFT }} className="ml-auto text-sm underline">Clear</button>}
                </div>
                <ExperienceSlider label={it.label} value={answers[it.id]} onChange={(v) => onChange({ ...answers, [it.id]: v })} />
              </div>
            ))}
          </div>
        </div>
      ))}
      {info && <InfoPopup item={info} onClose={() => setInfo(null)} />}
    </div>
  );
}
