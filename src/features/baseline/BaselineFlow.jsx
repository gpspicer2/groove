import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY, BRICK } from '../../theme';
import { BASELINE_SECTIONS, FITNESS_ASSESSMENT_QUESTIONS, ONE_RM_LIFTS } from './baselineQuestions';

// The form sections, then the physical self-assessment, as one flat list
// of "pages" so the same next/back controls drive the whole flow.
const PAGES = [...BASELINE_SECTIONS.map((s) => ({ type: 'section', section: s })), { type: 'assessment' }];

export default function BaselineFlow({ userId, onComplete }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [assessment, setAssessment] = useState({});
  const [oneRms, setOneRms] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const page = PAGES[pageIndex];
  const isLast = pageIndex === PAGES.length - 1;

  function setAnswer(key, value) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function setAssessmentAnswer(key, value) {
    setAssessment((prev) => ({ ...prev, [key]: value }));
  }

  function canAdvance() {
    if (page.type !== 'section') return true;
    return page.section.questions
      .filter((q) => q.required)
      .every((q) => (answers[q.key] || '').toString().trim().length > 0);
  }

  async function handleFinish() {
    setSaving(true);
    setError('');
    const fitness_assessment = assessment.can_estimate_1rm === 'Yes' ? { ...assessment, one_rep_maxes: oneRms } : assessment;
    const { error } = await supabase
      .from('baseline_responses')
      .upsert(
        { user_id: userId, form_answers: answers, fitness_assessment, submitted_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    setSaving(false);
    if (error) { setError(error.message); return; }
    onComplete();
  }

  function handleNext() {
    if (!canAdvance()) return;
    if (isLast) { handleFinish(); return; }
    setPageIndex((i) => i + 1);
  }

  return (
    <div style={{ background: INK, fontFamily: 'Inter, sans-serif' }} className="min-h-[100svh] flex flex-col">
      <div className="max-w-md mx-auto w-full px-4 pt-8 pb-4">
        <div style={{ color: LIME, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm tracking-widest uppercase mb-1">Groove</div>
        <h1 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-xl font-medium mb-1">
          {page.type === 'assessment' ? 'Where are you starting from?' : page.section.title}
        </h1>
        {page.type === 'section' && page.section.subtitle && (
          <p style={{ color: TEXT_SOFT }} className="text-sm mb-2">{page.section.subtitle}</p>
        )}
        <div style={{ background: INK_3 }} className="h-1.5 rounded-full overflow-hidden mt-3">
          <div style={{ width: `${((pageIndex + 1) / PAGES.length) * 100}%`, background: LIME }} className="h-full rounded-full transition-all" />
        </div>
      </div>

      <div className="flex-1 max-w-md mx-auto w-full px-4 pb-4 space-y-5">
        {page.type === 'section'
          ? page.section.questions.map((q) => (
              <QuestionField key={q.key} question={q} value={answers[q.key] || ''} onChange={(v) => setAnswer(q.key, v)} />
            ))
          : (
            <>
              {FITNESS_ASSESSMENT_QUESTIONS.map((q) => (
                <QuestionField key={q.key} question={q} value={assessment[q.key] || ''} onChange={(v) => setAssessmentAnswer(q.key, v)} />
              ))}
              {assessment.can_estimate_1rm === 'Yes' && (
                <div>
                  <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-2">Estimated 1-rep max (lb) — leave blank if unsure</div>
                  <div className="space-y-3">
                    {ONE_RM_LIFTS.map((lift) => (
                      <div key={lift}>
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
            </>
          )}
        {error && <div style={{ color: BRICK }} className="text-sm">{error}</div>}
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
  );
}

function QuestionField({ question, value, onChange }) {
  return (
    <div>
      <label style={{ color: PAPER }} className="text-sm block mb-2">
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
          className="w-full rounded-md px-3 py-2.5 text-sm outline-none"
        />
      )}
      {question.type === 'radio' && (
        <div className="space-y-2">
          {question.options.map((opt) => {
            const selected = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                style={{ background: selected ? LIME : INK_3, color: selected ? INK : PAPER_DIM }}
                className="w-full text-left rounded-md px-3 py-2.5 text-sm"
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
