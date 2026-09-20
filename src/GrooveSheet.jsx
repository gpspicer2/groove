import React from 'react';
import { X } from 'lucide-react';
import Portal from './Portal';
import GrooveLogo from './GrooveLogo';
import { INK_2, PAPER_DIM, TEXT_SOFT, LIME } from './theme';

const GROOVE_DEFINITIONS = [
  { term: 'Rhythm', text: 'A steady, repeating beat you settle into — the pulse under the music, and the pulse under a session once you find your pace.' },
  { term: 'Flow state', text: 'Fully locked in — mind and body working together, effort dropping away, time doing something strange.' },
  { term: 'Feeling good', text: '"Getting your groove on" — movement as something you enjoy, not a box to check.' },
  { term: 'A worn-in path', text: 'A groove is literally a track worn by repetition — the more you move, the more natural the path becomes.' },
];

export default function GrooveSheet({ onClose }) {
  return (
    <Portal>
      <div style={{ background: 'rgba(0,0,0,0.6)' }} className="fixed inset-0 z-50 flex" onClick={onClose}>
        <div
          style={{ background: INK_2 }}
          className="relative w-[85vw] max-w-sm h-full px-6 py-10 overflow-y-auto animate-[groove-in_0.25s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} style={{ color: TEXT_SOFT }} className="absolute top-4 right-4 p-2 -m-2">
            <X size={20} />
          </button>
          <GrooveLogo className="w-full h-auto mb-8 mt-4" style={{ color: LIME }} />
          <div className="space-y-6">
            {GROOVE_DEFINITIONS.map((d) => (
              <div key={d.term}>
                <div style={{ color: LIME }} className="text-sm uppercase tracking-wide font-bold mb-1">{d.term}</div>
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
