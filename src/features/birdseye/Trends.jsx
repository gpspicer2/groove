import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp } from '../../lib/icons';
import { supabase } from '../../lib/supabaseClient';
import { useRevealOnOpen } from '../../lib/reveal';
import { startOfWeek } from '../../lib/week';
import { estimateKcal } from '../../lib/calories';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME } from '../../theme';

// A clean look at how training changes over time. One metric at a time,
// a bar per week (8 weeks) or per month (6 months / 1 year); tap a bar to
// read its number.
const METRICS = [
  { id: 'volume', label: 'Weight lifted', unit: 'lb' },
  { id: 'kcal', label: 'Calories', unit: 'kcal' },
  { id: 'aerobic', label: 'Aerobic', unit: 'min' },
  { id: 'workouts', label: 'Workouts', unit: '' },
  { id: 'muscle', label: 'Muscle', unit: '' },
  { id: 'exercise', label: 'Exercise', unit: '' },
];
const RANGES = [
  { id: '8w', label: '8 weeks', unit: 'week', count: 8 },
  { id: '6m', label: '6 months', unit: 'month', count: 6 },
  { id: '1y', label: '1 year', unit: 'month', count: 12 },
];
const NON_LIFT_GROUPS = ['Warm-up', 'Cardio', 'Flexibility'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PAGE = 1000;

const chip = (on) => ({ background: on ? LIME : INK_3, color: on ? INK : PAPER_DIM });
const selectStyle = { background: INK_3, color: PAPER, fontFamily: 'Outfit, sans-serif' };

function buildBuckets(range, weekStartDay) {
  const now = new Date();
  const out = [];
  if (range.unit === 'week') {
    const thisWeek = startOfWeek(now, weekStartDay);
    for (let i = range.count - 1; i >= 0; i--) {
      const start = new Date(thisWeek); start.setDate(thisWeek.getDate() - i * 7);
      const end = new Date(start); end.setDate(start.getDate() + 7);
      out.push({ start, end, label: `${MONTHS[start.getMonth()]} ${start.getDate()}`, long: `Week of ${MONTHS[start.getMonth()]} ${start.getDate()}` });
    }
  } else {
    for (let i = range.count - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      out.push({ start, end, label: MONTHS[start.getMonth()], long: `${MONTHS[start.getMonth()]} ${start.getFullYear()}` });
    }
  }
  return out;
}

const isLift = (s) => (s.movement_type || 'resistance') === 'resistance' && !NON_LIFT_GROUPS.includes(s.muscle_group);
const liftVolume = (s) => (Number(s.weight) || 0) * (Number(s.reps) || 0);

function valueFor(metric, opts, bucketWorkouts, bucketSets, bodyweight) {
  switch (metric) {
    case 'volume':
      return bucketSets.filter((s) => (s.movement_type || 'resistance') === 'resistance').reduce((n, s) => n + liftVolume(s), 0);
    case 'kcal':
      return estimateKcal(bucketSets, bodyweight);
    case 'aerobic':
      return bucketSets.filter((s) => s.movement_type === 'aerobic')
        .reduce((n, s) => n + (Number(s.moderate_minutes) || 0) + 2 * (Number(s.vigorous_minutes) || 0), 0);
    case 'workouts':
      return bucketWorkouts.length;
    case 'muscle': {
      const rows = bucketSets.filter((s) => isLift(s) && s.muscle_group === opts.muscle);
      return opts.muscleBy === 'sets' ? rows.length : rows.reduce((n, s) => n + liftVolume(s), 0);
    }
    case 'exercise': {
      const rows = bucketSets.filter((s) => isLift(s) && s.exercise_name === opts.exercise);
      if (rows.length === 0) return null;
      return opts.exerciseBy === 'volume'
        ? rows.reduce((n, s) => n + liftVolume(s), 0)
        : Math.max(...rows.filter((s) => Number(s.reps) > 0).map((s) => Number(s.weight) || 0), 0);
    }
    default: return 0;
  }
}

const fmt = (n) => (n == null ? '–' : Math.round(n).toLocaleString());

export default function Trends({ userId, profile, active, weekStartDay = 'sunday' }) {
  const [open, setOpen] = useState(false);
  const revealRef = useRevealOnOpen(open);
  const [data, setData] = useState(null); // { workouts, sets }
  const [error, setError] = useState('');
  const [metric, setMetric] = useState('volume');
  const [rangeId, setRangeId] = useState('8w');
  const [muscle, setMuscle] = useState('');
  const [muscleBy, setMuscleBy] = useState('weight'); // 'weight' | 'sets'
  const [exercise, setExercise] = useState('');
  const [exerciseBy, setExerciseBy] = useState('top'); // 'top' | 'volume'
  const [picked, setPicked] = useState(null); // tapped bar index

  // Load once the card is opened, and again each time Birdseye comes back
  // into view so new workouts show up.
  useEffect(() => {
    if (!open || !active || !userId) return;
    let cancelled = false;
    (async () => {
      const since = new Date(); since.setDate(since.getDate() - 400);
      const wRes = await supabase.from('workouts').select('id, started_at, completed_at').eq('user_id', userId).is('deleted_at', null).gte('started_at', since.toISOString()).order('started_at', { ascending: true });
      if (wRes.error) { if (!cancelled) setError("Couldn't load your trends."); return; }
      const ids = new Set((wRes.data || []).map((w) => w.id));
      const sets = [];
      for (let from = 0; from < 40 * PAGE; from += PAGE) {
        const sRes = await supabase.from('workout_sets')
          .select('workout_id, exercise_name, muscle_group, weight, reps, movement_type, distance, light_minutes, moderate_minutes, vigorous_minutes')
          .eq('user_id', userId).order('created_at', { ascending: true }).range(from, from + PAGE - 1);
        if (sRes.error) { if (!cancelled) setError("Couldn't load your trends."); return; }
        (sRes.data || []).forEach((s) => { if (ids.has(s.workout_id)) sets.push(s); });
        if ((sRes.data || []).length < PAGE) break;
      }
      if (cancelled) return;
      const withSets = new Set(sets.map((s) => s.workout_id));
      setError('');
      setData({ workouts: (wRes.data || []).filter((w) => w.completed_at || withSets.has(w.id)), sets });
    })();
    return () => { cancelled = true; };
  }, [open, active, userId]);

  const muscles = useMemo(() => {
    const counts = {};
    (data?.sets || []).filter(isLift).forEach((s) => { counts[s.muscle_group] = (counts[s.muscle_group] || 0) + 1; });
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  }, [data]);
  const exercises = useMemo(() => {
    const counts = {};
    (data?.sets || []).filter(isLift).forEach((s) => { counts[s.exercise_name] = (counts[s.exercise_name] || 0) + 1; });
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  }, [data]);
  const chosenMuscle = muscles.includes(muscle) ? muscle : muscles[0] || '';
  const chosenExercise = exercises.includes(exercise) ? exercise : exercises[0] || '';

  const range = RANGES.find((r) => r.id === rangeId);
  const series = useMemo(() => {
    if (!data) return null;
    const buckets = buildBuckets(range, weekStartDay);
    const bodyweight = profile?.bodyweight_lb ? Number(profile.bodyweight_lb) : undefined;
    const opts = { muscle: chosenMuscle, muscleBy, exercise: chosenExercise, exerciseBy };
    return buckets.map((b) => {
      const ws = data.workouts.filter((w) => { const d = new Date(w.started_at); return d >= b.start && d < b.end; });
      const wIds = new Set(ws.map((w) => w.id));
      const ss = data.sets.filter((s) => wIds.has(s.workout_id));
      return { ...b, value: valueFor(metric, opts, ws, ss, bodyweight) };
    });
  }, [data, range, weekStartDay, metric, chosenMuscle, muscleBy, chosenExercise, exerciseBy, profile?.bodyweight_lb]);

  const meta = METRICS.find((m) => m.id === metric);
  let unit = meta.unit;
  if (metric === 'muscle') unit = muscleBy === 'sets' ? 'sets' : 'lb';
  if (metric === 'exercise') unit = 'lb';
  const subject = metric === 'muscle' ? chosenMuscle : metric === 'exercise' ? chosenExercise : '';

  let body = null;
  if (error) {
    body = <div style={{ color: TEXT_SOFT }} className="text-sm py-4">{error}</div>;
  } else if (!series) {
    body = <div style={{ color: TEXT_SOFT }} className="text-sm py-4">Loading…</div>;
  } else {
    const values = series.map((b) => b.value);
    const max = Math.max(0, ...values.map((v) => v || 0));
    const sel = picked != null && picked < series.length ? picked : series.length - 1;
    const isCurrent = sel === series.length - 1;
    const cur = series[sel];
    const prev = sel > 0 ? series[sel - 1].value : null;
    const delta = !isCurrent && prev > 0 && cur.value != null ? Math.round(((cur.value - prev) / prev) * 100) : null;
    const firstWith = values.findIndex((v) => v > 0);
    const counted = firstWith === -1 ? [] : values.slice(firstWith).filter((v) => v != null);
    const avg = counted.length ? counted.reduce((a, b) => a + b, 0) / counted.length : null;
    const best = max > 0 ? series[values.indexOf(max)] : null;
    const per = range.unit;
    const step = Math.ceil(series.length / 6);

    body = max === 0 ? (
      <div style={{ color: TEXT_SOFT }} className="text-sm py-5">
        Nothing to show here yet. It fills in as you log workouts.
      </div>
    ) : (
      <div>
        <div className="flex items-baseline justify-center gap-1.5">
          <span style={{ color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="text-3xl font-medium tabular-nums">{fmt(cur.value)}</span>
          <span style={{ color: TEXT_SOFT }} className="text-sm">{unit}</span>
          {delta != null && (
            <span style={{ color: delta >= 0 ? LIME : TEXT_SOFT }} className="text-sm ml-1">{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%</span>
          )}
        </div>
        <div style={{ color: TEXT_SOFT }} className="text-sm mb-3">
          {isCurrent ? `This ${per} so far` : cur.long}
        </div>

        <div className="flex items-end gap-1.5 h-28" role="img" aria-label={`${subject || meta.label} per ${per}`}>
          {series.map((b, i) => {
            const h = b.value > 0 ? Math.max(4, Math.round((b.value / max) * 100)) : 0;
            return (
              <button
                key={i}
                onClick={() => setPicked(i)}
                aria-label={`${b.long}: ${fmt(b.value)} ${unit}`}
                className="flex-1 h-full flex items-end"
              >
                <span
                  style={{ height: `${h}%`, background: i === sel ? LIME : `color-mix(in srgb, ${LIME} 40%, transparent)`, minHeight: b.value > 0 ? 4 : 2, opacity: b.value > 0 ? 1 : 0.35 }}
                  className="w-full rounded-t"
                />
              </button>
            );
          })}
        </div>
        <div className="flex gap-1.5 mt-1">
          {series.map((b, i) => (
            <span key={i} style={{ color: i === sel ? PAPER : TEXT_SOFT }} className="flex-1 text-xs text-center whitespace-nowrap overflow-visible">
              {(series.length - 1 - i) % step === 0 ? b.label : ''}
            </span>
          ))}
        </div>

        <div style={{ color: TEXT_SOFT }} className="text-sm mt-3 flex flex-wrap justify-center gap-x-3">
          {avg != null && <span className="whitespace-nowrap">Average {fmt(avg)} {unit}/{per}</span>}
          {best && <span className="whitespace-nowrap">Best {fmt(best.value)} ({best.label})</span>}
        </div>
        {metric === 'aerobic' && (
          <div style={{ color: TEXT_SOFT, opacity: 0.8 }} className="text-xs mt-1">Moderate minutes plus double for vigorous, like your weekly goal.</div>
        )}
      </div>
    );
  }

  return (
    <div ref={revealRef} data-tour="birdseye-trends" style={{ background: INK_2, borderTop: `2px solid ${LIME}` }} className="rounded-lg px-5 py-4 text-center">
      <button onClick={() => setOpen((v) => !v)} className="w-full grid grid-cols-[24px_1fr_24px] items-center">
        <span />
        <span style={{ color: LIME }} className="text-sm uppercase tracking-wide font-bold">Trends</span>
        <span className="justify-self-end">{open ? <ChevronUp size={16} color={TEXT_SOFT} /> : <ChevronDown size={16} color={TEXT_SOFT} />}</span>
      </button>

      {open && (
        <div style={{ borderTop: `1px dashed ${INK_3}` }} className="mt-3 pt-3">
          <div className="flex flex-wrap justify-center gap-1.5 mb-2">
            {METRICS.map((m) => (
              <button key={m.id} onClick={() => { setMetric(m.id); setPicked(null); }} style={chip(metric === m.id)} className="rounded-full px-2.5 py-1 text-sm">
                {m.label}
              </button>
            ))}
          </div>

          {metric === 'muscle' && muscles.length > 0 && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <select value={chosenMuscle} onChange={(e) => setMuscle(e.target.value)} style={selectStyle} className="rounded-md px-2 py-1.5 text-sm outline-none">
                {muscles.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <button onClick={() => setMuscleBy('weight')} style={chip(muscleBy === 'weight')} className="rounded-full px-3 py-1 text-sm">Weight</button>
              <button onClick={() => setMuscleBy('sets')} style={chip(muscleBy === 'sets')} className="rounded-full px-3 py-1 text-sm">Sets</button>
            </div>
          )}
          {metric === 'exercise' && exercises.length > 0 && (
            <div className="mb-2">
              <select value={chosenExercise} onChange={(e) => setExercise(e.target.value)} style={selectStyle} className="w-full rounded-md px-2 py-1.5 text-sm outline-none mb-2">
                {exercises.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <div className="flex justify-center gap-2">
                <button onClick={() => setExerciseBy('top')} style={chip(exerciseBy === 'top')} className="rounded-full px-3 py-1 text-sm whitespace-nowrap">Heaviest set</button>
                <button onClick={() => setExerciseBy('volume')} style={chip(exerciseBy === 'volume')} className="rounded-full px-3 py-1 text-sm whitespace-nowrap">Total lifted</button>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-1.5 mb-3">
            {RANGES.map((r) => (
              <button key={r.id} onClick={() => { setRangeId(r.id); setPicked(null); }} style={{ background: 'transparent', border: `1px solid ${rangeId === r.id ? LIME : INK_3}`, color: rangeId === r.id ? PAPER : TEXT_SOFT }} className="rounded-full px-3 py-0.5 text-sm">
                {r.label}
              </button>
            ))}
          </div>

          {body}
        </div>
      )}
    </div>
  );
}
