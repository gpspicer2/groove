import React, { useRef, useState, useEffect } from 'react';
import Portal from '../../Portal';
import { Info, Check, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from '../../lib/icons';
import { EXPERIENCE_GROUPS, EXPERIENCE_STATES, EQUIPMENT_ITEMS, GYM_TYPES, gymHas } from './movements';
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

// A four-stop bar from Love It to Skip It: tap a stop and the pill slides there. Nothing is chosen until it is touched.
// Time of the last scroll anywhere (the sheet scrolls, not the page), so a touch that merely stops a scroll is never an answer.
let lastScrollAt = 0;
if (typeof document !== 'undefined') document.addEventListener('scroll', () => { lastScrollAt = Date.now(); }, true);

function ExperienceSlider({ value, onChange, label }) {
  const ref = useRef(null);
  const g = useRef(null); // the gesture in progress: { x, y, drag, ignore }
  const idx = EXPERIENCE_STATES.findIndex((x) => x.id === value);
  const pick = (clientX) => {
    const r = ref.current.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - r.left, 0), r.width - 1);
    const next = EXPERIENCE_STATES[Math.floor((x / r.width) * EXPERIENCE_STATES.length)].id;
    if (next !== value) onChange(next);
  };
  const move = (d) => onChange(EXPERIENCE_STATES[Math.min(EXPERIENCE_STATES.length - 1, Math.max(0, (idx < 0 ? (d > 0 ? -1 : EXPERIENCE_STATES.length) : idx) + d))].id);
  const [tone, onTone] = idx >= 0 ? TONES[EXPERIENCE_STATES[idx].tone] : [TEXT_SOFT, INK];
  // Answers are taps only (no dragging the pill), so a sideways swipe on a bar changes the muscle group instead.
  // Scrolling, and a touch that merely stops a scroll in progress, never answer.
  const down = (e) => { g.current = { x: e.clientX, y: e.clientY, ignore: e.pointerType !== 'mouse' && Date.now() - lastScrollAt < 250 }; };
  const up = (e) => {
    const s = g.current; g.current = null;
    if (!s || s.ignore) return;
    if (Math.abs(e.clientX - s.x) < 10 && Math.abs(e.clientY - s.y) < 10) pick(e.clientX);
  };
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
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={() => { g.current = null; }}
      style={{ touchAction: 'pan-y', background: INK_2 }}
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
export default function ExperienceForm({ answers, onChange, gym = {}, onGym = null }) {
  const [info, setInfo] = useState(null);
  const [page, setPage] = useState(0);
  const [openMore, setOpenMore] = useState({});
  const topRef = useRef(null);
  const swipe = useRef(null);
  const dir = useRef(1); // 1 = moving forward (the new page comes in from the right)
  // Muscle-group pages, plus a last "Your Gym" page (equipment questions) when the form can save it.
  const pages = onGym ? [...EXPERIENCE_GROUPS, { title: 'Your Gym', gym: true, items: [], more: [] }] : EXPERIENCE_GROUPS;
  const g = pages[page];
  const last = pages.length - 1;
  const answeredMore = g.more.filter((it) => answers[it.id]).length;
  const moreOpen = openMore[g.title] ?? answeredMore > 0;
  // A new page starts at its top (the sheet is the scroller).
  useEffect(() => { topRef.current?.closest('.overflow-y-auto')?.scrollTo({ top: 0 }); }, [page]);
  const go = (n) => { const to = Math.min(last, Math.max(0, n)); if (to !== page) { dir.current = to > page ? 1 : -1; setPage(to); } };
  const nav = (
    <div className="flex items-center justify-between my-2">
      <button onClick={() => go(page - 1)} disabled={page === 0} style={{ color: page === 0 ? TEXT_SOFT : SKY, opacity: page === 0 ? 0.4 : 1 }} className="text-base font-medium px-1 py-1.5 flex items-center gap-0.5"><ChevronLeft size={18} /> Back</button>
      <button onClick={() => go(page + 1)} disabled={page === last} style={{ color: page === last ? TEXT_SOFT : SKY, opacity: page === last ? 0.4 : 1 }} className="text-base font-medium px-1 py-1.5 flex items-center gap-0.5">Next <ChevronRight size={18} /></button>
    </div>
  );
  // Swipe sideways anywhere (bars included, since answers are taps) to change muscle group.
  const swipeStart = (e) => {
    const t = e.touches[0];
    swipe.current = { x: t.clientX, y: t.clientY };
  };
  const swipeEnd = (e) => {
    const s0 = swipe.current; swipe.current = null;
    if (!s0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s0.x; const dy = t.clientY - s0.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(page + (dx < 0 ? 1 : -1));
  };
  return (
    <div className="text-left" onTouchStart={swipeStart} onTouchEnd={swipeEnd} style={{ touchAction: 'pan-y' }}>
      {/* The muscle group stays pinned while the lifts scroll. */}
      <div style={{ background: INK_2 }} className="sticky top-0 z-10 -mx-5 px-5 pt-1 pb-0.5">
      <div ref={topRef} className="flex items-center justify-between">
        <button onClick={() => go(page - 1)} disabled={page === 0} aria-label="Previous muscle group" style={{ color: TEXT_SOFT, opacity: page === 0 ? 0.3 : 1 }} className="p-2 -m-2"><ChevronLeft size={22} /></button>
        <div key={page} className={`text-center ${dir.current > 0 ? 'groove-slide-from-right' : 'groove-slide-from-left'}`}>
          <div style={{ color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="text-xl font-medium uppercase tracking-wide">{g.title}</div>
          <div style={{ color: TEXT_SOFT }} className="text-sm">{page + 1} of {pages.length}</div>
        </div>
        <button onClick={() => go(page + 1)} disabled={page === last} aria-label="Next muscle group" style={{ color: TEXT_SOFT, opacity: page === last ? 0.3 : 1 }} className="p-2 -m-2"><ChevronRight size={22} /></button>
      </div>
      <div className="flex justify-center gap-1.5 my-2">
        {pages.map((x, i) => (
          <button key={x.title} onClick={() => go(i)} aria-label={x.title} style={{ background: i === page ? SKY : TEXT_SOFT, opacity: i === page ? 1 : 0.35 }} className="w-2 h-2 rounded-full" />
        ))}
      </div>
      </div>

      <div key={page} className={dir.current > 0 ? 'groove-slide-from-right' : 'groove-slide-from-left'}>
      {g.gym ? (
        <div className="text-center">
          <div style={{ color: PAPER_DIM }} className="text-sm mb-2">Suggested workouts only use equipment you have. You can still add any exercise by hand.</div>
          <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-1.5">Quick Start</div>
          <div className="flex flex-wrap justify-center gap-1.5 mb-3">
            {GYM_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => onGym({ ...gym, has: { ...t.has }, smith: t.has.smith, type: t.id })}
                style={{ background: gym.type === t.id ? SKY : INK_3, color: gym.type === t.id ? INK : PAPER }}
                className="rounded-full px-3 py-1.5 text-sm font-medium"
              >
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-1.5">What Does Your Gym Have?</div>
          <div className="grid grid-cols-2 gap-1.5">
            {EQUIPMENT_ITEMS.map((it) => {
              const on = gymHas(gym, it.id);
              return (
                <button
                  key={it.id}
                  onClick={() => {
                    const has = Object.fromEntries(EQUIPMENT_ITEMS.map((x) => [x.id, gymHas(gym, x.id)]));
                    has[it.id] = !on;
                    onGym({ ...gym, has, smith: has.smith, type: undefined });
                  }}
                  aria-pressed={on}
                  style={{ background: on ? SKY : INK_3, color: on ? INK : PAPER_DIM }}
                  className="rounded-md px-2 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5"
                >
                  {on ? <Check size={14} /> : null} {it.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
      <div className="space-y-1">
        {g.items.map((it) => <Row key={it.id} it={it} answers={answers} onChange={onChange} onInfo={setInfo} />)}
      </div>
      )}

      {g.more.length > 0 && (
        <>
          {moreOpen && <div className="space-y-1 mt-1">{g.more.map((it) => <Row key={it.id} it={it} answers={answers} onChange={onChange} onInfo={setInfo} />)}</div>}
          <button onClick={() => setOpenMore((m) => ({ ...m, [g.title]: !moreOpen }))} style={{ background: INK_3, color: SKY }} className="w-full rounded-md py-2.5 mt-2 text-base font-medium flex items-center justify-center gap-1.5">
            {moreOpen ? 'Fewer Lifts' : `More Lifts${answeredMore ? ` (${answeredMore} answered)` : ''}`} {moreOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </>
      )}

      </div>

      {nav}
      {info && <InfoPopup item={info} onClose={() => setInfo(null)} />}
    </div>
  );
}
