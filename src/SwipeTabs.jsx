import React, { useRef, useState, useEffect } from 'react';

// A horizontal pager: all pages render side by side and slide together as
// one strip. `touchAction: 'pan-y'` tells the browser to keep handling
// vertical scroll/refresh gestures natively while leaving horizontal
// drags to us — that's what makes this reliable instead of racing the
// page's own scroll (the old dx-on-touchend approach didn't have this,
// which is why it felt temperamental).
export default function SwipeTabs({ index, onChangeIndex, pages }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });
  const isHorizontalRef = useRef(null); // null = undecided, true/false once decided

  useEffect(() => {
    function measure() {
      if (containerRef.current) setWidth(containerRef.current.offsetWidth);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  function handleTouchStart(e) {
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY };
    isHorizontalRef.current = null;
    setDragging(true);
  }

  function handleTouchMove(e) {
    const t = e.touches[0];
    const dx = t.clientX - startRef.current.x;
    const dy = t.clientY - startRef.current.y;

    if (isHorizontalRef.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      isHorizontalRef.current = Math.abs(dx) > Math.abs(dy);
      if (!isHorizontalRef.current) { setDragging(false); return; }
    }
    if (!isHorizontalRef.current) return;

    // Rubber-band past the first/last page instead of dragging freely.
    let next = dx;
    if ((index === 0 && dx > 0) || (index === pages.length - 1 && dx < 0)) {
      next = dx / 3;
    }
    setDragX(next);
  }

  function handleTouchEnd() {
    if (isHorizontalRef.current) {
      const threshold = width * 0.2;
      if (dragX < -threshold && index < pages.length - 1) onChangeIndex(index + 1);
      else if (dragX > threshold && index > 0) onChangeIndex(index - 1);
    }
    setDragX(0);
    setDragging(false);
    isHorizontalRef.current = null;
  }

  const translate = -index * width + dragX;

  return (
    <div ref={containerRef} style={{ touchAction: 'pan-y', overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          width: pages.length ? `${pages.length * 100}%` : '100%',
          transform: `translateX(${translate}px)`,
          transition: dragging ? 'none' : 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {pages.map((page, i) => (
          <div key={i} style={{ width: `${100 / pages.length}%`, flexShrink: 0 }}>
            {page}
          </div>
        ))}
      </div>
    </div>
  );
}
