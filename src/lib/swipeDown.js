import { useCallback, useRef, useState } from 'react';

// Lets a bottom sheet be dragged down to close (phones). Spread the result
// onto the sheet element:  const sheet = useSwipeDown(onClose);
//   <div ref={sheet.ref} {...sheet.handlers} style={{ ...sheet.style, background: ... }}>
// The gesture is listened for natively (not through React) so it can stop the page underneath from scrolling while the
// sheet is pulled. It works from the sheet and from the dimmed area around it (the sheet's full-screen overlay).
// It only starts inside the sheet when its own content is scrolled to the top, so scrolling a long sheet still works;
// a pull past ~110px closes it. Mark a child with data-no-sheet-drag to keep sheet-dragging off it entirely.
export function useSwipeDown(onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const st = useRef({ y0: 0, x0: 0, canDrag: false, inside: true, active: false, dy: 0 });
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const detachRef = useRef(null);

  // A callback ref: attaches the touch listeners when the sheet appears and removes them when it goes away.
  const ref = useCallback((el) => {
    if (detachRef.current) { detachRef.current(); detachRef.current = null; }
    if (!el) return;
    // The dimmed overlay (a fixed full-screen parent) takes part too; otherwise just the sheet itself.
    const parent = el.parentElement;
    const surface = parent && getComputedStyle(parent).position === 'fixed' ? parent : el;

    // Sheets opened from inside another sheet (Account > Injuries...) can sit in its DOM or React tree, so each sheet keeps
    // its gesture to itself.
    function start(e) {
      e.stopPropagation();
      const t = e.touches[0];
      const inside = el.contains(e.target);
      // Anything marked data-no-sheet-drag (a sideways scroller, a slider) keeps its own gesture.
      const locked = inside && e.target.closest && e.target.closest('[data-no-sheet-drag]');
      st.current = { y0: t.clientY, x0: t.clientX, inside, canDrag: !locked && (!inside || el.scrollTop <= 0), active: false, moved: false, dy: 0 };
    }
    function move(e) {
      e.stopPropagation();
      const s = st.current;
      const t = e.touches[0];
      const d = t.clientY - s.y0;
      if (Math.abs(d) > 10 || Math.abs(t.clientX - s.x0) > 10) s.moved = true;
      if (!s.canDrag) {
        // Outside the sheet nothing should scroll the page behind it.
        if (!s.inside && e.cancelable) e.preventDefault();
        return;
      }
      const vertical = Math.abs(d) > Math.abs(t.clientX - s.x0) * 1.3;
      // At the top of the sheet a downward pull can't scroll it, so claim it right away (keeps the page still).
      if (d > 0 && vertical && e.cancelable) e.preventDefault();
      if (!s.active) {
        if (d > 8 && vertical) { s.active = true; setDragging(true); } else return;
      }
      s.dy = Math.max(0, d);
      setDy(s.dy);
    }
    function end(e) {
      e?.stopPropagation?.();
      const s = st.current;
      // A drag that began on the dimmed area must not count as a tap on it (taps there close the sheet).
      if (!s.inside && (s.active || s.moved)) {
        const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
        surface.addEventListener('click', swallow, { capture: true, once: true });
        setTimeout(() => surface.removeEventListener('click', swallow, { capture: true }), 400);
      }
      if (s.active && s.dy > 110) closeRef.current();
      s.active = false; s.canDrag = false;
      setDragging(false); setDy(0);
    }
    surface.addEventListener('touchstart', start, { passive: true });
    surface.addEventListener('touchmove', move, { passive: false });
    surface.addEventListener('touchend', end);
    surface.addEventListener('touchcancel', end);
    detachRef.current = () => {
      surface.removeEventListener('touchstart', start);
      surface.removeEventListener('touchmove', move);
      surface.removeEventListener('touchend', end);
      surface.removeEventListener('touchcancel', end);
    };
  }, []);

  return {
    ref,
    handlers: {},
    style: {
      transform: dy ? `translateY(${dy}px)` : undefined,
      transition: dragging ? 'none' : 'transform 0.2s ease',
      overscrollBehaviorY: 'contain',
    },
  };
}

// A small grab bar so people can tell the sheet can be pulled down (phones only).
export const GRAB_BAR_CLASS = 'md:hidden mx-auto -mt-3 mb-3 h-1 w-9 rounded-full';
