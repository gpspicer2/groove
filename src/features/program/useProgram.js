import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { startOfWeek } from '../../lib/week';

// The member's program lives in profiles.program (jsonb). Until that column
// exists in Supabase, a copy kept on this device keeps everything working.
const key = (userId) => `groove:program:${userId}`;
function readLocal(userId) {
  try { const raw = localStorage.getItem(key(userId)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeLocal(userId, program) {
  try { if (program) localStorage.setItem(key(userId), JSON.stringify(program)); else localStorage.removeItem(key(userId)); } catch { /* storage blocked */ }
}

export function useProgram(userId) {
  const [program, setProgram] = useState(() => (userId ? readLocal(userId) : null));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    setProgram(readLocal(userId));
    (async () => {
      const { data, error } = await supabase.from('profiles').select('program').eq('id', userId).maybeSingle();
      if (cancelled) return;
      if (!error && data && data.program !== undefined) {
        // The database copy wins once it exists; a device-only copy from before
        // the column was added is pushed up once.
        const local = readLocal(userId);
        if (data.program) { setProgram(data.program); writeLocal(userId, data.program); }
        else if (local) supabase.from('profiles').update({ program: local }).eq('id', userId).then(() => {});
      }
      setLoaded(true);
    })();
    const onChange = () => setProgram(readLocal(userId));
    window.addEventListener('groove:program', onChange);
    return () => { cancelled = true; window.removeEventListener('groove:program', onChange); };
  }, [userId]);

  const save = useCallback(async (next) => {
    writeLocal(userId, next);
    setProgram(next);
    window.dispatchEvent(new Event('groove:program'));
    await supabase.from('profiles').update({ program: next }).eq('id', userId); // quietly ignored if the column isn't there yet
  }, [userId]);

  return { program, loaded, save };
}

// How many sessions of each kind were done this week (since the program began).
export function useProgramProgress(userId, program, active, refreshKey, weekStartDay = 'sunday') {
  const [done, setDone] = useState({ resistance: 0, aerobic: 0, inProgress: null });
  useEffect(() => {
    if (!userId || !program || active === false) return undefined;
    let cancelled = false;
    (async () => {
      const weekStart = startOfWeek(new Date(), weekStartDay);
      const from = new Date(Math.max(weekStart.getTime(), new Date(`${program.startedAt}T00:00:00`).getTime()));
      const w = await supabase.from('workouts').select('id, started_at, completed_at, movement_mode').eq('user_id', userId).is('deleted_at', null).gte('started_at', from.toISOString());
      if (w.error || !w.data?.length) { if (!cancelled) setDone({ resistance: 0, aerobic: 0, inProgress: null }); return; }
      const finished = new Set(w.data.filter((x) => x.completed_at).map((x) => x.id));
      // A workout still being logged shows as "in progress" until it is finished.
      const open = w.data.find((x) => !x.completed_at);
      const inProgress = open && open.movement_mode !== 'Flexibility' ? (open.movement_mode === 'Aerobic' ? 'aerobic' : 'resistance') : null;
      const ids = w.data.map((x) => x.id);
      const s = await supabase.from('workout_sets').select('workout_id, movement_type, muscle_group').in('workout_id', ids);
      if (cancelled || s.error) return;
      const res = new Set(); const aer = new Set();
      (s.data || []).forEach((r) => {
        const type = r.movement_type || 'resistance';
        if (!finished.has(r.workout_id)) return;
        if (type === 'aerobic') aer.add(r.workout_id);
        else if (type === 'resistance' && r.muscle_group !== 'Warm-up') res.add(r.workout_id);
      });
      setDone({ resistance: res.size, aerobic: aer.size, inProgress });
    })();
    return () => { cancelled = true; };
  }, [userId, program?.startedAt, program?.goal, active, refreshKey, weekStartDay]); // eslint-disable-line react-hooks/exhaustive-deps
  return done;
}

// Total pounds lifted (weight x reps, resistance sets) in finished workouts since the program began.
export function useProgramLifted(userId, program, refreshKey) {
  const [lb, setLb] = useState(0);
  useEffect(() => {
    if (!userId || !program) return undefined;
    let cancelled = false;
    (async () => {
      const w = await supabase.from('workouts').select('id').eq('user_id', userId).is('deleted_at', null).not('completed_at', 'is', null).gte('started_at', new Date(`${program.startedAt}T00:00:00`).toISOString());
      if (w.error || !w.data?.length) { if (!cancelled) setLb(0); return; }
      const ids = w.data.map((x) => x.id);
      let total = 0;
      for (let i = 0; i < ids.length; i += 25) {
        const s = await supabase.from('workout_sets').select('weight, reps, movement_type').in('workout_id', ids.slice(i, i + 25)).limit(5000);
        if (cancelled || s.error) return;
        (s.data || []).forEach((r) => { if ((r.movement_type || 'resistance') === 'resistance') total += (Number(r.weight) || 0) * (Number(r.reps) || 0); });
      }
      if (!cancelled) setLb(Math.round(total));
    })();
    return () => { cancelled = true; };
  }, [userId, program?.startedAt, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return lb;
}
