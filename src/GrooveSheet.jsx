import React, { useRef, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Portal from './Portal';
import { INK_2, PAPER_DIM, TEXT_SOFT, LIME, AMBER, SKY, VIOLET, MOSS } from './theme';

const GROOVE_DEFINITIONS = [
  { term: 'Feeling good', color: AMBER, text: '"Getting your groove on" — movement as something you enjoy, not a box to check.' },
  { term: 'Rhythm', color: SKY, text: 'A steady, repeating beat you settle into — the pulse under the music, and the pulse under a session once you find your pace.' },
  { term: 'Flow state', color: VIOLET, text: 'Fully locked in — mind and body working together, effort dropping away, time doing something strange.' },
  { term: 'A worn-in path', color: MOSS, text: 'A groove is literally a track worn by repetition — the more you move, the more natural the path becomes.' },
];

// Same easing/duration as SwipeTabs' own page transitions, so this feels
// like the same gesture system rather than a bolted-on modal.
const TRANSITION = 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)';
const CLOSE_MS = 280;

export default function GrooveSheet({ onClose }) {
  const [visible, setVisible] = useState(false);
  const startX = useRef(0);
  const dragging = useRef(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, CLOSE_MS);
  }

  function handleTouchStart(e) {
    startX.current = e.touches[0].clientX;
    dragging.current = true;
  }
  function handleTouchMove(e) {
    if (!dragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < -40) { dragging.current = false; handleClose(); }
  }
  function handleTouchEnd() {
    dragging.current = false;
  }

  return (
    <Portal>
      <div
        style={{ background: 'rgba(0,0,0,0.6)', opacity: visible ? 1 : 0, transition: 'opacity 0.28s ease' }}
        className="fixed inset-0 z-50 flex"
        onClick={handleClose}
      >
        <div
          style={{ background: INK_2, touchAction: 'pan-y', transform: `translateX(${visible ? '0' : '-100%'})`, transition: TRANSITION }}
          className="relative w-[85vw] max-w-sm h-full px-6 py-10 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <button onClick={handleClose} style={{ color: TEXT_SOFT }} className="absolute top-4 right-4 p-2 -m-2">
            <X size={20} />
          </button>
          <div style={{ color: LIME, fontFamily: 'Manrope, sans-serif' }} className="text-2xl font-medium tracking-wide italic mb-8 mt-4">
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
        <div className="flex-1" onClick={handleClose} />
      </div>
    </Portal>
  );
}
