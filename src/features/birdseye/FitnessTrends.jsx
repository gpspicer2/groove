import React, { useState, useEffect } from 'react';
import { X } from '../../lib/icons';
import { supabase } from '../../lib/supabaseClient';
import Portal from '../../Portal';
import { useAuth } from '../../auth/AuthContext';
import { logMeasurement } from '../../lib/measurements';
import { VO2maxEstimator } from '../baseline/FitnessEstimates';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, MOSS, SKY, AMBER, BRICK } from '../../theme';

const RETEST_DAYS = 56; // ~8 weeks

// Field tests clients can log themselves. Norm labels are only included
// where the published cutoffs are well established (CDC STEADI chair stand,
// ACSM/NIH waist risk thresholds); the rest show the trend only.
const TESTS = [
  { kind: 'pushups', label: 'Push-ups', unit: ' reps', color: SKY, upIsGood: true, how: 'As many as you can with good form, no time limit.', step: 1 },
  { kind: 'plank', label: 'Plank hold', unit: ' sec', color: SKY, upIsGood: true, how: 'Hold a forearm plank in a straight line until your form breaks.', step: 1 },
  { kind: 'chair_stand', label: '30-sec chair stand', unit: '', color: SKY, upIsGood: true, how: 'Arms crossed on your chest, stand fully up and sit back down as many times as you can in 30 seconds.', step: 1 },
  { kind: 'sit_reach', label: 'Sit-and-reach', unit: ' in', color: SKY, upIsGood: true, allowNegative: true, how: 'Sit with legs straight and reach forward. Measure how far past your toes you get. Use a negative number if you stop short.', step: 0.5 },
  { kind: 'waist', label: 'Waist', unit: ' in', color: PAPER_DIM, upIsGood: false, how: 'Measure around your bare waist at the belly button, after breathing out normally.', step: 0.5 },
];

// CDC STEADI "below average" 30-second chair stand scores: [min age, men, women]
const CHAIR_BELOW = [[60, 14, 12], [65, 12, 11], [70, 12, 10], [75, 11, 10], [80, 10, 9], [85, 8, 8], [90, 7, 4]];
function testNote(kind, value, profile) {
  const age = Number(profile?.age);
  const g = profile?.gender;
  if (kind === 'chair_stand' && age >= 60 && (g === 'Male' || g === 'Female')) {
    const row = [...CHAIR_BELOW].reverse().find((r) => age >= r[0]);
    const cut = g === 'Male' ? row[1] : row[2];
    return value < cut ? 'Below average for your age' : 'Average or better for your age';
  }
  if (kind === 'waist' && (g === 'Male' || g === 'Female')) {
    return value > (g === 'Male' ? 40 : 35) ? 'Above the ACSM risk threshold' : 'In the healthy range';
  }
  return null;
}

const KINDS = [
  { kind: 'vo2max', label: 'VO2max', unit: '', color: MOSS, upIsGood: true, retest: true },
  { kind: 'resting_hr', label: 'Resting HR', unit: ' bpm', color: BRICK, upIsGood: false, retest: true },
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
      <polyline points={xy.map((p) => p.join(',')).join(' ')} fill="none" style={{ stroke: color }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r="2.5" style={{ fill: color }} />
    </svg>
  );
}

function Row({ label, latest, unit, points, color, delta, deltaGood, due, note, action, onAction }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex-1 text-left min-w-0">
        <div style={{ color: PAPER_DIM }} className="text-sm truncate">{label}</div>
        {due && <div style={{ color: AMBER }} className="text-sm">Time to retest</div>}
        {!due && note && <div style={{ color: TEXT_SOFT }} className="text-sm">{note}</div>}
      </div>
      <Sparkline points={points} color={color} />
      <div className="text-right" style={{ minWidth: 76 }}>
        {action && (
          <button onClick={onAction} style={{ background: color, color: INK }} className="rounded-md px-3 py-1.5 text-sm font-medium">{action}</button>
        )}
        {latest != null && <div style={{ color: PAPER }} className="text-sm font-medium">{latest}{unit}</div>}
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
  const [estimating, setEstimating] = useState(false);
  const [logging, setLogging] = useState(false);
  const [reload, setReload] = useState(0);
  const { updateProfile } = useAuth();

  useEffect(() => {
    if (!active) return;
    (async () => {
      const m = await supabase.from('fitness_measurements').select('kind, value, measured_at').eq('user_id', userId).order('measured_at', { ascending: true });
      setMeasurements(m.error ? [] : (m.data || []));
      const r = await supabase.from('estimated_1rms').select('exercise_name, estimated_1rm_lb, created_at').eq('user_id', userId).order('created_at', { ascending: true });
      setOneRms(r.error ? [] : (r.data || []));
    })();
  }, [userId, active, reload]);

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
      ...(k.kind === 'vo2max' ? { action: 'Retest', onAction: () => setEstimating(true) } : {}),
    });
  });
  // VO2max always has a spot; with no estimate yet it offers a guided test.
  if (!rows.some((r) => r.key === 'vo2max')) {
    rows.unshift({ key: 'vo2max', label: 'VO2max', unit: '', color: MOSS, points: [], latest: null, delta: null, deltaGood: null, due: false, action: 'Estimate', onAction: () => setEstimating(true) });
  }

  TESTS.forEach((t) => {
    const pts = measurements.filter((m) => m.kind === t.kind).map((m) => ({ value: Number(m.value), at: m.measured_at }));
    if (pts.length === 0) return;
    const last = pts[pts.length - 1];
    const delta = pts.length > 1 ? last.value - pts[0].value : null;
    rows.push({
      key: t.kind, label: t.label, unit: t.unit, color: t.color, points: pts, latest: Math.round(last.value * 10) / 10,
      delta, deltaGood: delta == null ? null : (t.upIsGood ? delta > 0 : delta < 0),
      due: daysAgo(last.at) >= RETEST_DAYS, note: testNote(t.kind, last.value, profile),
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

  return (
    <div style={{ background: INK_2, borderTop: `2px solid ${MOSS}` }} className="rounded-lg px-5 py-4">
      <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-1">Your Fitness</div>
      {rows.map(({ key, ...r }) => <Row key={key} {...r} />)}
      {rows.some((r) => r.due) && (
        <div style={{ color: TEXT_SOFT }} className="text-sm mt-1">Retest in Account → Baseline Data.</div>
      )}
      <button onClick={() => setLogging(true)} style={{ color: TEXT_SOFT }} className="text-sm underline mt-2">Log a strength or mobility test</button>
      {logging && <LogTestSheet userId={userId} onClose={() => setLogging(false)} onSaved={() => { setLogging(false); setReload((n) => n + 1); }} />}
      {estimating && (
        <Portal>
          <div style={{ background: 'rgba(0,0,0,0.75)' }} className="fixed inset-0 z-[55] flex items-center justify-center px-4" onClick={() => setEstimating(false)}>
            <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setEstimating(false)} aria-label="Close" style={{ color: TEXT_SOFT }} className="absolute top-3 right-3 p-2 z-10"><X size={18} /></button>
              <VO2maxEstimator userId={userId} profile={profile} updateProfile={updateProfile} />
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

function LogTestSheet({ userId, onClose, onSaved }) {
  const [test, setTest] = useState(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const num = value.trim() === '' ? NaN : Number(value);
  const valid = Number.isFinite(num) && (test?.allowNegative || num > 0);

  async function save() {
    setSaving(true);
    await logMeasurement(userId, test.kind, num, { allowNonPositive: Boolean(test.allowNegative) });
    setSaving(false);
    onSaved();
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[55] flex items-end justify-center">
        <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" onClick={onClose} />
        <div style={{ background: INK_2 }} className="relative w-full max-w-md rounded-t-xl px-4 pt-4 pb-6 space-y-3 text-center">
          <div className="flex items-center justify-between">
            <div style={{ color: PAPER }} className="text-sm font-medium">{test ? test.label : 'Which test?'}</div>
            <button onClick={onClose} aria-label="Close" style={{ color: TEXT_SOFT }} className="p-2 -m-2"><X size={18} /></button>
          </div>
          {!test ? (
            <div className="space-y-2">
              {TESTS.map((t) => (
                <button key={t.kind} onClick={() => setTest(t)} style={{ background: INK_3, color: PAPER }} className="w-full rounded-md py-3 text-sm">{t.label}</button>
              ))}
            </div>
          ) : (
            <>
              <p style={{ color: PAPER_DIM }} className="text-sm">{test.how}</p>
              <input
                type="number" inputMode="decimal" step={test.step} value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={`Your result${test.unit ? ` (${test.unit.trim()})` : ''}`}
                style={{ background: INK_3, color: PAPER }}
                className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center"
              />
              <button onClick={save} disabled={!valid || saving} style={{ background: valid ? SKY : INK_3, color: valid ? INK : TEXT_SOFT }} className="w-full rounded-md py-3 text-sm font-medium">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setTest(null); setValue(''); }} style={{ color: TEXT_SOFT }} className="w-full text-sm">Back</button>
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}
