import React, { useState, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Portal from '../../Portal';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY, BRICK } from '../../theme';

// Three submaximal, exercise-based field tests — deliberately not the
// Bruce Protocol or any other maximal/symptom-limited test, which
// really wants clinical supervision. Each is a real published
// regression equation; genderTerm folds "Other" to the midpoint of the
// male/female coefficient rather than forcing a binary choice.
function genderTerm(gender) {
  if (gender === 'Male') return 1;
  if (gender === 'Female') return 0;
  return 0.5;
}

const VO2_TESTS = [
  {
    key: 'rockport',
    name: 'Rockport 1-Mile Walk Test',
    blurb: 'Walk one mile as briskly as you comfortably can, then take your heart rate.',
    instructions: [
      'Find a flat, measured mile (a track is 4 laps ≈ 1600m, or use a mapped route/treadmill).',
      'Walk the mile as fast as you can maintain the whole way — brisk, not a jog.',
      'The moment you finish, take your heart rate for 15 seconds and multiply by 4 (or read it off a watch/strap).',
      'Enter your finishing time and heart rate below.',
    ],
    fields: ({ values, setValue }) => (
      <>
        <NumberField label="Time — minutes" value={values.min} onChange={(v) => setValue('min', v)} placeholder="14" />
        <NumberField label="Time — seconds" value={values.sec} onChange={(v) => setValue('sec', v)} placeholder="30" />
        <NumberField label="Heart rate at finish (bpm)" value={values.hr} onChange={(v) => setValue('hr', v)} placeholder="150" />
      </>
    ),
    compute: (values, { weightLb, age, gender }) => {
      const timeMin = Number(values.min || 0) + Number(values.sec || 0) / 60;
      const hr = Number(values.hr);
      if (!timeMin || !hr || !weightLb || !age) return null;
      return 132.853 - 0.0769 * weightLb - 0.3877 * age + 6.315 * genderTerm(gender) - 3.2649 * timeMin - 0.1565 * hr;
    },
  },
  {
    key: 'queens',
    name: 'Queens College Step Test',
    blurb: 'Step up and down a knee-height step for 3 minutes, then check your recovery heart rate.',
    instructions: [
      'Use a step or bench about 16 inches tall (two stacked standard stair steps works).',
      'Step up-up-down-down for 3 minutes at a steady pace — about 22 steps/min if you\'re a woman, 24/min if you\'re a man (roughly 1 step every 2-3 seconds).',
      'The moment you stop, sit down. Starting 5 seconds after you stop, count your pulse for 15 seconds.',
      'Enter that 15-second count below — it\'ll do the ×4 for you.',
    ],
    fields: ({ values, setValue }) => (
      <NumberField label="15-second pulse count (right after stopping)" value={values.pulse15} onChange={(v) => setValue('pulse15', v)} placeholder="34" />
    ),
    compute: (values, { gender }) => {
      const hr = Number(values.pulse15) * 4;
      if (!hr) return null;
      const g = genderTerm(gender);
      const menEst = 111.33 - 0.42 * hr;
      const womenEst = 65.81 - 0.1847 * hr;
      return menEst * g + womenEst * (1 - g);
    },
  },
  {
    key: 'jog',
    name: '1-Mile Jog Test',
    blurb: 'Jog one mile at a steady, sustainable pace — not an all-out effort.',
    instructions: [
      'Same measured mile as the walk test, but jog it at a steady, conversational-ish pace — this isn\'t a race.',
      'The moment you finish, take your heart rate for 15 seconds and multiply by 4.',
      'Enter your finishing time and heart rate below.',
    ],
    fields: ({ values, setValue }) => (
      <>
        <NumberField label="Time — minutes" value={values.min} onChange={(v) => setValue('min', v)} placeholder="9" />
        <NumberField label="Time — seconds" value={values.sec} onChange={(v) => setValue('sec', v)} placeholder="45" />
        <NumberField label="Heart rate at finish (bpm)" value={values.hr} onChange={(v) => setValue('hr', v)} placeholder="165" />
      </>
    ),
    compute: (values, { weightLb, gender }) => {
      const timeMin = Number(values.min || 0) + Number(values.sec || 0) / 60;
      const hr = Number(values.hr);
      if (!timeMin || !hr || !weightLb) return null;
      const weightKg = weightLb / 2.20462;
      return 100.5 + 8.344 * genderTerm(gender) - 0.1636 * weightKg - 1.438 * timeMin - 0.1928 * hr;
    },
  },
];

function NumberField({ label, value, onChange, placeholder }) {
  return (
    <div className="mb-3">
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-1 text-center">{label}</div>
      <input
        type="number"
        inputMode="decimal"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ background: INK_3, color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }}
        className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center"
      />
    </div>
  );
}

function vo2Category(vo2) {
  // Rough, non-age-adjusted bands just to give the number some meaning
  // at a glance — not a substitute for age/sex-normed percentile tables.
  if (vo2 >= 50) return 'Excellent';
  if (vo2 >= 42) return 'Good';
  if (vo2 >= 35) return 'Fair';
  return 'Needs work';
}

export function VO2maxEstimator({ userId, profile, updateProfile }) {
  const [activeTest, setActiveTest] = useState(null);
  const [values, setValues] = useState({});
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  function setValue(key, v) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }
  function openTest(test) {
    setActiveTest(test);
    setValues({});
    setResult(null);
  }
  function handleCalculate() {
    const vo2 = activeTest.compute(values, {
      weightLb: profile?.bodyweight_lb ? Number(profile.bodyweight_lb) : null,
      age: profile?.age ? Number(profile.age) : null,
      gender: profile?.gender,
    });
    setResult(vo2);
  }
  async function handleSave() {
    setSaving(true);
    const rounded = Math.round(result * 10) / 10;
    const isNewBest = !profile?.vo2max_estimate || rounded > Number(profile.vo2max_estimate);
    if (isNewBest) {
      await updateProfile({ vo2max_estimate: rounded, vo2max_method: activeTest.name, vo2max_tested_at: new Date().toISOString() });
    }
    setSaving(false);
    setActiveTest(null);
  }

  const missingInputs = !profile?.bodyweight_lb || (activeTest?.key !== 'queens' && !profile?.bodyweight_lb);

  return (
    <div className="mb-2">
      <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-2 text-center">Aerobic Capacity (VO2max)</div>
      {profile?.vo2max_estimate ? (
        <div style={{ background: INK_3 }} className="rounded-md px-4 py-3 text-center mb-2">
          <div style={{ color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }} className="text-lg">
            {profile.vo2max_estimate} <span style={{ color: TEXT_SOFT }} className="text-sm">ml/kg/min</span>
          </div>
          <div style={{ color: LIME }} className="text-sm">{vo2Category(profile.vo2max_estimate)}</div>
          <div style={{ color: TEXT_SOFT }} className="text-sm mt-0.5">
            via {profile.vo2max_method}{profile.vo2max_tested_at ? ` · ${new Date(profile.vo2max_tested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
          </div>
        </div>
      ) : (
        <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-2">No estimate yet — pick a test below.</div>
      )}
      <div className="space-y-2">
        {VO2_TESTS.map((t) => (
          <button key={t.key} onClick={() => openTest(t)} style={{ background: INK_3 }} className="w-full grid grid-cols-[1fr_16px] items-center rounded-md px-4 py-3 text-left">
            <span>
              <div style={{ color: PAPER }} className="text-sm font-medium">{t.name}</div>
              <div style={{ color: TEXT_SOFT }} className="text-sm">{t.blurb}</div>
            </span>
            <ChevronRight size={16} color={TEXT_SOFT} className="justify-self-end" />
          </button>
        ))}
      </div>
      <div style={{ color: TEXT_SOFT }} className="text-sm text-center mt-2">
        Did more than one? The highest estimate is kept as your best.
      </div>

      {activeTest && (
        <Portal>
          <div style={{ background: 'rgba(0,0,0,0.75)' }} className="fixed inset-0 z-[60] flex items-end md:items-center justify-center px-4">
            <div style={{ background: INK_2 }} className="w-full max-w-sm rounded-t-2xl md:rounded-2xl px-5 py-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-base">{activeTest.name}</h3>
                <button onClick={() => setActiveTest(null)} style={{ color: TEXT_SOFT }} className="p-2 -m-2"><X size={20} /></button>
              </div>
              <ol style={{ color: PAPER_DIM }} className="text-sm space-y-1.5 mb-4 list-decimal list-inside">
                {activeTest.instructions.map((line, i) => <li key={i}>{line}</li>)}
              </ol>
              {(!profile?.bodyweight_lb || !profile?.age) && (
                <div style={{ color: SKY }} className="text-sm text-center mb-3">
                  Add your bodyweight{!profile?.age ? ' and age' : ''} in Baseline Data for a more accurate estimate.
                </div>
              )}
              {activeTest.fields({ values, setValue })}
              {result == null ? (
                <button onClick={handleCalculate} style={{ background: LIME, color: INK }} className="w-full rounded-md py-2.5 text-sm font-medium mt-2">
                  Calculate
                </button>
              ) : result <= 0 || Number.isNaN(result) ? (
                <div style={{ color: BRICK }} className="text-sm text-center mt-2">
                  That combination of numbers doesn't produce a valid estimate — double check your entries.
                </div>
              ) : (
                <div className="mt-2 text-center">
                  <div style={{ color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }} className="text-2xl mb-1">
                    {Math.round(result * 10) / 10} <span style={{ color: TEXT_SOFT }} className="text-sm">ml/kg/min</span>
                  </div>
                  <div style={{ color: LIME }} className="text-sm mb-3">{vo2Category(result)}</div>
                  <button onClick={handleSave} disabled={saving} style={{ background: LIME, color: INK }} className="w-full rounded-md py-2.5 text-sm font-medium">
                    {saving ? 'Saving…' : 'Save Estimate'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

export function OneRMEstimator({ userId }) {
  const [open, setOpen] = useState(false);
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('estimated_1rms').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      setEstimates(data || []);
      setLoading(false);
    })();
  }, [userId]);

  const w = Number(weight);
  const r = Number(reps);
  const estimate = w > 0 && r > 0 && r <= 15 ? Math.round(w * (1 + r / 30)) : null;

  async function handleSave() {
    if (!name.trim() || !estimate) return;
    const { data, error } = await supabase
      .from('estimated_1rms')
      .insert({ user_id: userId, exercise_name: name.trim(), estimated_1rm_lb: estimate })
      .select()
      .single();
    if (!error) {
      setEstimates((prev) => [data, ...prev]);
      setName(''); setWeight(''); setReps('');
    }
  }

  return (
    <div style={{ background: INK_3 }} className="rounded-md px-4 py-3 mb-2">
      <button onClick={() => setOpen((v) => !v)} className="w-full grid grid-cols-[24px_1fr_24px] items-center">
        <span />
        <span style={{ color: SKY }} className="text-sm uppercase tracking-wide font-bold">Strength (Estimated 1RM)</span>
        <ChevronRight size={16} color={TEXT_SOFT} className="justify-self-end" style={{ transform: open ? 'rotate(90deg)' : 'none' }} />
      </button>
      {open && (
        <div style={{ borderTop: `1px dashed ${INK_2}` }} className="mt-3 pt-3">
          <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-3">
            Not a real max-effort attempt — pick a weight you can lift for 5-10 reps with good form, stopping just short of failure. Warm up first.
          </div>
          {!loading && estimates.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {estimates.map((e) => (
                <div key={e.id} className="flex items-center justify-between">
                  <span style={{ color: PAPER }} className="text-sm">{e.exercise_name}</span>
                  <span style={{ color: TEXT_SOFT, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm">{Math.round(e.estimated_1rm_lb)} lb</span>
                </div>
              ))}
            </div>
          )}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Exercise (e.g. Back Squat)"
            style={{ background: INK_2, color: PAPER }}
            className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center mb-2"
          />
          <div className="flex items-center gap-2 mb-2">
            <input
              type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)}
              placeholder="Weight (lb)" style={{ background: INK_2, color: PAPER }}
              className="flex-1 rounded-md px-3 py-2.5 text-sm outline-none text-center"
            />
            <input
              type="number" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)}
              placeholder="Reps" style={{ background: INK_2, color: PAPER }}
              className="flex-1 rounded-md px-3 py-2.5 text-sm outline-none text-center"
            />
          </div>
          {reps && Number(reps) > 15 && (
            <div style={{ color: BRICK }} className="text-sm text-center mb-2">Keep it under ~15 reps for the estimate to hold up.</div>
          )}
          {estimate && (
            <div style={{ color: PAPER }} className="text-sm text-center mb-2">
              Estimated 1RM: <span style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{estimate} lb</span>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={!name.trim() || !estimate}
            style={{ background: name.trim() && estimate ? SKY : INK_2, color: name.trim() && estimate ? INK : TEXT_SOFT }}
            className="w-full rounded-md py-2.5 text-sm font-medium"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
