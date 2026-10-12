import React from 'react';
import { PAPER, BRICK, INK_2 } from '../theme';

// The small round buttons a swipe row reveals on its right edge (pencil, trash,
// and so on). They slide in over the end of the row only, so the rest of the row
// stays put. Each action: { key, label, icon, color, onClick, armed?, fireOnTouch? }.
// `armed` turns a destructive button into a solid "Sure?" (tap again to confirm).
// `place` sets the vertical band the buttons sit in (a Tailwind class string).
export default function RevealPills({ revealed, actions, bg = INK_2, place = 'inset-y-0' }) {
  return (
    <div
      className={`absolute right-0 ${place} flex items-center gap-1.5 pl-8 pr-1 z-10`}
      style={{
        background: `linear-gradient(to right, transparent, ${bg} 22px)`,
        transform: `translateX(${revealed ? 0 : 100}%)`, opacity: revealed ? 1 : 0,
        transition: 'transform 0.2s ease, opacity 0.2s ease', pointerEvents: revealed ? 'auto' : 'none',
      }}
    >
      {actions.map((a) => {
        const Icon = a.icon;
        const armed = Boolean(a.armed);
        const handlers = a.fireOnTouch
          ? { onClick: a.onClick, onTouchEnd: (e) => { e.preventDefault(); e.stopPropagation(); a.onClick(); } }
          : { onClick: a.onClick };
        return (
          <button
            key={a.key}
            {...handlers}
            aria-label={a.label}
            data-armed={armed}
            style={armed ? { background: BRICK, color: PAPER } : { background: `color-mix(in srgb, ${a.color} 22%, transparent)`, color: a.color }}
            className={`h-7 rounded-full text-sm font-medium flex items-center justify-center shrink-0 ${armed ? 'px-3' : 'w-7'}`}
          >
            {armed ? 'Sure?' : <Icon size={14} />}
          </button>
        );
      })}
    </div>
  );
}
