import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp } from '../../lib/icons';
import { supabase } from '../../lib/supabaseClient';
import { useRevealOnOpen } from '../../lib/reveal';
import { startOfWeek } from '../../lib/week';
import { estimateKcal } from '../../lib/calories';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME } from '../../theme';

// How training changes over time: one metric as a line, a point per week
// (8 weeks) or per month (6 months / 1 year). Tap anywhere on the chart to
// read a point. A dashed line shows the overall direction.
const METRICS = [
  { id: 'volume', label: 'Weight lifted', unit: 'lb' },
  { id: 'kcal', label: 'Calories burned', unit: 'kcal' },
  { id: 'aerobic', label: 'Aerobic', unit: 'min' },
  { id: 'workouts', label: 'Workouts', unit: '' },
  { id: 'bodyweight', label: 'Bodyweight', unit: 'lb' },
  { id: 'muscle', label: 'By muscle group', unit: '' },
  { id: 'exercise', label: 'By exercise', unit: 'lb' },
];
const RANGES = [
  { id: '8w', label: '8w', unit: 'week', count: 8 },
  { id: '6m', label: '6m', unit: 'month', count: 6 },
  { id: '1y', label: '1y', unit: 'month', count: 12 },
];
const NON_LIFT_GROUPS = ['Warm-up', 'Cardio', 'Flexibility'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PAGE = 1000;

const selectStyle = { background: INK_3, color: PAPER, fontFamily: 'Outfit, sans-serif' };
const selectClass = 'rounded-md px-2 py-1.5 text-sm outline-none min-w-0';

function Seg({ options, value, onChange }) {
  return (
    <div style={{ background: INK_3 }} className="inline-flex rounded-full p-0.5 shrink-0">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          style={{ background: value === o.id ? LIME : 'transparent', color: value === o.id ? INK : PAPER_DIM }}
          className="rounded-full px-2.5 py-0.5 text-sm whitespace-nowrap"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

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
// Epley estimate of a one-rep max from a set; only trusted up to ~12 reps.
const epley = (s) => (Number(s.reps) > 0 && Number(s.reps) <= 12 ? (Number(s.weight) || 0) * (1 + Number(s.reps) / 30) : 0);

// A number, or null when there is nothing to plot for that period.
function valueFor(metric, opts, bucketWorkouts, bucketSets, bucketMeasures, bodyweight) {
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
    case 'bodyweight':
      return bucketMeasures.length ? Number(bucketMeasures[bucketMeasures.length - 1].value) : null;
    case 'muscle': {
      const rows = bucketSets.filter((s) => isLift(s) && s.muscle_group === opts.muscle);
      return opts.muscleBy === 'sets' ? rows.length : rows.reduce((n, s) => n + liftVolume(s), 0);
    }
    case 'exercise': {
      const rows = bucketSets.filter((s) => isLift(s) && s.exercise_name === opts.exercise);
      if (rows.length === 0) return null;
      if (opts.exerciseBy === 'volume') return rows.reduce((n, s) => n + liftVolume(s), 0);
      if (opts.exerciseBy === 'e1rm') return Math.max(0, ...rows.map(epley)) || null;
      return Math.max(0, ...rows.filter((s) => Number(s.reps) > 0).map((s) => Number(s.weight) || 0)) || null;
    }
    default: return 0;
  }
}

const fmt = (n) => (n == null ? '–' : Math.round(n).toLocaleString());

// Least-squares line through the plotted points.
function fitTrend(points) {
  const n = points.length;
  if (n < 3) return null;
  const mx = points.reduce((a, p) => a + p.i, 0) / n;
  const my = points.reduce((a, p) => a + p.v, 0) / n;
  const den = points.reduce((a, p) => a + (p.i - mx) ** 2, 0);
  if (den === 0) return null;
  const slope = points.reduce((a, p) => a + (p.i - mx) * (p.v - my), 0) / den;
  return { slope, mean: my, first: points[0], last: points[n - 1], at: (i) => my + slope * (i - mx) };
}

export default function Trends({ userId, profile, active, weekStartDay = 'sunday' }) {
  const [open, setOpen] = useState(false);
  const revealRef = useRevealOnOpen(open);
  const [data, setData] = useState(null); // { workouts, sets, measures }
  const [error, setError] = useState('');
  const [metric, setMetric] = useState('volume');
  const [rangeId, setRangeId] = useState('8w');
  const [muscle, setMuscle] = useState('');
  const [muscleBy, setMuscleBy] = useState('weight'); // 'weight' | 'sets'
  const [exercise, setExercise] = useState('');
  const [exerciseBy, setExerciseBy] = useState('top'); // 'top' | 'e1rm' | 'volume'
  const [picked, setPicked] = useState(null); // tapped point index

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
      const mRes = await supabase.from('fitness_measurements').select('kind, value, measured_at').eq('user_id', userId).eq('kind', 'bodyweight').order('measured_at', { ascending: true });
      if (cancelled) return;
      const withSets = new Set(sets.map((s) => s.workout_id));
      setError('');
      setData({
        workouts: (wRes.data || []).filter((w) => w.completed_at || withSets.has(w.id)),
        sets,
        measures: mRes.error ? [] : (mRes.data || []),
      });
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
      const ms = data.measures.filter((m) => { const d = new Date(m.measured_at); return d >= b.start && d < b.end; });
      return { ...b, value: valueFor(metric, opts, ws, ss, ms, bodyweight) };
    });
  }, [data, range, weekStartDay, metric, chosenMuscle, muscleBy, chosenExercise, exerciseBy, profile?.bodyweight_lb]);

  let unit = METRICS.find((m) => m.id === metric).unit;
  if (metric === 'muscle') unit = muscleBy === 'sets' ? 'sets' : 'lb';
  const per = range.unit;
  const countLike = metric === 'workouts' || (metric === 'muscle' && muscleBy === 'sets');
  const zeroBased = !['bodyweight', 'exercise'].includes(metric);

  let body;
  if (error) body = <div style={{ color: TEXT_SOFT }} className="text-sm py-3">{error}</div>;
  else if (!series) body = <div style={{ color: TEXT_SOFT }} className="text-sm py-3">Loading…</div>;
  else {
    const n = series.length;
    const firstReal = series.findIndex((b) => b.value > 0);
    const points = firstReal === -1 ? [] : series.map((b, i) => ({ i, v: b.value })).filter((p) => p.v != null && p.i >= firstReal);

    if (points.length === 0) {
      body = <div style={{ color: TEXT_SOFT }} className="text-sm py-4">Nothing here yet. It fills in as you log.</div>;
    } else {
      const goal = metric === 'aerobic' && per === 'week' ? Number(profile?.aerobic_goal_minutes) || 150 : null;
      const vals = points.map((p) => p.v);
      let lo = Math.min(...vals), hi = Math.max(...vals, goal || 0);
      if (zeroBased) lo = 0;
      else { const pad = (hi - lo || hi * 0.1 || 1) * 0.25; lo -= pad; hi += pad; }
      const span = hi - lo || 1;
      const X = (i) => ((i + 0.5) / n) * 100;
      const Y = (v) => 8 + (1 - (v - lo) / span) * 82;

      const sel = picked != null && series[picked]?.value != null ? picked : points[points.length - 1].i;
      const cur = series[sel];
      const isCurrent = sel === n - 1;
      const prevPoint = [...points].reverse().find((p) => p.i < sel);
      const delta = !isCurrent && prevPoint && prevPoint.v > 0 && cur.value != null ? Math.round(((cur.value - prevPoint.v) / prevPoint.v) * 100) : null;
      const bestPoint = points.reduce((a, p) => (p.v > a.v ? p : a), points[0]);
      // The current period is still filling in, so leave it out of the trend.
      const complete = points.filter((p) => p.i < n - 1);
      const trend = fitTrend(complete.length >= 3 ? complete : points);
      const avg = points.reduce((a, p) => a + p.v, 0) / points.length;
      let trendText = null; let trendColor = TEXT_SOFT;
      if (trend && trend.mean > 0) {
        const pct = (trend.slope / trend.mean) * 100;
        if (pct > 2) { trendText = `↗ Up ~${Math.round(pct)}% per ${per}`; trendColor = LIME; }
        else if (pct < -2) trendText = `↘ Down ~${Math.round(Math.abs(pct))}% per ${per}`;
        else trendText = '→ Holding steady';
      }
      const isBest = points.length >= 3 && !countLike && sel === bestPoint.i && sel === points[points.length - 1].i;
      const step = Math.ceil(n / 6);
      const linePts = points.map((p) => `${X(p.i)},${Y(p.v)}`).join(' ');
      const areaPts = `${X(points[0].i)},100 ${linePts} ${X(points[points.length - 1].i)},100`;

      body = (
        <div>
          <div className="flex items-end justify-between gap-2 text-left">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span style={{ color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="text-3xl font-medium tabular-nums leading-none">{fmt(cur.value)}</span>
              <span style={{ color: TEXT_SOFT }} className="text-sm">{unit}</span>
              {delta != null && <span style={{ color: delta >= 0 ? LIME : TEXT_SOFT }} className="text-sm">{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%</span>}
            </div>
            <div className="text-right text-sm leading-tight">
              <div style={{ color: TEXT_SOFT }}>{isCurrent ? `This ${per} so far` : cur.long}</div>
              {isBest ? <div style={{ color: LIME }} className="font-medium">Best yet</div> : trendText && <div style={{ color: trendColor }}>{trendText}</div>}
            </div>
          </div>

          <div className="relative h-24 mt-2">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible" aria-hidden="true">
              {goal != null && <line x1="0" x2="100" y1={Y(goal)} y2={Y(goal)} style={{ stroke: TEXT_SOFT }} strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.6" />}
              <polygon points={areaPts} style={{ fill: `color-mix(in srgb, ${LIME} 16%, transparent)` }} />
              {trend && points.length >= 3 && (
                <line x1={X(trend.first.i)} y1={Y(trend.at(trend.first.i))} x2={X(trend.last.i)} y2={Y(trend.at(trend.last.i))} style={{ stroke: PAPER_DIM }} strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" opacity="0.7" />
              )}
              <polyline points={linePts} fill="none" style={{ stroke: LIME }} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <line x1={X(sel)} x2={X(sel)} y1="0" y2="100" style={{ stroke: LIME }} strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.35" />
            </svg>
            {points.map((p) => (
              <span
                key={p.i}
                style={{ left: `${X(p.i)}%`, top: `${Y(p.v)}%`, background: p.i === sel ? LIME : INK_2, border: `2px solid ${LIME}`, width: p.i === sel ? 12 : 8, height: p.i === sel ? 12 : 8 }}
                className="absolute rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              />
            ))}
            {goal != null && <span style={{ color: TEXT_SOFT, top: `${Y(goal)}%` }} className="absolute right-0 mt-0.5 text-xs">goal {goal}</span>}
            <div className="absolute inset-0 flex">
              {series.map((b, i) => (
                <button key={i} onClick={() => setPicked(i)} aria-label={`${b.long}: ${fmt(b.value)} ${unit}`} className="flex-1 h-full" />
              ))}
            </div>
          </div>
          <div className="flex mt-1">
            {series.map((b, i) => (
              <span key={i} style={{ color: i === sel ? PAPER : TEXT_SOFT }} className="flex-1 text-xs text-center whitespace-nowrap">
                {(n - 1 - i) % step === 0 ? b.label : ''}
              </span>
            ))}
          </div>

          <div style={{ color: TEXT_SOFT }} className="text-sm mt-1 flex justify-center gap-x-3 flex-wrap">
            <span className="whitespace-nowrap">Avg {fmt(avg)}/{per}</span>
            <span className="whitespace-nowrap">Best {fmt(bestPoint.v)} ({series[bestPoint.i].label})</span>
          </div>
          {metric === 'aerobic' && <div style={{ color: TEXT_SOFT, opacity: 0.8 }} className="text-xs">Moderate min, vigorous counts double, like your goal.</div>}
          {metric === 'exercise' && exerciseBy === 'e1rm' && <div style={{ color: TEXT_SOFT, opacity: 0.8 }} className="text-xs">Estimated one-rep max from your best set (Epley formula, sets up to 12 reps).</div>}
        </div>
      );
    }
  }

  return (
    <div ref={revealRef} data-tour="birdseye-trends" style={{ background: INK_2, borderTop: `2px solid ${LIME}` }} className="rounded-lg px-5 py-4 text-center">
      <button onClick={() => setOpen((v) => !v)} className="w-full grid grid-cols-[24px_1fr_24px] items-center">
        <span />
        <span style={{ color: LIME }} className="text-sm uppercase tracking-wide font-bold">Trends</span>
        <span className="justify-self-end">{open ? <ChevronUp size={16} color={TEXT_SOFT} /> : <ChevronDown size={16} color={TEXT_SOFT} />}</span>
      </button>

      {open && (
        <div className="mt-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <select value={metric} onChange={(e) => { setMetric(e.target.value); setPicked(null); }} style={selectStyle} className={`${selectClass} flex-1`} aria-label="What to track">
              {METRICS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <Seg options={RANGES} value={rangeId} onChange={(v) => { setRangeId(v); setPicked(null); }} />
          </div>

          {metric === 'muscle' && muscles.length > 0 && (
            <div className="flex items-center gap-2">
              <select value={chosenMuscle} onChange={(e) => setMuscle(e.target.value)} style={selectStyle} className={`${selectClass} flex-1`} aria-label="Muscle group">
                {muscles.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <Seg options={[{ id: 'weight', label: 'Weight' }, { id: 'sets', label: 'Sets' }]} value={muscleBy} onChange={setMuscleBy} />
            </div>
          )}
          {metric === 'exercise' && exercises.length > 0 && (
            <div className="flex items-center gap-2">
              <select value={chosenExercise} onChange={(e) => setExercise(e.target.value)} style={selectStyle} className={`${selectClass} flex-1`} aria-label="Exercise">
                {exercises.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <Seg options={[{ id: 'top', label: 'Top' }, { id: 'e1rm', label: 'Max' }, { id: 'volume', label: 'Total' }]} value={exerciseBy} onChange={setExerciseBy} />
            </div>
          )}

          {body}
        </div>
      )}
    </div>
  );
}
