import { useEffect, useRef } from 'react';

// Swipe rows: only one can be open at a time. When this row opens it tells the
// others (on the page) to close; when another opens, this one closes.
export function useSingleOpenRow(revealed, setRevealed) {
  const me = useRef({});
  useEffect(() => {
    if (revealed) window.dispatchEvent(new CustomEvent('groove:rowreveal', { detail: me.current }));
  }, [revealed]);
  useEffect(() => {
    const onOther = (e) => { if (e.detail !== me.current) setRevealed(false); };
    window.addEventListener('groove:rowreveal', onOther);
    return () => window.removeEventListener('groove:rowreveal', onOther);
  }, [setRevealed]);
}
