import React, { useRef, useState, useEffect } from 'react';
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

const SNAP_TRANSITION = 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)';
const CLOSE_MS = 280;

// Opening the drawer from anywhere in the app: fires an event so only this
// small host re-renders, not the whole app.
export function openGrooveDrawer() {
  window.dispatchEvent(new Event('groove:open-drawer'));
}

// The drawer stays mounted (just hidden) so opening it is only a slide:
// no new elements to build and no image to decode at the moment of the swipe.
export function GrooveDrawerHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('groove:open-drawer', show);
    return () => window.removeEventListener('groove:open-drawer', show);
  }, []);
  return <GrooveSheet open={open} onClose={() => setOpen(false)} />;
}

const OPEN_FRAMES = [{ transform: 'translate3d(-100%, 0, 0)' }, { transform: 'translate3d(0, 0, 0)' }];

export default function GrooveSheet({ open, onClose }) {
  const panelRef = useRef(null);
  const startXRef = useRef(0);
  const dragXRef = useRef(0);
  const trackingRef = useRef(false);
  const closingRef = useRef(false);

  // Slide in on the graphics chip as soon as it's opened.
  useEffect(() => {
    const el = panelRef.current;
    if (!open || !el) return;
    closingRef.current = false;
    el.style.transition = 'none';
    el.style.transform = '';
    el.animate(OPEN_FRAMES, { duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
  }, [open]);

  function slideTo(x, then) {
    const el = panelRef.current;
    if (!el) return;
    el.style.transition = SNAP_TRANSITION;
    el.style.transform = `translate3d(${x}px, 0, 0)`;
    if (then) setTimeout(then, CLOSE_MS);
  }
  function close() {
    if (closingRef.current) return;
    closingRef.current = true;
    slideTo(-(panelRef.current?.offsetWidth || 400), onClose);
  }

  function handleTouchStart(e) {
    if (closingRef.current) return;
    trackingRef.current = true;
    startXRef.current = e.touches[0].clientX;
    dragXRef.current = 0;
    if (panelRef.current) panelRef.current.style.transition = 'none';
  }
  function handleTouchMove(e) {
    if (!trackingRef.current) return;
    // Only pulls left (closing). Moved straight on the element, no React
    // re-render per touch event, so it follows the finger.
    const x = Math.min(0, e.touches[0].clientX - startXRef.current);
    dragXRef.current = x;
    if (panelRef.current) panelRef.current.style.transform = `translate3d(${x}px, 0, 0)`;
  }
  function finishGesture() {
    if (!trackingRef.current) return;
    trackingRef.current = false;
    const width = panelRef.current?.offsetWidth || 400;
    if (-dragXRef.current > width * 0.3) close();
    else slideTo(0);
  }

  return (
    <Portal>
      {/* No dimming layer: a full-screen tint left a visible block in the
          status-bar area on iPhones. The drawer's shadow separates it instead. */}
      <div
        className="fixed inset-0 z-50 flex"
        style={{ visibility: open ? 'visible' : 'hidden', pointerEvents: open ? 'auto' : 'none' }}
        onClick={close}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={finishGesture}
        onTouchCancel={finishGesture}
      >
        <div
          ref={panelRef}
          style={{ background: INK_2, boxShadow: '8px 0 28px rgba(60, 45, 30, 0.22)', touchAction: 'pan-y', willChange: 'transform', transform: 'translate3d(-100%, 0, 0)' }}
          className="relative w-[85vw] max-w-sm h-full px-6 py-10 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={close} style={{ color: TEXT_SOFT }} className="absolute top-4 right-4 p-2 -m-2">
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
