import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { INK_2, PAPER, PAPER_DIM, TEXT_SOFT, MOSS, SKY, AMBER, BRICK } from '../../theme';

const RETEST_DAYS = 56; // ~8 weeks

const KINDS = [
  { kind: 'vo2max', label: 'VO2max', unit: '', color: MOSS, upIsGood: true, retest: true },
  { kind: 'resting_hr', label: 'Resting heart rate', unit: ' bpm', color: BRICK, upIsGood: false, retest: true },
  { kind: 'bodyweight', label: 'Bodyweight', unit: ' lb', color: PAPER_DIM, upIsGood: null, retest: false },
];

function daysAgo(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
}

function Sparkline({ points, color }) {
  if (points.length < 2) return <span style={{ width: 64 }} />;
  const w = 64, h = 22, pad = 2;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const xy = points.map((p, i) => [pad + (i / (points.length - 1)) * (w - pad * 2), h - pad - ((p.value - min) / span) * (h - pad * 2)]);
  return (
    <svg width={w} height={h} aria-hidden="true">
      <polyline points={xy.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r="2.5" fill={color} />
    </svg>
  );
}

function Row({ label, latest, unit, points, color, delta, deltaGood, due }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex-1 text-left min-w-0">
        <div style={{ color: PAPER_DIM }} className="text-sm truncate">{label}</div>
        {due && <div style={{ color: AMBER }} className="text-sm">Time to retest</div>}
      </div>
      <Sparkline points={points} color={color} />
      <div className="text-right" style={{ minWidth: 76 }}>
        <div style={{ color: PAPER }} className="text-sm font-medium">{latest}{unit}</div>
        {delta != null && delta !== 0 && (
          <div style={{ color: deltaGood == null ? TEXT_SOFT : deltaGood ? MOSS : TEXT_SOFT }} className="text-sm">
            {delta > 0 ? '+' : ''}{Math.round(delta * 10) / 10}
          </div>
        )}
      </div>
    </div>
  );
}

// Trends from the measurements people log in Account and the fitness tests,
// plus estimated 1RMs. Hidden until there's something to show.
export default function FitnessTrends({ userId, profile, active }) {
  const [measurements, setMeasurements] = useState([]);
  const [oneRms, setOneRms] = useState([]);

  useEffect(() => {
    if (!active) return;
    (async () => {
      const m = await supabase.from('fitness_measurements').select('kind, value, measured_at').eq('user_id', userId).order('measured_at', { ascending: true });
      setMeasurements(m.error ? [] : (m.data || []));
      const r = await supabase.from('estimated_1rms').select('exercise_name, estimated_1rm_lb, created_at').eq('user_id', userId).order('created_at', { ascending: true });
      setOneRms(r.error ? [] : (r.data || []));
    })();
  }, [userId, active]);

  const rows = [];
  KINDS.forEach((k) => {
    const pts = measurements.filter((m) => m.kind === k.kind).map((m) => ({ value: Number(m.value), at: m.measured_at }));
    if (pts.length === 0) {
      // Nothing logged yet: fall back to the single value on file.
      const fallback = k.kind === 'vo2max' ? profile?.vo2max_estimate : k.kind === 'resting_hr' ? profile?.resting_hr_bpm : profile?.bodyweight_lb;
      if (fallback == null) return;
      const at = k.kind === 'vo2max' ? profile?.vo2max_tested_at : null;
      pts.push({ value: Number(fallback), at });
    }
    const first = pts[0].value, last = pts[pts.length - 1];
    const delta = pts.length > 1 ? last.value - first : null;
    rows.push({
      key: k.kind, label: k.label, unit: k.unit, color: k.color, points: pts, latest: Math.round(last.value * 10) / 10,
      delta, deltaGood: delta == null || k.upIsGood == null ? null : (k.upIsGood ? delta > 0 : delta < 0),
      due: k.retest && last.at && daysAgo(last.at) >= RETEST_DAYS,
    });
  });

  const byLift = {};
  oneRms.forEach((r) => { (byLift[r.exercise_name] ||= []).push({ value: Number(r.estimated_1rm_lb), at: r.created_at }); });
  Object.entries(byLift).slice(0, 4).forEach(([name, pts]) => {
    const last = pts[pts.length - 1];
    const delta = pts.length > 1 ? last.value - pts[0].value : null;
    rows.push({
      key: `1rm-${name}`, label: `${name} 1RM`, unit: ' lb', color: SKY, points: pts, latest: Math.round(last.value),
      delta, deltaGood: delta == null ? null : delta > 0, due: daysAgo(last.at) >= RETEST_DAYS,
    });
  });

  if (rows.length === 0) return null;
  return (
    <div style={{ background: INK_2, borderTop: `2px solid ${MOSS}` }} className="rounded-lg px-5 py-4">
      <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-1">Your Fitness</div>
      {rows.map(({ key, ...r }) => <Row key={key} {...r} />)}
      {rows.some((r) => r.due) && (
        <div style={{ color: TEXT_SOFT }} className="text-sm mt-1">Retest in Account → Baseline Data.</div>
      )}
    </div>
  );
}
