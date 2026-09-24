import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { X } from 'lucide-react';
import Portal from './Portal';
import { INK_2, PAPER_DIM, TEXT_SOFT, LIME, AMBER, SKY, VIOLET, MOSS } from './theme';

export const GROOVE_DEFINITIONS = [
  { term: 'Feeling good', color: AMBER, text: '"Getting your groove on" — movement as something you enjoy, not a box to check.' },
  { term: 'Rhythm', color: SKY, text: 'A steady, repeating beat you settle into — the pulse under the music, and the pulse under a session once you find your pace.' },
  { term: 'Flow state', color: VIOLET, text: 'Fully locked in — mind and body working together, effort dropping away, time doing something strange.' },
  { term: 'A worn-in path', color: MOSS, text: 'A groove is literally a track worn by repetition — the more you move, the more natural the path becomes.' },
];

// Same easing/duration as SwipeTabs' own page transitions, so this feels
// like the same gesture system rather than a bolted-on modal.
const SNAP_TRANSITION = 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)';
const CLOSE_MS = 280;

export default function GrooveSheet({ onClose }) {
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false); // resting state: fully in vs fully out
  const [dragX, setDragX] = useState(0); // live offset while a finger is down, 0 or negative
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const [width, setWidth] = useState(0);
  const trackingRef = useRef(false);

  // Measured before the browser paints (unlike a plain effect, which
  // runs after) — otherwise the panel's first frame renders its closed
  // resting position using a guessed width, and visibly snaps once the
  // real width is known a moment later.
  useLayoutEffect(() => {
    if (panelRef.current) setWidth(panelRef.current.offsetWidth);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function handleTouchStart(e) {
    trackingRef.current = true;
    startXRef.current = e.touches[0].clientX;
    setDragging(true);
  }
  function handleTouchMove(e) {
    if (!trackingRef.current) return;
    const dx = e.touches[0].clientX - startXRef.current;
    // Only ever pulls left (closing) — dragging right past fully-open
    // just does nothing, no rubber-band needed since it's already home.
    setDragX(Math.min(0, dx));
  }
  function finishGesture() {
    if (!trackingRef.current) return;
    trackingRef.current = false;
    setDragging(false);
    const closedEnough = -dragX > width * 0.3;
    setDragX(0);
    if (closedEnough) {
      setOpen(false);
      setTimeout(onClose, CLOSE_MS);
    } else {
      setOpen(true);
    }
  }

  // The offset actually applied: fully open (0) or fully closed
  // (-100%) as a resting position, live-adjusted by finger movement
  // while a touch is active — same feel as SwipeTabs' own drag.
  const baseX = open ? 0 : -width;
  const translate = baseX + dragX;

  function handleBackdropClick() {
    setOpen(false);
    setTimeout(onClose, CLOSE_MS);
  }

  return (
    <Portal>
      <div
        style={{ background: 'rgba(0,0,0,0.6)', opacity: open || dragging ? 1 : 0, transition: dragging ? 'none' : 'opacity 0.28s ease' }}
        className="fixed inset-0 z-50 flex"
        onClick={handleBackdropClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={finishGesture}
        onTouchCancel={finishGesture}
      >
        <div
          ref={panelRef}
          style={{
            background: INK_2,
            touchAction: 'pan-y',
            transform: `translateX(${translate}px)`,
            transition: dragging ? 'none' : SNAP_TRANSITION,
          }}
          className="relative w-[85vw] max-w-sm h-full px-6 py-10 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleBackdropClick}
            style={{ color: TEXT_SOFT }}
            className="absolute top-4 right-4 p-2 -m-2"
          >
            <X size={20} />
          </button>
          <div style={{ color: LIME, fontFamily: "'Segoe UI', Manrope, sans-serif" }} className="text-2xl font-extrabold tracking-wide italic mb-8 mt-4">
            GROOVE
          </div>
          <div className="space-y-6">
            {GROOVE_DEFINITIONS.map((d) => (
              <div key={d.term}>
                <div style={{ color: d.color }} className="text-sm uppercase tracking-wide font-bold mb-1">{d.term}</div>
                <p style={{ color: PAPER_DIM }} className="text-sm">{d.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1" />
      </div>
    </Portal>
  );
}
