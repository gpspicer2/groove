import React, { useRef, useState, useEffect } from 'react';

// A horizontal pager: all pages render side by side and slide together as
// one strip. `touchAction: 'pan-y'` tells the browser to keep handling
// vertical scroll/refresh gestures natively while leaving horizontal
// drags to us — that's what makes this reliable instead of racing the
// page's own scroll (the old dx-on-touchend approach didn't have this,
// which is why it felt temperamental).
export default function SwipeTabs({ index, onChangeIndex, pages, onEdgeSwipeRight, scrollContainerRef }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });
  const isHorizontalRef = useRef(null); // null = undecided, true/false once decided
  const suppressedRef = useRef(false); // gesture started on a control that needs its own horizontal drag
  const rawDxRef = useRef(0); // actual finger movement, before rubber-band dampening

  useEffect(() => {
    function measure() {
      if (containerRef.current) setWidth(containerRef.current.offsetWidth);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // All pages share one scroll position (they sit side by side, not each
  // in their own scroll container) — switching to a shorter tab while
  // scrolled down on a taller one otherwise leaves the viewport stranded
  // past the new tab's content.
  useEffect(() => {
    if (scrollContainerRef?.current) scrollContainerRef.current.scrollTo(0, 0);
    else window.scrollTo(0, 0);
  }, [index, scrollContainerRef]);

  // Anything that has its own horizontal drag/scroll behavior (sliders,
  // horizontally-scrolling rows, etc.) opts out of the pager's own swipe
  // tracking entirely, rather than the two gestures fighting each other.
  function isSwipeExempt(target) {
    return Boolean(target.closest && target.closest('input[type="range"], [data-no-swipe]'));
  }

  function handleTouchStart(e) {
    if (isSwipeExempt(e.target)) {
      suppressedRef.current = true;
      return;
    }
    suppressedRef.current = false;
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY };
    isHorizontalRef.current = null;
    setDragging(true);
  }

  function handleTouchMove(e) {
    if (suppressedRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - startRef.current.x;
    const dy = t.clientY - startRef.current.y;

    if (isHorizontalRef.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      isHorizontalRef.current = Math.abs(dx) > Math.abs(dy);
      if (!isHorizontalRef.current) { setDragging(false); return; }
    }
    if (!isHorizontalRef.current) return;
    rawDxRef.current = dx;

    // Rubber-band past the first/last page instead of dragging freely.
    let next = dx;
    if ((index === 0 && dx > 0) || (index === pages.length - 1 && dx < 0)) {
      next = dx / 3;
    }
    setDragX(next);
  }

  function handleTouchEnd() {
    if (suppressedRef.current) {
      suppressedRef.current = false;
      return;
    }
    if (isHorizontalRef.current) {
      const threshold = width * 0.2;
      // The edge-swipe-right gesture is checked against the raw finger
      // movement, not the rubber-band-dampened dragX (which is divided
      // by 3 at index 0) — otherwise it'd take 3x the swipe distance to
      // trigger as a normal tab change.
      if (dragX < -threshold && index < pages.length - 1) onChangeIndex(index + 1);
      else if (dragX > threshold && index > 0) onChangeIndex(index - 1);
      // Lower bar than a normal tab change — this is a secondary "peek"
      // gesture, not primary navigation, so it should trigger easily.
      else if (rawDxRef.current > width * 0.1 && index === 0 && onEdgeSwipeRight) onEdgeSwipeRight();
    }
    setDragX(0);
    setDragging(false);
    isHorizontalRef.current = null;
  }

  const translate = -index * width + dragX;

  return (
    // A column flex container of its own, so the sliding strip below can
    // use flex:1 (reliable) instead of a percentage height (which needs
    // an explicit, not merely min-, height on every ancestor to resolve).
    <div ref={containerRef} style={{ touchAction: 'pan-y', overflow: 'hidden', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          flex: '1',
          width: pages.length ? `${pages.length * 100}%` : '100%',
          transform: `translateX(${translate}px)`,
          transition: dragging ? 'none' : 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* align-items defaults to 'stretch' in a row flex container, so
            each page fills the strip's full height with no extra CSS. */}
        {pages.map((page, i) => (
          <div key={i} style={{ width: `${100 / pages.length}%`, flexShrink: 0 }}>
            {page}
          </div>
        ))}
      </div>
    </div>
  );
}
