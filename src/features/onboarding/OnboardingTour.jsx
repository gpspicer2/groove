import React, { useState, useRef, useEffect } from 'react';
import { INK, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY, AMBER, VIOLET } from '../../theme';

// One-time walkthrough shown right after signup, before the client ever
// sees the real app — a quick orientation, not the baseline intake
// (that's asked for afterward, from a banner in Birdseye, so it never
// blocks someone from just looking around first).
const SLIDES = [
  { color: LIME, emoji: '👋', title: 'Welcome to Groove', body: "This is your space to move more, feel better, and actually stick with it. Let's take a quick look around — it'll only take a minute." },
  { color: LIME, emoji: '🦅', title: 'Birdseye', body: 'Your weekly goals, your calendar, and the science behind your plan — all in one place. Start here to see how your week is shaping up.' },
  { color: SKY, emoji: '🏃', title: 'Move', body: "Log a workout as you go, or add one after the fact. Pick what you're doing, and Move builds the session around you." },
  { color: AMBER, emoji: '📓', title: 'Journal', body: 'A few minutes of reflection after a session — or anytime you want to check in with yourself. Private by default, just for you.' },
  { color: VIOLET, emoji: '💡', title: 'Learn', body: 'Short, easy reads on why movement actually works — real science, minus the jargon.' },
  { color: LIME, emoji: '🎉', title: "You're all set", body: "That's the whole app. Once you're in, I'll ask you a few questions so I can actually coach you — no rush, do it whenever you're ready." },
];

export default function OnboardingTour({ onComplete }) {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [width, setWidth] = useState(0);
  const containerRef = useRef(null);
  const startRef = useRef(0);
  const isLast = index === SLIDES.length - 1;

  useEffect(() => {
    if (!containerRef.current) return;
    function measure() {
      if (containerRef.current) setWidth(containerRef.current.offsetWidth);
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  function goTo(i) {
    setIndex(Math.max(0, Math.min(SLIDES.length - 1, i)));
  }

  function handleTouchStart(e) {
    startRef.current = e.touches[0].clientX;
    setDragging(true);
  }
  function handleTouchMove(e) {
    const dx = e.touches[0].clientX - startRef.current;
    const next = (index === 0 && dx > 0) || (index === SLIDES.length - 1 && dx < 0) ? dx / 3 : dx;
    setDragX(next);
  }
  function handleTouchEnd() {
    const threshold = width * 0.2;
    if (dragX < -threshold) goTo(index + 1);
    else if (dragX > threshold) goTo(index - 1);
    setDragX(0);
    setDragging(false);
  }

  const translate = -index * width + dragX;

  return (
    <div style={{ background: INK }} className="h-[100svh] flex flex-col">
      <div className="flex-none flex items-center justify-between px-5 pt-safe pt-4">
        <div className="flex items-center gap-1.5">
          {SLIDES.map((s, i) => (
            <span
              key={i}
              style={{ background: i === index ? s.color : '#3a2c42', width: i === index ? 18 : 6 }}
              className="h-1.5 rounded-full transition-all"
            />
          ))}
        </div>
        {!isLast && (
          <button onClick={onComplete} style={{ color: TEXT_SOFT }} className="text-sm py-1 -m-1 px-1">
            Skip
          </button>
        )}
      </div>

      <div ref={containerRef} className="flex-1 min-h-0" style={{ overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            height: '100%',
            width: `${SLIDES.length * 100}%`,
            transform: `translateX(${translate}px)`,
            transition: dragging ? 'none' : 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {SLIDES.map((s, i) => (
            <div key={i} style={{ width: `${100 / SLIDES.length}%`, flexShrink: 0 }} className="h-full flex flex-col items-center justify-center px-8 text-center">
              <div
                style={{
                  fontSize: 56,
                  opacity: i === index ? 1 : 0.4,
                  transform: i === index ? 'scale(1)' : 'scale(0.85)',
                  transition: 'opacity 0.32s ease, transform 0.32s ease',
                }}
                className="mb-6"
              >
                {s.emoji}
              </div>
              <div style={{ color: s.color, fontFamily: 'Manrope, sans-serif' }} className="text-2xl font-medium mb-3">
                {s.title}
              </div>
              <div style={{ color: PAPER_DIM }} className="text-sm max-w-xs">
                {s.body}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-none px-6 pb-safe pb-8 pt-4 flex items-center gap-3">
        {index > 0 && (
          <button onClick={() => goTo(index - 1)} style={{ color: TEXT_SOFT }} className="text-sm py-3 px-2">
            Back
          </button>
        )}
        <button
          onClick={() => (isLast ? onComplete() : goTo(index + 1))}
          style={{ background: SLIDES[index].color, color: INK }}
          className="flex-1 rounded-md py-3 text-sm font-medium"
        >
          {isLast ? 'Enter Groove' : 'Next'}
        </button>
      </div>
    </div>
  );
}
