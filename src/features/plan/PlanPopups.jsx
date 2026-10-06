import React, { useState } from 'react';
import { X, CalendarClock } from 'lucide-react';
import Portal from '../../Portal';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, BRICK, PLUM } from '../../theme';
import { PLAN_SUGGESTIONS, planSummary, friendlyPlanDate } from './plan';

function Sheet({ onClose, children }) {
  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" onClick={onClose}>
        <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" />
        <div
          style={{ background: INK_2, borderTop: `2px solid ${LIME}` }}
          className="relative w-full max-w-xs rounded-xl px-5 py-5 max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </Portal>
  );
}

// Create or edit a plan: a short title is all that's required; "add
// details" hands off to Move's full workout flow for that date.
export function PlanFormPopup({ dateStr, plan, onSave, onDetails, onClose }) {
  const [title, setTitle] = useState(plan?.title || '');
  const [notes, setNotes] = useState(plan?.notes || '');
  const [saving, setSaving] = useState(false);
  const editing = Boolean(plan);
  const canSave = title.trim().length > 0 && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    await onSave({ title: title.trim(), notes: notes.trim() });
    setSaving(false);
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div style={{ color: PAPER }} className="text-base font-medium">{editing ? 'Edit Plan' : 'Plan a Workout'}</div>
          <div style={{ color: TEXT_SOFT }} className="text-sm">{friendlyPlanDate(dateStr)}</div>
        </div>
        <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-1 -m-1" aria-label="Close"><X size={18} /></button>
      </div>
      <input
        autoFocus={!editing}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What are you planning?"
        style={{ background: INK_3, color: PAPER }}
        className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center mb-2"
      />
      {!editing && (
        <div className="flex flex-wrap justify-center gap-1.5 mb-3">
          {PLAN_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setTitle(s)}
              style={{ background: title === s ? LIME : INK_3, color: title === s ? INK : PAPER_DIM }}
              className="px-2.5 py-1 rounded-full text-sm"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Notes (optional)"
        style={{ background: INK_3, color: PAPER }}
        className="w-full rounded-md px-3 py-2 text-sm outline-none resize-none mb-3 text-center"
      />
      <button
        onClick={save}
        disabled={!canSave}
        style={{ background: canSave ? LIME : INK_3, color: canSave ? INK : TEXT_SOFT }}
        className="w-full rounded-md py-2.5 text-sm font-medium mb-1"
      >
        {saving ? 'Saving…' : 'Save Plan'}
      </button>
      {(!editing || plan?.details) && (
        <button onClick={onDetails} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2 underline">
          {editing ? 'Edit workout details' : 'Add workout details'}
        </button>
      )}
    </Sheet>
  );
}

// What's planned for a day, with edit/delete — and Start when it's today.
export function PlannedWorkoutPopup({ dateStr, plans, isToday, onEdit, onDelete, onStart, onPlanAnother, onClose }) {
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div style={{ color: PAPER }} className="text-base font-medium flex items-center gap-1.5">
            <CalendarClock size={16} color={PLUM} /> {plans.length > 1 ? 'Planned Workouts' : 'Planned Workout'}
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
              {isToday && (
                <button onClick={() => onStart(p)} style={{ background: LIME, color: INK }} className="w-full rounded-md py-2 text-sm font-medium mt-2.5">
                  Start Workout
                </button>
              )}
              <div className="flex items-center justify-center gap-5 mt-2">
                <button onClick={() => onEdit(p)} style={{ color: TEXT_SOFT }} className="text-sm underline">Edit</button>
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
