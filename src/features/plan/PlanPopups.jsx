import React, { useState } from 'react';
import { X, Timer } from '../../lib/icons';
import Portal from '../../Portal';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, BRICK } from '../../theme';
import { MUSCLE_GROUPS } from '../move/exerciseLibrary';
import { PLAN_SUGGESTIONS, PLAN_MINUTE_OPTIONS, DEFAULT_PLAN_MINUTES, hasDetails, planKinds, planMinutes, planSummary, friendlyPlanDate } from './plan';

function Sheet({ onClose, children }) {
  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" onClick={onClose}>
        <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" />
        <div
          style={{ background: INK_2, borderTop: `2px solid ${LIME}` }}
          className="relative w-full max-w-xs rounded-2xl px-5 py-5 max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </Portal>
  );
}

// Planning starts with a friendly yes/no, then big emoji tiles — most plans
// are one tap, so the keyboard only appears if someone wants something
// else (or a note). "Add workout details" hands off to Move's full flow.
export function PlanFormPopup({ dateStr, plan, onSave, onDetails, onClose }) {
  const editing = Boolean(plan);
  const [step, setStep] = useState(editing ? 'form' : 'ask'); // 'ask' | 'form'
  const [title, setTitle] = useState(plan?.title || '');
  const [typing, setTyping] = useState(editing); // the free-text title field is showing
  const [showNotes, setShowNotes] = useState(Boolean(plan?.notes));
  const [notes, setNotes] = useState(plan?.notes || '');
  const [saving, setSaving] = useState(false);
  // What kind of movement a quick plan is (drives its icon and which weekly
  // goal it counts toward); a plan with full details keeps its own.
  const [kind, setKind] = useState(plan && !hasDetails(plan) ? (plan.details?.kind || 'aerobic') : 'aerobic');
  const [minutes, setMinutes] = useState(Number(plan?.details?.minutes) || DEFAULT_PLAN_MINUTES);
  const [groups, setGroups] = useState(plan && !hasDetails(plan) ? (plan.details?.groups || []) : []);
  const canSave = title.trim().length > 0 && !saving;
  const isTile = PLAN_SUGGESTIONS.some((s) => s.label === title);
  const aerobic = editing && hasDetails(plan) ? planKinds(plan).has('aerobic') : kind === 'aerobic';
  const askMuscles = !(editing && hasDetails(plan)) && kind === 'resistance';

  async function save() {
    if (!canSave) return;
    setSaving(true);
    let details;
    if (editing && hasDetails(plan)) details = aerobic ? { ...plan.details, minutes } : plan.details;
    else details = aerobic ? { kind, minutes } : askMuscles ? { kind, groups } : { kind };
    await onSave({ title: title.trim(), notes: notes.trim(), details });
    setSaving(false);
  }

  if (step === 'ask') {
    return (
      <Sheet onClose={onClose}>
        <div className="text-center">
          <div className="text-4xl mb-2">📅</div>
          <div style={{ color: PAPER }} className="text-lg font-medium">Plan a workout?</div>
          <div style={{ color: TEXT_SOFT }} className="text-sm mb-5">{friendlyPlanDate(dateStr)}</div>
          <button onClick={() => setStep('form')} style={{ background: LIME, color: INK }} className="w-full rounded-xl py-3 text-sm font-medium mb-1.5">
            Yes, let's plan it
          </button>
          <button onClick={onClose} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2">Not now</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div style={{ color: PAPER }} className="text-lg font-medium">{editing ? 'Edit Plan' : "What's the plan?"}</div>
          <div style={{ color: TEXT_SOFT }} className="text-sm">{friendlyPlanDate(dateStr)}</div>
        </div>
        <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-1 -m-1" aria-label="Close"><X size={18} /></button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2">
        {PLAN_SUGGESTIONS.map((t) => {
          const selected = title === t.label;
          return (
            <button
              key={t.label}
              onClick={() => { setTitle(t.label); setKind(t.kind); setTyping(false); }}
              style={{ background: selected ? LIME : INK_3, color: selected ? INK : PAPER_DIM }}
              className="rounded-xl py-2.5 flex flex-col items-center gap-0.5"
            >
              <span className="text-2xl leading-none">{t.emoji}</span>
              <span className="text-xs font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>

      {typing || (editing && !isTile) ? (
        <input
          autoFocus={!editing}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What are you planning?"
          style={{ background: INK_3, color: PAPER }}
          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center mb-2"
        />
      ) : (
        <button onClick={() => { setTyping(true); setKind('aerobic'); setTitle(isTile ? '' : title); }} style={{ color: TEXT_SOFT }} className="w-full text-sm py-1.5 mb-1">
          Something else…
        </button>
      )}

      {aerobic && (
        <div className="mb-2">
          <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-1.5">How long?</div>
          <div className="flex justify-center gap-1.5">
            {PLAN_MINUTE_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => setMinutes(m)}
                style={{ background: minutes === m ? LIME : INK_3, color: minutes === m ? INK : PAPER_DIM }}
                className="flex-1 rounded-full py-1.5 text-sm font-medium"
              >
                {m}
              </button>
            ))}
          </div>
          <div style={{ color: TEXT_SOFT }} className="text-xs text-center mt-1">minutes</div>
        </div>
      )}

      {askMuscles && (
        <div className="mb-2">
          <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-1.5">Which muscles? (optional)</div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {MUSCLE_GROUPS.map((g) => {
              const on = groups.includes(g);
              return (
                <button
                  key={g}
                  onClick={() => setGroups(on ? groups.filter((x) => x !== g) : [...groups, g])}
                  style={{ background: on ? LIME : INK_3, color: on ? INK : PAPER_DIM }}
                  className="rounded-full px-3 py-1 text-sm"
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showNotes ? (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Add a note"
          style={{ background: INK_3, color: PAPER }}
          className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none mb-2 text-center"
        />
      ) : (
        <button onClick={() => setShowNotes(true)} style={{ color: TEXT_SOFT }} className="w-full text-sm py-1.5 mb-1">
          + Add a note
        </button>
      )}

      <button
        onClick={save}
        disabled={!canSave}
        style={{ background: canSave ? LIME : INK_3, color: canSave ? INK : TEXT_SOFT }}
        className="w-full rounded-xl py-3 text-sm font-medium mt-1 mb-1"
      >
        {saving ? 'Saving…' : canSave ? 'Save Plan' : 'Pick something to plan'}
      </button>
      <button onClick={onDetails} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2 underline">
        {!editing ? 'Plan the details instead' : hasDetails(plan) ? 'Edit workout details' : 'Add workout details'}
      </button>
    </Sheet>
  );
}

// What's planned for a day, with edit/delete — and Start when it's today.
export function PlannedWorkoutPopup({ dateStr, plans, isToday, isPast = false, onEdit, onDetails, onDelete, onStart, onPlanAnother, onClose }) {
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div style={{ color: PAPER }} className="text-base font-medium flex items-center gap-1.5">
            <Timer size={16} color={LIME} /> {plans.length > 1 ? 'Planned Workouts' : 'Planned Workout'}
          </div>
          <div style={{ color: TEXT_SOFT }} className="text-sm">{friendlyPlanDate(dateStr)}</div>
        </div>
        <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-1 -m-1" aria-label="Close"><X size={18} /></button>
      </div>
      <div className="space-y-2.5 mb-3">
        {plans.map((p) => {
          const summary = planSummary(p);
          return (
            <div key={p.id} style={{ background: INK_3 }} className="rounded-md px-3 py-3 text-center">
              <div style={{ color: PAPER }} className="text-sm font-medium">{p.title}</div>
              {summary && <div style={{ color: TEXT_SOFT }} className="text-sm">{summary}</div>}
              {p.notes && <div style={{ color: PAPER_DIM }} className="text-sm mt-1">{p.notes}</div>}
              {(isToday || isPast) && (
                <button onClick={() => onStart(p)} style={{ background: LIME, color: INK }} className="w-full rounded-md py-2 text-sm font-medium mt-2.5">
                  {isPast ? 'Log It' : 'Start Workout'}
                </button>
              )}
              <div className="flex items-center justify-center gap-4 mt-2">
                <button onClick={() => onEdit(p)} style={{ color: TEXT_SOFT }} className="text-sm underline">Edit</button>
                <button onClick={() => onDetails(p)} style={{ color: TEXT_SOFT }} className="text-sm underline">{hasDetails(p) ? 'Edit details' : 'Add details'}</button>
                <button onClick={() => onDelete(p)} style={{ color: BRICK }} className="text-sm underline">Delete</button>
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={onPlanAnother} style={{ color: TEXT_SOFT }} className="w-full text-sm py-1.5">+ Plan another</button>
    </Sheet>
  );
}

// "Log It" on a simple plan (no details): the plan already says what it was,
// so this only asks for the pieces it can't know, then logs the workout.
export function QuickLogSheet({ plan, saving, onConfirm, onClose }) {
  const aerobic = planKinds(plan).has('aerobic');
  const [minutes, setMinutes] = useState(planMinutes(plan) || DEFAULT_PLAN_MINUTES);
  const [intensity, setIntensity] = useState('Moderate');
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div style={{ color: PAPER }} className="text-base font-medium">{plan.title}</div>
          <div style={{ color: TEXT_SOFT }} className="text-sm">{friendlyPlanDate(plan.planned_for)}</div>
        </div>
        <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-1 -m-1" aria-label="Close"><X size={18} /></button>
      </div>
      {aerobic ? (
        <>
          <div style={{ color: PAPER_DIM }} className="text-sm text-center mb-2">How long did you go?</div>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {[...new Set([...PLAN_MINUTE_OPTIONS, minutes])].sort((a, b) => a - b).map((m) => (
              <button key={m} onClick={() => setMinutes(m)} style={{ background: minutes === m ? LIME : INK_3, color: minutes === m ? INK : PAPER }} className="rounded-full px-3.5 py-1.5 text-sm">{m} min</button>
            ))}
          </div>
          <div style={{ color: PAPER_DIM }} className="text-sm text-center mb-2">How hard did it feel?</div>
          <div className="flex gap-2 mb-4">
            {['Light', 'Moderate', 'Vigorous'].map((lvl) => (
              <button key={lvl} onClick={() => setIntensity(lvl)} style={{ background: intensity === lvl ? LIME : INK_3, color: intensity === lvl ? INK : PAPER }} className="flex-1 rounded-md py-2 text-sm">{lvl}</button>
            ))}
          </div>
        </>
      ) : (
        <div style={{ color: PAPER_DIM }} className="text-sm text-center mb-4">Mark this one as done?</div>
      )}
      <button onClick={() => onConfirm({ minutes, intensity })} disabled={saving} style={{ background: LIME, color: INK }} className="w-full rounded-md py-2.5 text-sm font-medium">
        {saving ? 'Saving…' : 'Log It'}
      </button>
    </Sheet>
  );
}
