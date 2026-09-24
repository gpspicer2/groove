import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Square, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Portal from '../../Portal';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY, BRICK } from '../../theme';
import { RATING_SCALE, AEROBIC_ACTIVITIES, ONE_RM_LIFTS } from './fitnessAssessment';

// A short, coached, step-by-step flow — one question/action per screen,
// so it feels like being walked through a session rather than filling
// out a form. Entirely optional; can be exited at any point.
const STEPS = ['intro', 'resting_hr', 'aerobic_rating', 'aerobic_mode', 'aerobic_detail', 'resistance_rating', 'resistance_1rm_ask', 'resistance_1rm'];

export default function FitnessAssessmentFlow({ userId, onClose, onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [restingHr, setRestingHr] = useState('');
  const [aerobicRating, setAerobicRating] = useState('');
  const [aerobicMode, setAerobicMode] = useState(''); // 'timed' | 'described'
  const [aerobicActivity, setAerobicActivity] = useState('');
  const [aerobicSeconds, setAerobicSeconds] = useState(null);
  const [aerobicResult, setAerobicResult] = useState('');
  const [aerobicDescription, setAerobicDescription] = useState('');
  const [resistanceRating, setResistanceRating] = useState('');
  const [canEstimate1rm, setCanEstimate1rm] = useState('');
  const [oneRms, setOneRms] = useState({});
  const [saving, setSaving] = useState(false);

  const visibleSteps = STEPS.filter((s) => {
    if (s === 'resistance_1rm' && canEstimate1rm !== 'Yes') return false;
    return true;
  });
  const step = visibleSteps[stepIndex];
  const isLast = stepIndex === visibleSteps.length - 1;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('resting_hr_bpm').eq('id', userId).maybeSingle();
      if (data?.resting_hr_bpm != null) setRestingHr(String(data.resting_hr_bpm));
    })();
  }, [userId]);

  function canAdvance() {
    if (step === 'resting_hr') return Boolean(restingHr.trim()) && Number(restingHr) > 0;
    if (step === 'aerobic_rating') return Boolean(aerobicRating);
    if (step === 'aerobic_mode') return Boolean(aerobicMode);
    if (step === 'aerobic_detail') return aerobicMode === 'timed' ? Boolean(aerobicResult) : Boolean(aerobicDescription.trim());
    if (step === 'resistance_rating') return Boolean(resistanceRating);
    if (step === 'resistance_1rm_ask') return Boolean(canEstimate1rm);
    return true;
  }

  async function handleFinish() {
    setSaving(true);
    const fitness_assessment = {
      aerobic_rating: aerobicRating,
      aerobic_mode: aerobicMode,
      aerobic_activity: aerobicMode === 'timed' ? aerobicActivity : null,
      aerobic_seconds: aerobicMode === 'timed' ? aerobicSeconds : null,
      aerobic_result: aerobicMode === 'timed' ? aerobicResult : null,
      aerobic_description: aerobicMode === 'described' ? aerobicDescription.trim() : null,
      resistance_rating: resistanceRating,
      can_estimate_1rm: canEstimate1rm,
      one_rep_maxes: canEstimate1rm === 'Yes' ? oneRms : null,
    };
    await Promise.all([
      supabase.from('baseline_responses').upsert({ user_id: userId, fitness_assessment }, { onConflict: 'user_id' }),
      supabase.from('profiles').update({ resting_hr_bpm: Number(restingHr) }).eq('id', userId),
    ]);
    setSaving(false);
    onComplete();
  }

  function handleNext() {
    if (!canAdvance()) return;
    if (isLast) { handleFinish(); return; }
    setStepIndex((i) => i + 1);
  }

  return (
    <Portal>
    <div style={{ background: INK, fontFamily: 'Inter, sans-serif' }} className="fixed inset-0 flex flex-col z-50">
      <div className="max-w-md mx-auto w-full px-4 pt-safe flex items-center justify-between">
        <div style={{ color: LIME, fontFamily: "'Segoe UI', sans-serif" }} className="text-sm font-extrabold tracking-widest uppercase italic">
          <em>GROOVE</em>
        </div>
        <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-2 -m-2">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 max-w-md mx-auto w-full px-4 py-6 flex flex-col justify-center text-center">
        {step === 'intro' && (
          <div>
            <h1 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-2xl font-medium mb-3">
              Where are you starting from?
            </h1>
            <p style={{ color: TEXT_SOFT }} className="text-sm mb-2">
              This helps me build a program that actually fits you. Totally optional — but the more I know, the better I can help.
            </p>
            <p style={{ color: TEXT_SOFT }} className="text-sm">
              We'll cover aerobic fitness first, then strength. Takes about 2 minutes.
            </p>
          </div>
        )}

        {step === 'resting_hr' && (
          <div>
            <h2 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-xl font-medium mb-3">
              What's your resting heart rate?
            </h2>
            <p style={{ color: TEXT_SOFT }} className="text-sm mb-4">
              Check first thing in the morning, or right now if you've been sitting still for a few minutes. This is what powers your personal heart-rate zones.
            </p>
            <input
              type="number"
              inputMode="numeric"
              value={restingHr}
              onChange={(e) => setRestingHr(e.target.value)}
              placeholder="e.g., 62"
              style={{ background: INK_3, color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }}
              className="w-24 rounded-md px-3 py-2.5 text-lg outline-none text-center mx-auto block"
            />
            <div style={{ color: TEXT_SOFT }} className="text-sm mt-2">bpm</div>
          </div>
        )}

        {step === 'aerobic_rating' && (
          <RatingStep title="How would you rate your current aerobic fitness?" value={aerobicRating} onChange={setAerobicRating} />
        )}

        {step === 'aerobic_mode' && (
          <div>
            <h2 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-xl font-medium mb-4">
              Want to get more specific?
            </h2>
            <div className="space-y-2">
              <ModeButton label="Time myself in the app" selected={aerobicMode === 'timed'} onClick={() => setAerobicMode('timed')} />
              <ModeButton label="Describe it in my own words" selected={aerobicMode === 'described'} onClick={() => setAerobicMode('described')} />
            </div>
          </div>
        )}

        {step === 'aerobic_detail' && aerobicMode === 'timed' && (
          <TimedAerobicStep
            activity={aerobicActivity}
            onSelectActivity={setAerobicActivity}
            onSeconds={setAerobicSeconds}
            result={aerobicResult}
            onResult={setAerobicResult}
          />
        )}

        {step === 'aerobic_detail' && aerobicMode === 'described' && (
          <div>
            <h2 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-xl font-medium mb-3">
              Describe your aerobic endurance
            </h2>
            <p style={{ color: TEXT_SOFT }} className="text-sm mb-3">
              E.g., "I can walk for 30 minutes without stopping, but running winds me quickly."
            </p>
            <textarea
              value={aerobicDescription}
              onChange={(e) => setAerobicDescription(e.target.value)}
              rows={4}
              style={{ background: INK_3, color: PAPER }}
              className="w-full rounded-md px-3 py-2.5 text-sm outline-none resize-none text-left"
            />
          </div>
        )}

        {step === 'resistance_rating' && (
          <RatingStep title="How would you rate your current strength / resistance training experience?" value={resistanceRating} onChange={setResistanceRating} />
        )}

        {step === 'resistance_1rm_ask' && (
          <div>
            <h2 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-xl font-medium mb-4">
              Can you estimate your strength on any traditional lifts? (e.g., bench press, squat, deadlift)
            </h2>
            <div className="space-y-2">
              <ModeButton label="Yes" selected={canEstimate1rm === 'Yes'} onClick={() => setCanEstimate1rm('Yes')} />
              <ModeButton label="No" selected={canEstimate1rm === 'No'} onClick={() => setCanEstimate1rm('No')} />
            </div>
          </div>
        )}

        {step === 'resistance_1rm' && (
          <div>
            <h2 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-xl font-medium mb-4">
              Estimated 1-rep max (lb)
            </h2>
            <p style={{ color: TEXT_SOFT }} className="text-sm mb-3">Leave any blank if you're not sure.</p>
            <div className="space-y-3">
              {ONE_RM_LIFTS.map((lift) => (
                <div key={lift} className="text-left">
                  <label style={{ color: PAPER_DIM }} className="text-sm">{lift}</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={oneRms[lift] || ''}
                    onChange={(e) => setOneRms((prev) => ({ ...prev, [lift]: e.target.value }))}
                    style={{ background: INK_3, color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }}
                    className="w-full rounded-md px-3 py-2.5 mt-1 text-sm outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-md mx-auto w-full px-4 pb-8 flex items-center gap-3">
        {stepIndex > 0 && (
          <button onClick={() => setStepIndex((i) => i - 1)} style={{ color: TEXT_SOFT }} className="flex items-center gap-1 text-sm py-3 px-2 -mx-2">
            <ChevronLeft size={16} /> Back
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!canAdvance() || saving}
          style={{ background: canAdvance() ? LIME : INK_3, color: canAdvance() ? INK : TEXT_SOFT }}
          className="flex-1 rounded-md py-3 text-sm font-medium flex items-center justify-center gap-1.5"
        >
          {saving ? 'Saving…' : isLast ? 'Finish' : 'Next'}
          {!isLast && !saving && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
    </Portal>
  );
}

function RatingStep({ title, value, onChange }) {
  return (
    <div>
      <h2 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-xl font-medium mb-4">{title}</h2>
      <div className="space-y-2">
        {RATING_SCALE.map((opt) => (
          <ModeButton key={opt} label={opt} selected={value === opt} onClick={() => onChange(opt)} />
        ))}
      </div>
    </div>
  );
}

function ModeButton({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ background: selected ? LIME : INK_3, color: selected ? INK : PAPER_DIM }}
      className="w-full rounded-md px-4 py-3 text-sm text-center"
    >
      {label}
    </button>
  );
}

function TimedAerobicStep({ activity, onSelectActivity, onSeconds, result, onResult }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    function tick() {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      rafRef.current = requestAnimationFrame(tick);
    }
    startRef.current = Date.now() - elapsed * 1000;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function handleStart() {
    setElapsed(0);
    setFinished(false);
    setRunning(true);
  }
  function handleStop() {
    setRunning(false);
    setFinished(true);
    onSeconds(elapsed);
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  if (!activity) {
    return (
      <div>
        <h2 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-xl font-medium mb-4">Pick an activity</h2>
        <div className="space-y-2">
          {AEROBIC_ACTIVITIES.map((a) => (
            <ModeButton key={a.key} label={a.label} selected={activity === a.key} onClick={() => onSelectActivity(a.key)} />
          ))}
        </div>
      </div>
    );
  }

  const activityInfo = AEROBIC_ACTIVITIES.find((a) => a.key === activity);

  return (
    <div>
      <h2 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-xl font-medium mb-2">{activityInfo.label}</h2>
      <p style={{ color: TEXT_SOFT }} className="text-sm mb-5">{activityInfo.instructions}</p>

      <div style={{ color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }} className="text-5xl font-medium mb-5 tabular-nums">
        {mm}:{ss}
      </div>

      {!finished ? (
        <button
          onClick={running ? handleStop : handleStart}
          style={{ background: running ? BRICK : LIME, color: INK }}
          className="w-full rounded-md py-3 text-sm font-medium flex items-center justify-center gap-1.5 mb-3"
        >
          {running ? <Square size={14} /> : <Play size={14} />} {running ? 'Stop' : 'Start'}
        </button>
      ) : (
        <div className="text-left">
          <label style={{ color: PAPER_DIM }} className="text-sm">
            {activity === 'walk' ? 'Did you complete the full 600m?' : 'About how many flights did you climb?'}
          </label>
          <input
            type="text"
            value={result}
            onChange={(e) => onResult(e.target.value)}
            placeholder={activity === 'walk' ? 'e.g., Yes, easily / Yes, but tough / No, had to stop' : 'e.g., 6 flights'}
            style={{ background: INK_3, color: PAPER }}
            className="w-full rounded-md px-3 py-2.5 mt-1 text-sm outline-none"
          />
          <button onClick={handleStart} style={{ color: SKY }} className="text-sm mt-2">
            Redo timer
          </button>
        </div>
      )}
    </div>
  );
}
