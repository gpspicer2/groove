import { useState, useEffect } from 'react';

// True when the app is showing its dark colors: the person chose Dark, or
// chose Auto (or nothing) and the phone is in dark mode.
function isDark() {
  const forced = document.documentElement.getAttribute('data-theme');
  if (forced === 'dark') return true;
  if (forced === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function useDarkMode() {
  const [dark, setDark] = useState(isDark);
  useEffect(() => {
    const update = () => setDark(isDark());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { mq.removeEventListener('change', update); observer.disconnect(); };
  }, []);
  return dark;
}
