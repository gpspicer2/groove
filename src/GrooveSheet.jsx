import React, { useRef } from 'react';
import { X } from 'lucide-react';
import Portal from './Portal';
import { INK_2, PAPER_DIM, TEXT_SOFT, LIME, AMBER, SKY, VIOLET, MOSS } from './theme';

const GROOVE_DEFINITIONS = [
  { term: 'Feeling good', color: AMBER, text: '"Getting your groove on" — movement as something you enjoy, not a box to check.' },
  { term: 'Rhythm', color: SKY, text: 'A steady, repeating beat you settle into — the pulse under the music, and the pulse under a session once you find your pace.' },
  { term: 'Flow state', color: VIOLET, text: 'Fully locked in — mind and body working together, effort dropping away, time doing something strange.' },
  { term: 'A worn-in path', color: MOSS, text: 'A groove is literally a track worn by repetition — the more you move, the more natural the path becomes.' },
];

export default function GrooveSheet({ onClose }) {
  const startX = useRef(0);
  const dragging = useRef(false);

  function handleTouchStart(e) {
    startX.current = e.touches[0].clientX;
    dragging.current = true;
  }
  function handleTouchMove(e) {
    if (!dragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < -40) { dragging.current = false; onClose(); }
  }
  function handleTouchEnd() {
    dragging.current = false;
  }

  return (
    <Portal>
      <div style={{ background: 'rgba(0,0,0,0.6)' }} className="fixed inset-0 z-50 flex" onClick={onClose}>
        <div
          style={{ background: INK_2, touchAction: 'pan-y' }}
          className="relative w-[85vw] max-w-sm h-full px-6 py-10 overflow-y-auto animate-[groove-in_0.25s_ease-out]"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <button onClick={onClose} style={{ color: TEXT_SOFT }} className="absolute top-4 right-4 p-2 -m-2">
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
        <div className="flex-1" onClick={onClose} />
      </div>
    </Portal>
  );
}
