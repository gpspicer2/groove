import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Portal from '../../Portal';
import { INK, PAPER_DIM, TEXT_SOFT, LIME, SKY, AMBER, VIOLET, BRICK } from '../../theme';
import { GROOVE_DEFINITIONS } from '../../GrooveSheet';

// A real guided tour over the live app — dims everything but the thing
// being explained, rather than standalone illustration slides. Each
// step names the real tab it lives on and a `[data-tour="..."]`
// selector already placed on that section's own element, so the
// highlight is always pointing at the actual, current UI. `selector:
// null` is a plain card with nothing spotlighted — `pos: 'top'` for a
// tab's general intro (so it doesn't leave a big empty gap under the
// header), `pos: 'center'` for a pause/aside that isn't introducing a
// feature. Steps with a selector always anchor their card to the
// bottom, out of the way of whatever's highlighted above it.
const STEPS = [
  {
    tab: 'birdseye', selector: null, pos: 'center', color: LIME, title: "Welcome, It's Time to Groove", type: 'groove',
  },
  {
    tab: 'birdseye', selector: null, pos: 'top', color: LIME, title: 'Getting Around',
    body: "This is your space to move more, feel better, and actually stick with it. Everything lives in four tabs along the top — Birdseye, Move, Journal, and Learn — and you can swipe left or right anywhere on the screen to move between them, same as tapping the tab names. Let's walk through what each one does.",
  },
  {
    tab: 'birdseye', selector: '[data-tour="tab-birdseye"]', pos: 'top', color: LIME, title: 'Birdseye',
    body: "Birdseye is your weekly overview — the progress you're making towards your goals, your workout calendar, and the science behind your plan. It's the best place to check in and see how your week is shaping up.",
  },
  { tab: 'birdseye', selector: '[data-tour="birdseye-goals"]', pos: 'bottom', color: LIME, title: 'Weekly Goals', body: 'Your aerobic, resistance, and flexibility targets for the week. Tap a row to see a breakdown, or the pencil to adjust your goals.' },
  { tab: 'birdseye', selector: '[data-tour="birdseye-calendar"]', pos: 'bottom', color: LIME, title: 'Calendar', body: 'Every workout you log shows up here. Tap a day with a dot to view it, or an empty day to log one for that date.' },
  { tab: 'birdseye', selector: '[data-tour="birdseye-science"]', pos: 'bottom', color: LIME, title: 'Your Science & Strategy', body: "Your own plan, based on ACSM's exercise guidelines — including personal heart-rate zones once you've added a resting heart rate. Scroll up or down to see the whole thing." },
  {
    tab: 'birdseye', selector: null, pos: 'center', color: LIME, title: 'What Is ACSM?',
    body: "The American College of Sports Medicine — the leading scientific authority on exercise. Their guidelines are built from decades of peer-reviewed research, not guesswork. Every recommendation you just saw reflects that same evidence base, and it's exactly what informs how I coach you.",
  },
  {
    tab: 'move', selector: '[data-tour="tab-move"]', pos: 'top', color: SKY, title: 'Move',
    body: "Move is where you log your workouts — resistance, aerobic, flexibility, or a mix. Log one in the moment, or add one you already did on a past day.",
  },
  { tab: 'move', selector: '[data-tour="move-start"]', pos: 'bottom', color: SKY, title: 'Start a Workout', body: 'Pick where you are and what kind of movement, and Move builds the session for you. Use the toggle at the top to log today, or switch to a past day.' },
  {
    tab: 'journal', selector: '[data-tour="tab-journal"]', pos: 'top', color: AMBER, title: 'Journal',
    body: "A few minutes of reflection after a session — or anytime you want to check in with yourself. It's private by default, just for you.",
  },
  { tab: 'journal', selector: '[data-tour="journal-prompts"]', pos: 'bottom', color: AMBER, title: 'Reflect', body: 'A guided post-movement check-in, or your own freeform prompt anytime. A few honest minutes here genuinely helps things stick.' },
  {
    tab: 'learn', selector: '[data-tour="tab-learn"]', pos: 'top', color: VIOLET, title: 'Learn',
    body: "Short, easy reads on the science behind why movement works — real research, minus the jargon. Think of it as a running list of reasons to move.",
  },
  { tab: 'learn', selector: '[data-tour="learn-list"]', pos: 'bottom', color: VIOLET, title: 'Reasons to Move', body: 'New tidbits get posted here regularly — check back for more.' },
  {
    tab: 'birdseye', selector: '[data-tour="account-button"]', pos: 'bottom', color: LIME, title: 'Your Account Settings',
    body: "Tap here to message me directly (right at the top), change your password or payment info, update your age, gender, or which day your week starts on, and manage your baseline data — including your intake questionnaire if you skipped it.",
  },
];

// SwipeTabs' own slide transition — the spotlight can't measure a
// target's real position until that finishes settling into view.
const TAB_SETTLE_MS = 320;

export default function AppTour({ tab, onChangeTab, onComplete }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [headerRect, setHeaderRect] = useState(null);
  const [phase, setPhase] = useState('steps'); // 'steps' | 'confirmSkipTour' | 'exitPrompt' | 'confirmSkip'
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const elRef = useRef(null);
  const touchRef = useRef({ x: 0, y: 0, axis: null, lastY: 0 });
  const step = STEPS[index];
  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;

  useEffect(() => {
    const header = document.querySelector('[data-tour="app-header"]');
    if (header) setHeaderRect(header.getBoundingClientRect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, index]);

  // Mobile Safari's address bar collapsing/expanding as you scroll
  // resizes the visual viewport without firing a normal window
  // "resize" event — every position measured against the viewport
  // (the header, and any header-based ring like the tab buttons or the
  // G/account buttons) goes stale until this fires and re-measures.
  useEffect(() => {
    function remeasure() {
      const header = document.querySelector('[data-tour="app-header"]');
      if (header) setHeaderRect(header.getBoundingClientRect());
      if (elRef.current) setRect(elRef.current.getBoundingClientRect());
    }
    const vv = window.visualViewport;
    window.addEventListener('resize', remeasure);
    if (vv) {
      vv.addEventListener('resize', remeasure);
      vv.addEventListener('scroll', remeasure);
    }
    return () => {
      window.removeEventListener('resize', remeasure);
      if (vv) {
        vv.removeEventListener('resize', remeasure);
        vv.removeEventListener('scroll', remeasure);
      }
    };
  }, []);

  useEffect(() => {
    if (tab !== step.tab) onChangeTab(step.tab);
    setRect(null);
    elRef.current = null;
    if (!step.selector) return;
    let cancelled = false;
    function updateRect() {
      if (elRef.current && !cancelled) setRect(elRef.current.getBoundingClientRect());
    }
    function measure() {
      const el = document.querySelector(step.selector);
      if (!el || cancelled) return;
      elRef.current = el;
      // Align the target's top just under the header rather than
      // centering it — a tall section (Science & Strategy) otherwise
      // gets its bottom cut off, with no way to see the rest of it.
      const header = document.querySelector('[data-tour="app-header"]');
      const scroller = document.getElementById('app-scroll');
      const isInHeader = header && header.contains(el);
      if (isInHeader) {
        // Fixed in place, not part of the scrollable area — nothing to
        // bring into view.
      } else if (header && scroller) {
        // Smooth, not instant — sections should visibly scroll from one
        // to the next rather than snapping into place. The spotlight
        // itself re-measures on every scroll tick (see the scroll
        // listener below) so it stays glued to the target the whole way.
        const availTop = header.getBoundingClientRect().bottom + 12;
        const delta = el.getBoundingClientRect().top - availTop;
        scroller.scrollBy({ top: delta, behavior: 'smooth' });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      requestAnimationFrame(updateRect);
    }
    const t = setTimeout(measure, tab === step.tab ? 30 : TAB_SETTLE_MS);
    const scrollerEl = document.getElementById('app-scroll');
    window.addEventListener('resize', updateRect);
    if (scrollerEl) scrollerEl.addEventListener('scroll', updateRect, { passive: true });
    return () => {
      cancelled = true;
      clearTimeout(t);
      window.removeEventListener('resize', updateRect);
      if (scrollerEl) scrollerEl.removeEventListener('scroll', updateRect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function next() {
    if (isLast) setPhase('exitPrompt');
    else setIndex((i) => i + 1);
  }
  function back() {
    if (!isFirst) setIndex((i) => i - 1);
  }

  // Side-to-side only — letting a vertical drag also scroll the real
  // page underneath (an earlier version did this, to reach the bottom
  // of tall sections) turned out to feel finicky rather than helpful,
  // so a vertical drag here does nothing at all now.
  function handleTouchStart(e) {
    if (phase !== 'steps') return;
    // Any real button (Skip, Back, Next, or a card in the "groove"
    // step) handles its own tap — don't let the drag-gesture tracking
    // on the outer container get involved at all, or it can end up
    // swallowing what should've been a plain click.
    if (e.target.closest('button')) return;
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, axis: null };
    setDragging(true);
  }
  function handleTouchMove(e) {
    if (phase !== 'steps') return;
    if (e.target.closest('button')) return;
    const t = e.touches[0];
    const tr = touchRef.current;
    const dx = t.clientX - tr.x;
    const dy = t.clientY - tr.y;
    if (tr.axis === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      tr.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (tr.axis === 'x') setDragX(dx);
  }
  function handleTouchEnd(e) {
    if (phase !== 'steps') return;
    if (e.target.closest('button')) { touchRef.current.axis = null; return; }
    const tr = touchRef.current;
    if (tr.axis === 'x') {
      const threshold = 70;
      if (dragX < -threshold) next();
      else if (dragX > threshold && !isFirst) back();
    }
    setDragX(0);
    setDragging(false);
    touchRef.current.axis = null;
  }

  const PAD = 8;
  const spot = rect && {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };
  const headerBottom = headerRect ? headerRect.bottom : 0;

  const cardStyle =
    step.pos === 'top'
      ? { top: headerBottom + 16 }
      : step.pos === 'center'
      ? { top: '50%', transform: 'translateY(-50%)' }
      : { bottom: 24 };

  return (
    <Portal>
      <div className="fixed inset-0 z-[100]" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}>
        {/* The header (logo + tab bar) stays fully visible at every
            step, so a client always has their bearings — everything
            below it is what dims, clipped to this region so the
            spotlight's own "huge shadow" trick never bleeds upward
            into the header. */}
        <div style={{ position: 'fixed', top: headerBottom, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
          {phase === 'steps' && spot ? (
            <div
              style={{
                position: 'absolute',
                top: spot.top - headerBottom,
                left: spot.left,
                width: spot.width,
                height: spot.height,
                borderRadius: 14,
                border: `2px solid ${step.color}`,
                boxShadow: '0 0 0 9999px rgba(10,6,14,0.85)',
                transition: dragging ? 'none' : 'top 0.32s cubic-bezier(0.22,1,0.36,1), left 0.32s cubic-bezier(0.22,1,0.36,1), width 0.32s cubic-bezier(0.22,1,0.36,1), height 0.32s cubic-bezier(0.22,1,0.36,1)',
              }}
            />
          ) : (
            <div className="absolute inset-0" style={{ background: 'rgba(10,6,14,0.85)' }} />
          )}
        </div>

        {/* A target that lives IN the header (the G button) sits inside
            the always-visible region above, outside the clipped scrim
            entirely — draw its ring directly, in real screen coords,
            since there's nothing to cut a hole out of there anyway. */}
        {phase === 'steps' && spot && spot.top < headerBottom && (
          <div
            style={{
              position: 'fixed',
              top: spot.top,
              left: spot.left,
              width: spot.width,
              height: spot.height,
              borderRadius: 14,
              border: `2px solid ${step.color}`,
              transition: 'top 0.32s cubic-bezier(0.22,1,0.36,1), left 0.32s cubic-bezier(0.22,1,0.36,1), width 0.32s cubic-bezier(0.22,1,0.36,1), height 0.32s cubic-bezier(0.22,1,0.36,1)',
            }}
          />
        )}

        {/* A small arrow bridging the card up to whichever tab it's
            describing, so it reads as "that one" rather than a caption
            floating near the top of the screen. */}
        {phase === 'steps' && spot && spot.top < headerBottom && step.pos === 'top' && (
          <div
            style={{
              position: 'fixed',
              top: headerBottom,
              left: spot.left + spot.width / 2 - 7,
              width: 0,
              height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderBottom: `9px solid ${step.color}`,
              transition: 'left 0.32s cubic-bezier(0.22,1,0.36,1)',
            }}
          />
        )}

        {phase === 'steps' && (
          <div
            style={{
              ...cardStyle,
              background: INK,
              border: `1px solid ${step.color}`,
              transform: `${cardStyle.transform || ''} translateX(${dragX}px)`.trim(),
              opacity: 1 - Math.min(0.5, Math.abs(dragX) / 400),
              transition: dragging ? 'none' : 'transform 0.25s ease, opacity 0.25s ease',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            className="absolute left-4 right-4 max-w-sm mx-auto rounded-xl px-5 py-5 z-10 text-center"
          >
            <div className="flex items-center justify-center gap-1.5 mb-3">
              {STEPS.map((s, i) => (
                <span key={i} style={{ background: i === index ? step.color : '#3a2c42', width: i === index ? 16 : 5 }} className="h-1.5 rounded-full transition-all" />
              ))}
            </div>
            <div style={{ color: step.color, fontFamily: 'Manrope, sans-serif' }} className="text-lg font-medium mb-1.5">
              {step.title}
            </div>
            {step.type === 'groove' ? (
              <div className="text-center space-y-3 mb-4">
                {GROOVE_DEFINITIONS.map((d) => (
                  <div key={d.term}>
                    <div style={{ color: d.color }} className="text-sm uppercase tracking-wide font-bold mb-0.5">{d.term}</div>
                    <div style={{ color: PAPER_DIM }} className="text-sm">{d.text}</div>
                  </div>
                ))}
                <div style={{ color: TEXT_SOFT }} className="text-sm text-center pt-1">Tap the G in the corner anytime to see this again.</div>
              </div>
            ) : (
              <div style={{ color: PAPER_DIM }} className="text-sm mb-4">
                {step.body}
              </div>
            )}
            <div className="flex items-center gap-3">
              {!isFirst && (
                <button onClick={back} style={{ color: TEXT_SOFT }} className="text-sm py-2.5 px-2">
                  Back
                </button>
              )}
              <button onClick={next} style={{ background: step.color, color: INK }} className="flex-1 rounded-md py-2.5 text-sm font-medium">
                {isLast ? "I'm ready" : 'Next'}
              </button>
            </div>
            <button onClick={() => setPhase('confirmSkipTour')} style={{ color: TEXT_SOFT }} className="w-full flex items-center justify-center gap-1 text-sm py-2.5 mt-1">
              Skip tutorial <X size={14} />
            </button>
          </div>
        )}

        {phase === 'confirmSkipTour' && (
          <div style={{ background: INK, border: `1px solid ${LIME}` }} className="absolute left-4 right-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto rounded-xl px-5 py-6 z-10 text-center">
            <div style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-lg font-medium mb-1.5">Skip the tutorial?</div>
            <div style={{ color: PAPER_DIM }} className="text-sm mb-5">
              No worries — you can look around on your own instead.
            </div>
            <button onClick={() => setPhase('exitPrompt')} style={{ background: LIME, color: INK }} className="w-full rounded-md py-2.5 text-sm font-medium mb-2">
              Yes, skip it
            </button>
            <button onClick={() => setPhase('steps')} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2">
              Keep going
            </button>
          </div>
        )}

        {phase === 'exitPrompt' && (
          <div style={{ background: INK, border: `1px solid ${LIME}` }} className="absolute left-4 right-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto rounded-xl px-5 py-6 z-10 text-center">
            <div style={{ color: LIME, fontFamily: 'Manrope, sans-serif' }} className="text-lg font-medium mb-1.5">Let's get to know you</div>
            <div style={{ color: PAPER_DIM }} className="text-sm mb-5">
              A few quick questions so I can actually coach you, not just hand you a generic plan. Takes about 10 minutes.
            </div>
            <button onClick={() => onComplete(true)} style={{ background: LIME, color: INK }} className="w-full rounded-md py-2.5 text-sm font-medium mb-2">
              Let's do it now
            </button>
            <button onClick={() => setPhase('confirmSkip')} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2">
              I'll do it later
            </button>
          </div>
        )}

        {phase === 'confirmSkip' && (
          <div style={{ background: INK, border: `1px solid ${BRICK}` }} className="absolute left-4 right-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto rounded-xl px-5 py-6 z-10 text-center">
            <div style={{ color: BRICK, fontFamily: 'Manrope, sans-serif' }} className="text-lg font-medium mb-1.5">Heads up</div>
            <div style={{ color: PAPER_DIM }} className="text-sm mb-5">
              Without that info I'm really just guessing at how to help you. It only takes about 10 minutes, and you can pick it up anytime from Account → Baseline Data — no rush.
            </div>
            <button onClick={() => setPhase('exitPrompt')} style={{ background: LIME, color: INK }} className="w-full rounded-md py-2.5 text-sm font-medium mb-2">
              Actually, let's do it now
            </button>
            <button onClick={() => onComplete(false)} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2">
              Skip for now
            </button>
          </div>
        )}
      </div>
    </Portal>
  );
}
