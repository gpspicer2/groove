import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Portal from '../../Portal';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY, BRICK } from '../../theme';
import { BASELINE_SECTIONS, estimateSecondsRemaining } from './baselineQuestions';

const PAGES = BASELINE_SECTIONS.map((s) => ({ type: 'section', section: s }));

// onClose is optional — when provided (launched from Birdseye's prompt
// banner, rather than as the old full-app gate) a client can back out
// and pick this up again later instead of being stuck here.
export default function BaselineFlow({ userId, onComplete, onClose }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const page = PAGES[pageIndex];
  const isLast = pageIndex === PAGES.length - 1;
  const pct = Math.round(((pageIndex + 1) / PAGES.length) * 100);
  const secondsLeft = estimateSecondsRemaining(PAGES, pageIndex);
  const minutesLeft = Math.max(1, Math.round(secondsLeft / 60));

  function setAnswer(key, value) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function canAdvance() {
    return page.section.questions
      .filter((q) => q.required)
      .every((q) => (answers[q.key] || '').toString().trim().length > 0);
  }

  async function handleFinish() {
    setSaving(true);
    setError('');
    const [{ error }, ageError] = await Promise.all([
      supabase
        .from('baseline_responses')
        .upsert(
          { user_id: userId, form_answers: answers, submitted_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        ),
      // The age answer here also needs to land on profiles.age directly —
      // Account's own age field (and anything reading profile.age instead
      // of falling back to the baseline blob) would otherwise show blank
      // even though the client already answered this.
      answers.age
        ? supabase.from('profiles').update({ age: parseInt(answers.age, 10) }).eq('id', userId).then((r) => r.error)
        : Promise.resolve(null),
    ]);
    setSaving(false);
    if (error) { setError(error.message); return; }
    if (ageError) { setError(ageError.message); return; }
    onComplete();
  }

  function handleNext() {
    if (!canAdvance()) return;
    if (isLast) { handleFinish(); return; }
    setPageIndex((i) => i + 1);
  }

  return (
    <Portal>
    <div style={{ background: INK, fontFamily: 'Inter, sans-serif' }} className="fixed inset-0 z-50 flex flex-col">
      <div className="max-w-md mx-auto w-full px-4 pt-safe pb-4 text-center">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center mb-1">
          <div />
          <div style={{ color: LIME, fontFamily: "'Segoe UI', sans-serif" }} className="text-sm font-extrabold tracking-widest uppercase italic">
            <em>GROOVE</em>
          </div>
          {onClose ? (
            <button
              onClick={() => { if (window.confirm("Close for now? What you've entered on this form hasn't been saved yet, so you'll start over from the beginning next time you open it.")) onClose(); }}
              style={{ color: TEXT_SOFT }}
              className="flex items-center gap-1 text-sm p-2 -m-2 justify-self-end"
            >
              <X size={16} />
            </button>
          ) : <div />}
        </div>
        <h1 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-xl font-medium mb-1">
          {page.section.title}
        </h1>
        {page.section.subtitle && (
          <p style={{ color: TEXT_SOFT }} className="text-sm mb-2">{page.section.subtitle}</p>
        )}
        <div style={{ background: INK_3 }} className="h-2 rounded-full overflow-hidden mt-3 relative">
          <div style={{ width: `${pct}%`, background: LIME }} className="h-full rounded-full transition-all" />
        </div>
        <div style={{ color: TEXT_SOFT }} className="text-sm mt-1.5">
          {pct}% · Page {pageIndex + 1}/{PAGES.length} · ~{minutesLeft} min left
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto max-w-md mx-auto w-full px-4 pb-4 space-y-5">
        {page.section.questions.map((q) => (
          <QuestionField key={q.key} question={q} value={answers[q.key] || ''} onChange={(v) => setAnswer(q.key, v)} allAnswers={answers} setAnswer={setAnswer} />
        ))}
        {error && <div style={{ color: BRICK }} className="text-sm text-center">{error}</div>}
      </div>

      <div className="max-w-md mx-auto w-full px-4 pb-8 flex items-center gap-3">
        {pageIndex > 0 && (
          <button
            onClick={() => setPageIndex((i) => i - 1)}
            style={{ color: TEXT_SOFT }}
            className="flex items-center gap-1 text-sm py-3 px-2 -mx-2"
          >
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

function QuestionField({ question, value, onChange, allAnswers, setAnswer }) {
  const otherKey = `${question.key}_other`;
  const isOtherSelected = question.type === 'radio' && value.startsWith('Other');

  return (
    <div>
      <label style={{ color: PAPER }} className="text-sm block mb-2 text-center">
        {question.label}
        {question.required && <span style={{ color: SKY }}> *</span>}
      </label>

      {question.type === 'textarea' && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          style={{ background: INK_3, color: PAPER }}
          className="w-full rounded-md px-3 py-2.5 text-sm outline-none resize-none"
        />
      )}

      {question.type === 'text' && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ background: INK_3, color: PAPER }}
          className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center"
        />
      )}

      {question.type === 'tel' && (
        <input
          type="tel"
          inputMode="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="(555) 555-5555"
          style={{ background: INK_3, color: PAPER }}
          className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center"
        />
      )}

      {question.type === 'age' && (
        <AgePicker value={value} onChange={onChange} />
      )}

      {question.type === 'radio' && (
        <>
          <div className="space-y-2">
            {question.options.map((opt) => {
              const selected = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(opt)}
                  style={{ background: selected ? LIME : INK_3, color: selected ? INK : PAPER_DIM }}
                  className="w-full text-center rounded-md px-3 py-2.5 text-sm"
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {isOtherSelected && (
            <textarea
              value={allAnswers[otherKey] || ''}
              onChange={(e) => setAnswer(otherKey, e.target.value)}
              rows={2}
              placeholder="Please explain…"
              style={{ background: INK_3, color: PAPER }}
              className="w-full rounded-md px-3 py-2.5 text-sm outline-none resize-none mt-2"
            />
          )}
        </>
      )}
    </div>
  );
}

const AGE_MIN = 13;
const AGE_MAX = 99;
const ITEM_HEIGHT = 40;
const VISIBLE_ROWS = 3;
const AGES = Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => AGE_MIN + i);

function AgePicker({ value, onChange }) {
  const containerRef = useRef(null);
  const scrollTimeout = useRef(null);

  useEffect(() => {
    const idx = AGES.indexOf(Number(value));
    if (idx >= 0 && containerRef.current) {
      containerRef.current.scrollTop = idx * ITEM_HEIGHT;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScroll() {
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      if (!containerRef.current) return;
      const idx = Math.round(containerRef.current.scrollTop / ITEM_HEIGHT);
      const clamped = Math.min(Math.max(idx, 0), AGES.length - 1);
      onChange(String(AGES[clamped]));
    }, 80);
  }

  return (
    <div className="relative mx-auto" style={{ width: 120, height: ITEM_HEIGHT * VISIBLE_ROWS }}>
      <div
        style={{ height: ITEM_HEIGHT, background: INK_3, top: ITEM_HEIGHT * Math.floor(VISIBLE_ROWS / 2) }}
        className="absolute left-0 right-0 rounded-md pointer-events-none"
      />
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ height: ITEM_HEIGHT * VISIBLE_ROWS, scrollSnapType: 'y mandatory' }}
        className="overflow-y-scroll no-scrollbar relative"
      >
        <div style={{ height: ITEM_HEIGHT * Math.floor(VISIBLE_ROWS / 2) }} />
        {AGES.map((a) => (
          <div
            key={a}
            style={{ height: ITEM_HEIGHT, scrollSnapAlign: 'center', color: String(a) === value ? PAPER : TEXT_SOFT, fontFamily: 'Space Grotesk, sans-serif' }}
            className="flex items-center justify-center text-lg"
          >
            {a}
          </div>
        ))}
        <div style={{ height: ITEM_HEIGHT * Math.floor(VISIBLE_ROWS / 2) }} />
      </div>
    </div>
  );
}
