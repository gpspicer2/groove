// Light / Dark / Auto (follow the phone). Saved on this device only.
const KEY = 'groove:theme';
const COLORS = { light: '#EFE6D6', dark: '#1B1714' };

export function getThemePref() {
  try { const t = localStorage.getItem(KEY); return t === 'light' || t === 'dark' ? t : 'auto'; } catch { return 'auto'; }
}

export function setThemePref(pref) {
  try {
    if (pref === 'light' || pref === 'dark') localStorage.setItem(KEY, pref);
    else localStorage.removeItem(KEY);
  } catch { /* storage blocked */ }
  const root = document.documentElement;
  if (pref === 'light' || pref === 'dark') root.setAttribute('data-theme', pref);
  else root.removeAttribute('data-theme');
  // A forced choice also colors the phone's status bar to match.
  let meta = document.getElementById('groove-theme-color');
  if (pref === 'auto') { meta?.remove(); return; }
  if (!meta) {
    meta = document.createElement('meta');
    meta.id = 'groove-theme-color';
    meta.name = 'theme-color';
    document.head.insertBefore(meta, document.head.firstChild);
  }
  meta.content = COLORS[pref];
}
