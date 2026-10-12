import React from 'react';
import { PAPER, BRICK, INK_2 } from '../theme';

// The buttons a swipe row reveals: soft rounded pills that slide in over the
// whole row (so nothing of the row is left showing behind them). Each action:
// { key, label, icon, color, onClick, armed?, armedLabel?, fireOnTouch? }.
// `armed` turns a destructive pill solid red ("tap again").
export default function RevealPills({ revealed, actions, bg = INK_2, height = 'h-10' }) {
  return (
    <div
      className="absolute inset-0 flex items-center gap-2 px-3 z-10"
      style={{
        background: bg,
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
            data-armed={armed}
            style={armed ? { background: BRICK, color: PAPER } : { background: `color-mix(in srgb, ${a.color} 22%, transparent)`, color: a.color }}
            className={`flex-1 ${height} rounded-full text-sm font-medium flex items-center justify-center gap-1.5 px-2 whitespace-nowrap`}
          >
            {armed ? (a.armedLabel || 'Sure?') : <>{Icon && <Icon size={14} />} {a.label}</>}
          </button>
        );
      })}
    </div>
  );
}
