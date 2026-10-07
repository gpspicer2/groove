import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { X } from 'lucide-react';
import Portal from './Portal';
import { INK_2, PAPER_DIM, TEXT_SOFT, LIME, AMBER, SKY, VIOLET, MOSS } from './theme';
import Wordmark from './Wordmark';

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
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const [width, setWidth] = useState(0);
  const trackingRef = useRef(false);
  const dragXRef = useRef(0);

  // Measured before the browser paints (unlike a plain effect, which
  // runs after) — otherwise the panel's first frame renders its closed
  // resting position using a guessed width, and visibly snaps once the
  // real width is known a moment later.
  useLayoutEffect(() => {
    if (panelRef.current) setWidth(panelRef.current.offsetWidth);
  }, []);

  // Two frames, so the closed position is actually painted before the
  // slide-in starts (one frame can skip straight to open with no animation).
  useEffect(() => {
    let id2;
    const id1 = requestAnimationFrame(() => { id2 = requestAnimationFrame(() => setOpen(true)); });
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2); };
  }, []);

  function handleTouchStart(e) {
    trackingRef.current = true;
    startXRef.current = e.touches[0].clientX;
    dragXRef.current = 0;
    setDragging(true);
  }
  function handleTouchMove(e) {
    if (!trackingRef.current) return;
    const dx = e.touches[0].clientX - startXRef.current;
    // Only ever pulls left (closing) — dragging right past fully-open
    // just does nothing, no rubber-band needed since it's already home.
    // Moved straight on the element (no React re-render per touch event)
    // so the drag follows the finger smoothly.
    const x = Math.min(0, dx);
    dragXRef.current = x;
    if (panelRef.current) panelRef.current.style.transform = `translate3d(${x}px, 0, 0)`;
  }
  function finishGesture() {
    if (!trackingRef.current) return;
    trackingRef.current = false;
    const closedEnough = -dragXRef.current > width * 0.3;
    dragXRef.current = 0;
    // Hand the transform back to React (and its transition) from where the finger left it.
    if (panelRef.current) panelRef.current.style.transform = '';
    setDragging(false);
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
  const translate = baseX;

  function handleBackdropClick() {
    setOpen(false);
    setTimeout(onClose, CLOSE_MS);
  }

  return (
    <Portal>
      <div
        style={{ background: 'rgba(0,0,0,0.6)', opacity: open || dragging ? 1 : 0, transition: dragging ? 'none' : 'opacity 0.28s ease', willChange: 'opacity' }}
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
            transform: `translate3d(${translate}px, 0, 0)`,
            willChange: 'transform',
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
          <Wordmark height={45} className="mb-8 mt-4 mx-auto block" />
          <div className="space-y-6 text-center">
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
