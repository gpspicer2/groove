import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Portal from '../../Portal';
import { INK, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY, AMBER, VIOLET, BRICK, PLUM } from '../../theme';

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
    tab: 'birdseye', selector: null, pos: 'center', color: PLUM, allTabs: true, title: "Welcome\nIt's Time to Groove",
    body: "Move more, feel better, and stick with it.",
  },
  {
    tab: 'birdseye', selector: null, pos: 'top', color: PLUM, allTabs: true, title: 'Four Tabs, Swipe or Tap',
    body: "Birdseye, Move, Journal, Learn — swipe left or right anywhere, or tap a name.",
  },
  {
    tab: 'birdseye', selector: '[data-tour="tab-birdseye"]', pos: 'top', color: LIME, title: 'Birdseye',
    body: "Your weekly overview — progress, calendar, and the science behind your plan.",
  },
  {
    tab: 'move', selector: '[data-tour="tab-move"]', pos: 'top', color: SKY, title: 'Move',
    body: "Log any kind of workout, today or a past day.",
  },
  {
    tab: 'journal', selector: '[data-tour="tab-journal"]', pos: 'top', color: AMBER, title: 'Journal',
    body: "Your private space to reflect. Only you can read it.",
  },
  {
    tab: 'learn', selector: '[data-tour="tab-learn"]', pos: 'top', color: VIOLET, title: 'Learn',
    body: "Short reads on movement and sticking with it.",
  },
  {
    tab: 'birdseye', selector: '[data-tour="account-button"]', pos: 'bottom', color: PLUM, noTabs: true, title: 'Your Account',
    body: "Message me, manage settings, and update your baseline data anytime.",
  },
];

// SwipeTabs' own slide transition — the spotlight can't measure a
// target's real position until that finishes settling into view.
const TAB_SETTLE_MS = 320;

export default function AppTour({ tab, onChangeTab, onComplete, onTabHighlight }) {
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

  // App-wide steps light up every tab in its own color, so the opening
  // doesn't read as Birdseye's; the Account step lights none.
  const tabHighlight = phase !== 'steps' ? null : step.allTabs ? 'all' : step.noTabs ? 'none' : null;
  useEffect(() => {
    onTabHighlight?.(tabHighlight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabHighlight]);
  useEffect(() => () => onTabHighlight?.(null), []); // eslint-disable-line react-hooks/exhaustive-deps

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
            <div style={{ color: step.color, fontFamily: 'Manrope, sans-serif' }} className="text-xl font-semibold mb-2 whitespace-pre-line">
              {step.title}
            </div>
            <div style={{ color: PAPER_DIM }} className="text-base mb-4 leading-snug">
              {step.body}
            </div>
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
            <div style={{ color: PAPER_DIM }} className="text-base mb-5 leading-snug">
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
            <div style={{ color: PAPER_DIM }} className="text-base mb-5 leading-snug">
              A few questions so I can coach you. About 10 minutes.
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
            <div style={{ color: PAPER_DIM }} className="text-base mb-5 leading-snug">
              No rush. You can finish it anytime from Account.
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
