import { useEffect, useRef } from 'react';

// Scrolls an element into view a moment after it appears (so it has its
// final size), without yanking the page when it's already fully visible.
// Tall panels line up with their top so the heading stays in view.
export function revealSoon(el) {
  if (!el) return;
  setTimeout(() => {
    if (!el.isConnected) return;
    const tall = el.getBoundingClientRect().height > window.innerHeight * 0.7;
    el.style.scrollMarginBlock = '24px'; // a little breathing room, not flush to the edge
    el.scrollIntoView({ behavior: 'smooth', block: tall ? 'start' : 'nearest' });
  }, 90);
}

// Attach the returned ref to a panel; whenever `open` turns true it scrolls
// itself into view.
export function useRevealOnOpen(open) {
  const ref = useRef(null);
  useEffect(() => { if (open) revealSoon(ref.current); }, [open]);
  return ref;
}
