import { useRef, useState } from 'react';

// Lets a bottom sheet be dragged down to close (phones). Spread the result
// onto the sheet element:  const sheet = useSwipeDown(onClose);
//   <div ref={sheet.ref} {...sheet.handlers} style={{ ...sheet.style, background: ... }}>
// It only starts when the sheet's own content is scrolled to the top, so
// scrolling a long sheet still works; a pull past ~110px closes it. Mark a
// child with data-no-sheet-drag to keep sheet-dragging off it entirely.
export function useSwipeDown(onClose) {
  const ref = useRef(null);
  const st = useRef({ y0: 0, x0: 0, canDrag: false, active: false, dy: 0 });
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);

  function onTouchStart(e) {
    const t = e.touches[0];
    const el = ref.current;
    // Anything marked data-no-sheet-drag (a sideways scroller, a slider) keeps its own gesture.
    const locked = e.target.closest && e.target.closest('[data-no-sheet-drag]');
    st.current = { y0: t.clientY, x0: t.clientX, canDrag: !locked && (!el || el.scrollTop <= 0), active: false, dy: 0 };
  }
  function onTouchMove(e) {
    const s = st.current;
    if (!s.canDrag) return;
    const t = e.touches[0];
    const d = t.clientY - s.y0;
    if (!s.active) {
      // start only for a mostly-vertical pull downward
      if (d > 8 && d > Math.abs(t.clientX - s.x0) * 1.3) { s.active = true; setDragging(true); } else return;
    }
    s.dy = Math.max(0, d);
    setDy(s.dy);
  }
  function onTouchEnd() {
    const s = st.current;
    if (s.active && s.dy > 110) onClose();
    s.active = false; s.canDrag = false;
    setDragging(false); setDy(0);
  }

  return {
    ref,
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd },
    style: {
      transform: dy ? `translateY(${dy}px)` : undefined,
      transition: dragging ? 'none' : 'transform 0.2s ease',
      overscrollBehaviorY: 'contain',
    },
  };
}

// A small grab bar so people can tell the sheet can be pulled down (phones only).
export const GRAB_BAR_CLASS = 'md:hidden mx-auto -mt-3 mb-3 h-1 w-9 rounded-full';
