import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Portal from '../../Portal';
import { INK, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY, AMBER, VIOLET } from '../../theme';

// A real guided tour over the live app — dims everything but the thing
// being explained, rather than standalone illustration slides. Each
// step names the real tab it lives on and a `[data-tour="..."]`
// selector already placed on that section's own element, so the
// highlight is always pointing at the actual, current UI.
const STEPS = [
  { tab: 'birdseye', selector: '[data-tour="tab-bar"]', color: LIME, title: 'Welcome to Groove', body: "This is your space to move more, feel better, and actually stick with it. These four tabs are your whole app — let's take a quick look at each." },
  { tab: 'birdseye', selector: '[data-tour="birdseye-goals"]', color: LIME, title: 'Weekly Goals', body: 'Your aerobic, resistance, and flexibility targets for the week. Tap a row to see a breakdown, or the pencil to adjust your goals.' },
  { tab: 'birdseye', selector: '[data-tour="birdseye-calendar"]', color: LIME, title: 'Calendar', body: 'Every workout you log shows up here. Tap a day with a dot to view it, or an empty day to log one for that date.' },
  { tab: 'birdseye', selector: '[data-tour="birdseye-science"]', color: LIME, title: 'Your Science & Strategy', body: "Your own plan, based on ACSM's exercise guidelines — including personal heart-rate zones once you've added a resting heart rate." },
  { tab: 'move', selector: '[data-tour="move-start"]', color: SKY, title: 'Start a Workout', body: 'Log a session as you go, or switch to "A past day" to add one you already did. Pick where you are and what kind of movement, and Move builds the session for you.' },
  { tab: 'move', selector: '[data-tour="move-history"]', color: SKY, title: 'History', body: 'Every past workout lives here — tap one to expand it, or Edit to add exercises after the fact.' },
  { tab: 'journal', selector: '[data-tour="journal-prompts"]', color: AMBER, title: 'Reflect', body: 'A guided post-movement check-in, or pick your own prompt anytime. A few honest minutes here genuinely helps things stick.' },
  { tab: 'journal', selector: '[data-tour="journal-entries"]', color: AMBER, title: 'Past Entries', body: 'Everything you write is private by default — swipe an entry left to edit or delete it.' },
  { tab: 'learn', selector: '[data-tour="learn-search"]', color: VIOLET, title: 'Search & Favorites', body: 'Look up a specific topic, or favorite the ones you want to find again later.' },
  { tab: 'learn', selector: '[data-tour="learn-list"]', color: VIOLET, title: 'Reasons to Move', body: 'Short, easy reads on the science behind why movement works — no jargon required.' },
  { tab: 'birdseye', selector: '[data-tour="account-button"]', color: LIME, title: "You're All Set", body: "Tap here anytime to message me, update your info, or finish setting up your account. Let's get moving." },
];

// SwipeTabs' own slide transition — the spotlight can't measure a
// target's real position until that finishes settling into view.
const TAB_SETTLE_MS = 320;

export default function AppTour({ tab, onChangeTab, onComplete }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const step = STEPS[index];
  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;

  useEffect(() => {
    if (tab !== step.tab) onChangeTab(step.tab);
    setRect(null);
    let cancelled = false;
    function measure() {
      const el = document.querySelector(step.selector);
      if (!el || cancelled) return;
      // Bring it fully into view first — a target lower on the page
      // (like the calendar) can otherwise sit partly or entirely below
      // the visible viewport, cutting off the spotlight around it.
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
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
    if (isLast) onComplete();
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

  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 400;
  const CARD_H = 190;
  const showBelow = !spot || spot.top + spot.height + CARD_H + 24 < viewportH;
  const cardStyle = spot
    ? showBelow
      ? { top: spot.top + spot.height + 16 }
      : { bottom: viewportH - spot.top + 16 }
    : { top: '50%', transform: 'translateY(-50%)' };

  return (
    <Portal>
      <div className="fixed inset-0 z-[100]">
        {/* Dark scrim with a rounded cutout at the target's position —
            a single element whose own oversized box-shadow paints the
            rest of the viewport, so the "hole" just falls out of moving
            this one box, transition included, instead of juggling four
            separate mask panels. */}
        <div
          style={{
            position: 'absolute',
            top: spot ? spot.top : viewportH / 2,
            left: spot ? spot.left : viewportW / 2,
            width: spot ? spot.width : 0,
            height: spot ? spot.height : 0,
            borderRadius: 14,
            border: spot ? `2px solid ${step.color}` : 'none',
            boxShadow: '0 0 0 9999px rgba(10,6,14,0.85)',
            opacity: spot ? 1 : 0,
            transition: 'top 0.32s cubic-bezier(0.22,1,0.36,1), left 0.32s cubic-bezier(0.22,1,0.36,1), width 0.32s cubic-bezier(0.22,1,0.36,1), height 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.25s ease',
          }}
        />
        {!spot && <div className="absolute inset-0" style={{ background: 'rgba(10,6,14,0.85)' }} />}

        <button onClick={onComplete} style={{ color: 'rgba(255,255,255,0.6)' }} className="absolute top-4 right-4 p-2 z-10">
          <X size={20} />
        </button>

        <div
          style={{ ...cardStyle, background: INK, border: `1px solid ${step.color}`, transition: 'top 0.32s ease, bottom 0.32s ease' }}
          className="absolute left-4 right-4 max-w-sm mx-auto rounded-xl px-5 py-5 z-10"
        >
          <div className="flex items-center gap-1.5 mb-3">
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
              {isLast ? 'Enter Groove' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
