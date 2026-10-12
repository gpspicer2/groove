import { useEffect, useRef, useState } from 'react';

// "Tap again to confirm" instead of a pop-up. The first tap on an item arms
// it (the caller paints it red); a second tap within a few seconds runs the
// action. Tapping elsewhere or waiting disarms it.
export function useArmed(ms = 3500) {
  const [armed, setArmed] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (armed == null) return;
    const off = () => { clearTimeout(timer.current); setArmed(null); };
    const onDown = (e) => { if (!e.target.closest?.('[data-armed="true"]')) off(); };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [armed]);
  function press(id, action) {
    if (armed === id) {
      clearTimeout(timer.current);
      setArmed(null);
      action();
    } else {
      setArmed(id);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setArmed(null), ms);
    }
  }
  return { armed, press };
}
