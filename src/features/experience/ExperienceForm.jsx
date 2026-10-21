import React, { useRef, useState, useEffect } from 'react';
import Portal from '../../Portal';
import { Info, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from '../../lib/icons';
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

function Row({ it, answers, onChange, onInfo }) {
  return (
    <div style={{ background: INK_3 }} className="rounded-md px-3 py-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span style={{ color: PAPER }} className="text-base font-medium">{it.label}</span>
        {it.info && <button onClick={() => onInfo(it)} style={{ color: SKY }} className="p-1 -m-0.5" aria-label={`What is ${it.label}?`}><Info size={16} /></button>}
        {answers[it.id] && <button onClick={() => onChange({ ...answers, [it.id]: undefined })} style={{ color: TEXT_SOFT }} className="ml-auto text-sm underline">Clear</button>}
      </div>
      <ExperienceSlider label={it.label} value={answers[it.id]} onChange={(v) => onChange({ ...answers, [it.id]: v })} />
    </div>
  );
}

// The survey itself: one page per muscle group (arrows, dots, or Next). Each page starts with a short list of the common lifts
// and a "More Lifts" fold-down for the rest. Every lift is a slider from Love It to Skip It; the (i) explains it.
export default function ExperienceForm({ answers, onChange }) {
  const [info, setInfo] = useState(null);
  const [page, setPage] = useState(0);
  const [openMore, setOpenMore] = useState({});
  const topRef = useRef(null);
  const g = EXPERIENCE_GROUPS[page];
  const last = EXPERIENCE_GROUPS.length - 1;
  const answeredMore = g.more.filter((it) => answers[it.id]).length;
  const moreOpen = openMore[g.title] ?? answeredMore > 0;
  useEffect(() => { topRef.current?.scrollIntoView({ block: 'nearest' }); }, [page]);
  const go = (n) => setPage(Math.min(last, Math.max(0, n)));
  const nav = (
    <div className="flex items-center justify-between my-2">
      <button onClick={() => go(page - 1)} disabled={page === 0} style={{ color: page === 0 ? TEXT_SOFT : SKY, opacity: page === 0 ? 0.4 : 1 }} className="text-base font-medium px-1 py-1.5 flex items-center gap-0.5"><ChevronLeft size={18} /> Back</button>
      <button onClick={() => go(page + 1)} disabled={page === last} style={{ color: page === last ? TEXT_SOFT : SKY, opacity: page === last ? 0.4 : 1 }} className="text-base font-medium px-1 py-1.5 flex items-center gap-0.5">Next <ChevronRight size={18} /></button>
    </div>
  );
  return (
    <div className="text-left">
      <div ref={topRef} className="flex items-center justify-between">
        <button onClick={() => go(page - 1)} disabled={page === 0} aria-label="Previous muscle group" style={{ color: TEXT_SOFT, opacity: page === 0 ? 0.3 : 1 }} className="p-2 -m-2"><ChevronLeft size={22} /></button>
        <div className="text-center">
          <div style={{ color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="text-xl font-medium uppercase tracking-wide">{g.title}</div>
          <div style={{ color: TEXT_SOFT }} className="text-sm">{page + 1} of {EXPERIENCE_GROUPS.length}</div>
        </div>
        <button onClick={() => go(page + 1)} disabled={page === last} aria-label="Next muscle group" style={{ color: TEXT_SOFT, opacity: page === last ? 0.3 : 1 }} className="p-2 -m-2"><ChevronRight size={22} /></button>
      </div>
      <div className="flex justify-center gap-1.5 my-2">
        {EXPERIENCE_GROUPS.map((x, i) => (
          <button key={x.title} onClick={() => go(i)} aria-label={x.title} style={{ background: i === page ? SKY : TEXT_SOFT, opacity: i === page ? 1 : 0.35 }} className="w-2 h-2 rounded-full" />
        ))}
      </div>

      <div className="space-y-1">
        {g.items.map((it) => <Row key={it.id} it={it} answers={answers} onChange={onChange} onInfo={setInfo} />)}
      </div>

      {g.more.length > 0 && (
        <>
          <button onClick={() => setOpenMore((m) => ({ ...m, [g.title]: !moreOpen }))} style={{ background: INK_3, color: SKY }} className="w-full rounded-md py-2.5 mt-2 text-base font-medium flex items-center justify-center gap-1.5">
            {moreOpen ? 'Fewer Lifts' : `More Lifts${answeredMore ? ` (${answeredMore} answered)` : ''}`} {moreOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {moreOpen && <div className="space-y-1 mt-1">{g.more.map((it) => <Row key={it.id} it={it} answers={answers} onChange={onChange} onInfo={setInfo} />)}</div>}
        </>
      )}

      {nav}
      {info && <InfoPopup item={info} onClose={() => setInfo(null)} />}
    </div>
  );
}
