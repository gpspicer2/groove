import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, X } from '../../lib/icons';
import Portal from '../../Portal';
import { useAuth } from '../../auth/AuthContext';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, PLUM, AMBER, BRICK } from '../../theme';
import { SCREENING_VERSION, SYMPTOMS, DISEASES, OTHER_CONDITIONS, screeningResult, RESULT_COPY, labelsFor } from './screening';

export const TONE_COLOR = { good: PLUM, caution: AMBER, stop: BRICK };

// Steps branch: anyone reporting symptoms skips the known-disease question,
// since it can't change their result.
function stepsFor(symptoms) {
  return symptoms.length > 0
    ? ['active', 'symptoms', 'other', 'result']
    : ['active', 'symptoms', 'diseases', 'other', 'result'];
}

export default function ScreeningFlow({ onDone, onClose, onSaving }) {
  const { updateProfile } = useAuth();
  const [step, setStep] = useState('active');
  const [active, setActive] = useState(null);
  const [symptoms, setSymptoms] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [other, setOther] = useState([]);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const scrollRef = useRef(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [step]);

  const steps = stepsFor(symptoms);
  const index = steps.indexOf(step);
  const questionCount = steps.length - 1;

  function goBack() {
    setStep(steps[index - 1]);
  }

  async function finish() {
    setSaving(true);
    setError('');
    const screening = {
      version: SCREENING_VERSION,
      completed_at: new Date().toISOString(),
      active,
      symptoms,
      diseases: symptoms.length > 0 ? [] : diseases,
      other,
      result: screeningResult({ symptoms, diseases: symptoms.length > 0 ? [] : diseases, active }),
      cleared_at: null,
    };
    onSaving?.();
    const err = (await updateProfile({ screening }))?.error;
    setSaving(false);
    if (err) { setError(err.message); return; }
    setSaved(screening);
    setStep('result');
  }

  async function markCleared() {
    const next = { ...saved, cleared_at: new Date().toISOString() };
    const err = (await updateProfile({ screening: next }))?.error;
    if (err) { setError(err.message); return; }
    onDone(next);
  }

  function next() {
    if (steps[index + 1] === 'result') finish();
    else setStep(steps[index + 1]);
  }

  return (
    <Portal>
      <div style={{ background: INK, fontFamily: 'Outfit, sans-serif' }} className="fixed inset-0 z-[70] flex flex-col">
        <div className="max-w-md mx-auto w-full px-4 pt-safe pb-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center h-10">
            {index > 0 && step !== 'result' ? (
              <button onClick={goBack} style={{ color: TEXT_SOFT }} className="flex items-center gap-1 text-sm justify-self-start">
                <ChevronLeft size={16} /> Back
              </button>
            ) : <div />}
            <div style={{ color: TEXT_SOFT }} className="text-sm">
              {step === 'result' ? 'Health check' : `Health check · ${index + 1} of ${questionCount}`}
            </div>
            {onClose && step !== 'result' ? (
              <button onClick={onClose} style={{ color: TEXT_SOFT }} className="justify-self-end p-2 -m-2" aria-label="Close"><X size={18} /></button>
            ) : <div />}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto max-w-md mx-auto w-full px-4 pb-8">
          {step === 'active' && (
            <Question
              title="Have you been active lately?"
              hint="30+ minutes of moderate activity (you can talk, but not sing), 3+ days a week, for the past 3 months."
            >
              <div className="space-y-2">
                {[['Yes', true], ['No', false]].map(([label, value]) => (
                  <Choice key={label} selected={active === value} onClick={() => { setActive(value); setStep('symptoms'); }}>{label}</Choice>
                ))}
              </div>
            </Question>
          )}

          {step === 'symptoms' && (
            <MultiQuestion
              title="Do you have any of these?"
              hint="At rest or during activity."
              options={SYMPTOMS}
              selected={symptoms}
              onChange={setSymptoms}
              onNext={next}
            />
          )}

          {step === 'diseases' && (
            <MultiQuestion
              title="Has a doctor told you that you have any of these?"
              options={DISEASES}
              selected={diseases}
              onChange={setDiseases}
              onNext={next}
            />
          )}

          {step === 'other' && (
            <MultiQuestion
              title="Anything else Greg should know about?"
              hint="Helps tailor your plan."
              options={OTHER_CONDITIONS}
              selected={other}
              onChange={setOther}
              onNext={next}
              saving={saving}
            />
          )}

          {step === 'result' && saved && (
            <ScreeningResult screening={saved} onContinue={() => onDone(saved)} onCleared={markCleared} />
          )}

          {error && <div style={{ color: BRICK }} className="text-sm text-center mt-3">{error}</div>}
        </div>
      </div>
    </Portal>
  );
}

function Question({ title, hint, children }) {
  return (
    <div>
      <h1 style={{ color: PAPER }} className="text-xl font-medium text-center mt-4 mb-1">{title}</h1>
      {hint && <p style={{ color: TEXT_SOFT }} className="text-sm text-center mb-5">{hint}</p>}
      {!hint && <div className="mb-5" />}
      {children}
    </div>
  );
}

function Choice({ selected, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{ background: selected ? PLUM : INK_3, color: selected ? INK : PAPER }}
      className="w-full rounded-md px-4 py-3 text-sm text-center"
    >
      {children}
    </button>
  );
}

function MultiQuestion({ title, hint, options, selected, onChange, onNext, saving }) {
  function toggle(key) {
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  }
  return (
    <Question title={title} hint={hint}>
      <div className="space-y-2 mb-5">
        {options.map((o) => (
          <Choice key={o.key} selected={selected.includes(o.key)} onClick={() => toggle(o.key)}>{o.label}</Choice>
        ))}
      </div>
      <button
        onClick={onNext}
        disabled={saving}
        style={{ background: selected.length ? PLUM : INK_2, color: selected.length ? INK : PAPER, border: selected.length ? 'none' : `1px solid ${INK_3}` }}
        className="w-full rounded-md py-3 text-sm font-medium"
      >
        {saving ? 'Saving…' : selected.length ? 'Next' : 'None of these'}
      </button>
    </Question>
  );
}

export function ScreeningResult({ screening, onContinue, onCleared }) {
  const copy = RESULT_COPY[screening.result];
  const color = TONE_COLOR[copy.tone];
  const reported = [...labelsFor(SYMPTOMS, screening.symptoms), ...labelsFor(DISEASES, screening.diseases)];
  return (
    <div className="text-center">
      <div style={{ background: INK_2, borderTop: `3px solid ${color}` }} className="rounded-lg px-5 py-6 mt-4 mb-4">
        <h1 style={{ color }} className="text-xl font-medium mb-2">{copy.title}</h1>
        <p style={{ color: PAPER_DIM }} className="text-sm">{copy.body(screening.active)}</p>
        {screening.result !== 'clear' && reported.length > 0 && (
          <div style={{ color: TEXT_SOFT }} className="text-sm mt-3">
            You mentioned: {reported.join('; ').toLowerCase()}.
          </div>
        )}
      </div>
      <p style={{ color: TEXT_SOFT }} className="text-xs mb-4">
        Based on the American College of Sports Medicine's screening guidelines.
      </p>
      <button onClick={onContinue} style={{ background: PLUM, color: INK }} className="w-full rounded-md py-3 text-sm font-medium mb-3">
        Continue
      </button>
      {screening.result !== 'clear' && onCleared && (
        <button onClick={onCleared} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2 underline">
          My doctor has already cleared me
        </button>
      )}
    </div>
  );
}
