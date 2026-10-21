import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

// Lifting experience lives in profiles.movement_experience (jsonb: { answers: { id: 'know'|'learn'|'skip' } }).
// Until that column exists in Supabase, a copy on this device keeps everything working (same idea as the program).
const key = (userId) => `groove:experience:${userId}`;
function readLocal(userId) {
  try { const raw = localStorage.getItem(key(userId)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeLocal(userId, value) {
  try { localStorage.setItem(key(userId), JSON.stringify(value)); } catch { /* storage blocked */ }
}

export function useExperience(userId) {
  const [experience, setExperience] = useState(() => (userId ? readLocal(userId) : null));
  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    setExperience(readLocal(userId));
    (async () => {
      const { data, error } = await supabase.from('profiles').select('movement_experience').eq('id', userId).maybeSingle();
      if (cancelled || error || !data || data.movement_experience === undefined) return;
      const local = readLocal(userId);
      if (data.movement_experience) { setExperience(data.movement_experience); writeLocal(userId, data.movement_experience); }
      else if (local) supabase.from('profiles').update({ movement_experience: local }).eq('id', userId).then(() => {});
    })();
    const onChange = () => setExperience(readLocal(userId));
    window.addEventListener('groove:experience', onChange);
    return () => { cancelled = true; window.removeEventListener('groove:experience', onChange); };
  }, [userId]);

  const save = useCallback(async (next) => {
    writeLocal(userId, next);
    setExperience(next);
    window.dispatchEvent(new Event('groove:experience'));
    await supabase.from('profiles').update({ movement_experience: next }).eq('id', userId); // quietly ignored if the column isn't there yet
  }, [userId]);

  return { experience, answers: experience?.answers || {}, answered: Boolean(experience), save };
}
