import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

// Injuries and limits live in profiles.injuries (jsonb array). Until that column exists in
// Supabase, a copy on this device keeps everything working (same idea as the program).
// Each: { id, area (a BODY_AREAS id), label, date (YYYY-MM-DD), note, recovered }
const key = (userId) => `groove:injuries:${userId}`;
function readLocal(userId) {
  try { const raw = localStorage.getItem(key(userId)); const v = raw ? JSON.parse(raw) : []; return Array.isArray(v) ? v : []; } catch { return []; }
}
function writeLocal(userId, list) {
  try { localStorage.setItem(key(userId), JSON.stringify(list)); } catch { /* storage blocked */ }
}

export function useInjuries(userId) {
  const [injuries, setInjuries] = useState(() => (userId ? readLocal(userId) : []));
  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    setInjuries(readLocal(userId));
    (async () => {
      const { data, error } = await supabase.from('profiles').select('injuries').eq('id', userId).maybeSingle();
      if (cancelled || error || !data || data.injuries === undefined) return;
      const local = readLocal(userId);
      if (Array.isArray(data.injuries) && data.injuries.length) { setInjuries(data.injuries); writeLocal(userId, data.injuries); }
      else if (local.length) supabase.from('profiles').update({ injuries: local }).eq('id', userId).then(() => {});
    })();
    const onChange = () => setInjuries(readLocal(userId));
    window.addEventListener('groove:injuries', onChange);
    return () => { cancelled = true; window.removeEventListener('groove:injuries', onChange); };
  }, [userId]);

  const save = useCallback(async (next) => {
    writeLocal(userId, next);
    setInjuries(next);
    window.dispatchEvent(new Event('groove:injuries'));
    await supabase.from('profiles').update({ injuries: next }).eq('id', userId); // quietly ignored if the column isn't there yet
  }, [userId]);

  return { injuries, save };
}

export const activeInjuries = (list) => (Array.isArray(list) ? list : []).filter((i) => i && !i.recovered);

export function weeksSince(dateStr, now = new Date()) {
  const t = new Date(`${dateStr}T00:00:00`).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now.getTime() - t) / (7 * 864e5)));
}

// General tissue-healing phases, not a prescription: how long an injury is also depends on how bad it was
// and what a doctor or therapist has said. Pain over about 3/10, or swelling afterward, means ease off.
export function stageFor(weeks) {
  if (weeks < 2) return { name: 'Protect', tip: 'Rest the area and keep everything else moving. If it is new, get it looked at.' };
  if (weeks < 6) return { name: 'Early loading', tip: 'Gentle, pain-free movement and light holds. Keep training the rest of the body.' };
  if (weeks < 12) return { name: 'Rebuilding', tip: 'Add load slowly, staying pain-free. Strengthen the muscles around it.' };
  return { name: 'Return to training', tip: 'Build back toward normal bit by bit. Tap "Mark recovered" when you trust it again.' };
}

export function injuryLine(i) {
  const w = weeksSince(i.date);
  return `${i.label || 'Injury'} · week ${w} · ${stageFor(w).name}`;
}
