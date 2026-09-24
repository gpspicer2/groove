import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Portal from '../../Portal';
import { INK, INK_2, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY, AMBER, VIOLET, BRICK } from '../../theme';

// A real guided tour over the live app — dims everything but the thing
// being explained, rather than standalone illustration slides. Each
// step names the real tab it lives on and a `[data-tour="..."]`
// selector already placed on that section's own element, so the
// highlight is always pointing at the actual, current UI. `selector:
// null` is a plain intro card for that tab, with nothing spotlighted.
const STEPS = [
  {
    tab: 'birdseye', selector: null, color: LIME, title: 'Welcome to Groove',
    body: "This is your space to move more, feel better, and actually stick with it. Everything lives in four tabs along the top — Birdseye, Move, Journal, and Learn — and you can swipe left or right anywhere on the screen to move between them, same as tapping the tab names. Let's walk through what each one does.",
  },
  {
    tab: 'birdseye', selector: null, color: LIME, title: 'Birdseye',
    body: "Birdseye is your weekly overview — how you're tracking against your goals, your workout calendar, and the science behind your plan. It's the best place to check in and see how your week is shaping up.",
  },
  { tab: 'birdseye', selector: '[data-tour="birdseye-goals"]', color: LIME, title: 'Weekly Goals', body: 'Your aerobic, resistance, and flexibility targets for the week. Tap a row to see a breakdown, or the pencil to adjust your goals.' },
  { tab: 'birdseye', selector: '[data-tour="birdseye-calendar"]', color: LIME, title: 'Calendar', body: 'Every workout you log shows up here. Tap a day with a dot to view it, or an empty day to log one for that date.' },
  { tab: 'birdseye', selector: '[data-tour="birdseye-science"]', color: LIME, title: 'Your Science & Strategy', body: "Your own plan, based on ACSM's exercise guidelines — including personal heart-rate zones once you've added a resting heart rate." },
  {
    tab: 'birdseye', selector: '[data-tour="birdseye-science"]', color: LIME, title: 'What Is ACSM?',
    body: "The American College of Sports Medicine — the leading scientific authority on exercise. Their guidelines are built from decades of peer-reviewed research, not guesswork. Every recommendation you see here reflects that same evidence base, and it's exactly what informs how I coach you.",
  },
  {
    tab: 'move', selector: null, color: SKY, title: 'Move',
    body: "Move is where you log your workouts — resistance, aerobic, flexibility, or a mix. Log one in the moment, or add one you already did on a past day.",
  },
  { tab: 'move', selector: '[data-tour="move-start"]', color: SKY, title: 'Start a Workout', body: 'Pick where you are and what kind of movement, and Move builds the session for you. Use the toggle at the top to log today, or switch to a past day.' },
  { tab: 'move', selector: '[data-tour="move-history"]', color: SKY, title: 'History', body: 'Every past workout lives here — tap one to expand it, or Edit to add exercises after the fact.' },
  {
    tab: 'journal', selector: null, color: AMBER, title: 'Journal',
    body: "A few minutes of reflection after a session — or anytime you want to check in with yourself. It's private by default, just for you.",
  },
  { tab: 'journal', selector: '[data-tour="journal-prompts"]', color: AMBER, title: 'Reflect', body: 'A guided post-movement check-in, or your own freeform prompt anytime. A few honest minutes here genuinely helps things stick.' },
  {
    tab: 'learn', selector: null, color: VIOLET, title: 'Learn',
    body: "Short, easy reads on the science behind why movement works — real research, minus the jargon. Think of it as a running list of reasons to move.",
  },
  { tab: 'learn', selector: '[data-tour="learn-search"]', color: VIOLET, title: 'Search & Favorites', body: 'Look up a specific topic, or favorite the ones you want to find again later.' },
  { tab: 'learn', selector: '[data-tour="learn-list"]', color: VIOLET, title: 'Reasons to Move', body: 'New tidbits get posted here regularly — check back for more.' },
  { tab: 'birdseye', selector: '[data-tour="account-button"]', color: LIME, title: 'One More Thing', body: 'Tap here anytime to message me, update your info, or finish setting up your account.' },
];

// SwipeTabs' own slide transition — the spotlight can't measure a
// target's real position until that finishes settling into view.
const TAB_SETTLE_MS = 320;

export default function AppTour({ tab, onChangeTab, onComplete }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [headerRect, setHeaderRect] = useState(null);
  const [phase, setPhase] = useState('steps'); // 'steps' | 'exitPrompt' | 'confirmSkip'
  const step = STEPS[index];
  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;

  useEffect(() => {
    const header = document.querySelector('[data-tour="app-header"]');
    if (header) setHeaderRect(header.getBoundingClientRect());
  }, [tab]);

  useEffect(() => {
    if (tab !== step.tab) onChangeTab(step.tab);
    setRect(null);
    if (!step.selector) return;
    let cancelled = false;
    function measure() {
      const el = document.querySelector(step.selector);
      if (!el || cancelled) return;
      // Bring it fully into view first — a target lower on the page
      // (like the calendar) can otherwise sit partly or entirely below
      // the visible viewport, cutting off the spotlight around it. The
      // tooltip card is bottom-anchored and covers roughly the lower
      // third of the screen, so center the target in the space ABOVE
      // that instead of the full viewport (plain scrollIntoView/center
      // would tuck the target's bottom half right under the card).
      const header = document.querySelector('[data-tour="app-header"]');
      const scroller = document.getElementById('app-scroll');
      if (header && scroller) {
        const availTop = header.getBoundingClientRect().bottom + 12;
        const availBottom = window.innerHeight * 0.62;
        const elRect = el.getBoundingClientRect();
        const delta = elRect.top + elRect.height / 2 - (availTop + availBottom) / 2;
        scroller.scrollTop += delta;
      } else {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
      requestAnimationFrame(() => {
        if (!cancelled) setRect(el.getBoundingClientRect());
      });
    }
    const t = setTimeout(measure, tab === step.tab ? 30 : TAB_SETTLE_MS);
    window.addEventListener('resize', measure);
    return () => {
      cancelled = true;
      clearTimeout(t);
      window.removeEventListener('resize', measure);
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

  const PAD = 8;
  const spot = rect && {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };
  const headerBottom = headerRect ? headerRect.bottom : 0;

  return (
    <Portal>
      <div className="fixed inset-0 z-[100]">
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
                transition: 'top 0.32s cubic-bezier(0.22,1,0.36,1), left 0.32s cubic-bezier(0.22,1,0.36,1), width 0.32s cubic-bezier(0.22,1,0.36,1), height 0.32s cubic-bezier(0.22,1,0.36,1)',
              }}
            />
          ) : (
            <div className="absolute inset-0" style={{ background: 'rgba(10,6,14,0.85)' }} />
          )}
        </div>

        {phase === 'steps' && (
          <button onClick={() => setPhase('exitPrompt')} style={{ color: 'rgba(255,255,255,0.6)' }} className="absolute top-4 right-4 p-2 z-10">
            <X size={20} />
          </button>
        )}

        {phase === 'steps' && (
          <div
            style={{ background: INK, border: `1px solid ${step.color}` }}
            className="absolute left-4 right-4 bottom-6 max-w-sm mx-auto rounded-xl px-5 py-5 z-10 text-center"
          >
            <div className="flex items-center justify-center gap-1.5 mb-3">
              {STEPS.map((s, i) => (
                <span key={i} style={{ background: i === index ? step.color : '#3a2c42', width: i === index ? 16 : 5 }} className="h-1.5 rounded-full transition-all" />
              ))}
            </div>
            <div style={{ color: step.color, fontFamily: 'Manrope, sans-serif' }} className="text-lg font-medium mb-1.5">
              {step.title}
            </div>
            <div style={{ color: PAPER_DIM }} className="text-sm mb-4">
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
          </div>
        )}

        {phase === 'exitPrompt' && (
          <div style={{ background: INK, border: `1px solid ${LIME}` }} className="absolute left-4 right-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto rounded-xl px-5 py-6 z-10 text-center">
            <div style={{ color: LIME, fontFamily: 'Manrope, sans-serif' }} className="text-lg font-medium mb-1.5">Let's get to know you</div>
            <div style={{ color: PAPER_DIM }} className="text-sm mb-5">
              One last thing — a few quick questions so I can actually coach you, not just hand you a generic plan. Takes about 10 minutes.
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
              Without that info I'm really just guessing at how to help you. It only takes about 10 minutes, and you can pick it up anytime from a banner on Birdseye — no rush.
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
