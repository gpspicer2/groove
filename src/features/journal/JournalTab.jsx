import React, { useState, useEffect, useRef } from 'react';
import { useArmed } from '../../lib/useArmed';
import { useSwipeDown, GRAB_BAR_CLASS } from '../../lib/swipeDown';
import SwipeHint from '../../SwipeHint';
import { ChevronLeft, ChevronRight, X, Lock, Check, Pencil, Trash2 } from '../../lib/icons';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { workoutTitle, shortWorkoutTitle } from '../move/exerciseLibrary';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, AMBER, BRICK , ON_AMBER } from '../../theme';
import Portal from '../../Portal';

const PROMPTS = [
  'What felt good in your body today?',
  "What's one thing you're proud of this week?",
  'What got in the way of movement today, if anything?',
  'How would you describe your energy today, and why?',
  'What are you looking forward to in your next workout?',
  "What's a small win you don't want to forget?",
  'How did your body feel different than it did a month ago?',
];

const MOOD_LABELS = ['Rough', 'Low', 'Meh', 'OK', 'Good', 'Great', 'Excellent'];

function mapEntry(row) {
  return { id: row.id, prompt: row.prompt, response: row.response, structured: row.structured || null, createdAt: row.created_at };
}

export default function JournalTab({ active = true, request = null, onConsumeRequest }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [recentWorkout, setRecentWorkout] = useState(null); // { id, title } of the activity being reflected on
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(null); // null | 'checkin' | 'freeform'

  // The latest workout day's activity, so a Post-Movement Reflection always starts from
  // what you just did (re-read whenever the tab opens, since workouts finish elsewhere).
  async function loadRecent(preferredId) {
    if (!user) return;
    const { data: recent } = await supabase.from('workouts').select('id, started_at, muscle_groups, activities').eq('user_id', user.id).not('completed_at', 'is', null).is('deleted_at', null).order('started_at', { ascending: false }).limit(10);
    if (!recent?.length) { setRecentWorkout(null); return; }
    const anchor = recent.find((w) => w.id === preferredId) || recent[0];
    setRecentWorkout({ id: anchor.id, title: workoutTitle(anchor.muscle_groups || [], anchor.activities || []) });
  }

  useEffect(() => {
    (async () => {
      const { data: journalData } = await supabase.from('journal_entries').select('*').order('created_at', { ascending: false });
      setEntries((journalData || []).map(mapEntry));
      await loadRecent();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Coming back to the tab (or arriving from the post-workout prompt): refresh, and open the reflection.
  useEffect(() => { if (active && !loading) loadRecent(request?.workoutId); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [active]);
  useEffect(() => {
    if (!request || loading) return;
    loadRecent(request.workoutId).then(() => { setMode('checkin'); onConsumeRequest && onConsumeRequest(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, loading]);

  const [editingEntry, setEditingEntry] = useState(null);

  function addEntry(entry) {
    setEntries((prev) => [entry, ...prev]);
    setMode(null);
  }

  function updateEntry(updated) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setEditingEntry(null);
  }

  async function deleteEntry(id) {
    const { error } = await supabase.from('journal_entries').delete().eq('id', id);
    if (error) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <span style={{ color: TEXT_SOFT }} className="text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-12">
      <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-4">
        <div><Lock size={12} className="inline -mt-0.5 mr-1" />Only you can read your journal.</div>
        <div>Greg never sees it. Something he should know? <a href="sms:+16034754544" style={{ color: AMBER }} className="underline font-medium">Message Greg</a></div>
      </div>

      {mode === 'checkin' ? (
        <CheckinFlow recentWorkout={recentWorkout} onSaved={addEntry} onCancel={() => setMode(null)} />
      ) : mode === 'freeform' ? (
        <FreeformEntry onSaved={addEntry} onCancel={() => setMode(null)} />
      ) : (
        <div data-tour="journal-prompts" className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('checkin')}
            style={{ background: INK_2, borderTop: `2px solid ${AMBER}` }}
            className="flex-1 rounded-lg px-3 py-4 text-center"
          >
            <div style={{ color: PAPER }} className="text-sm font-medium">Post-Movement Reflection</div>
            <div style={{ color: TEXT_SOFT }} className="text-sm mt-0.5">A quick check-in after training.</div>
          </button>
          <button
            onClick={() => setMode('freeform')}
            style={{ background: INK_2, borderTop: `2px solid ${AMBER}` }}
            className="flex-1 rounded-lg px-3 py-4 text-center"
          >
            <div style={{ color: PAPER }} className="text-sm font-medium">Just Journal</div>
            <div style={{ color: TEXT_SOFT }} className="text-sm mt-0.5">Pick a prompt and write freely.</div>
          </button>
        </div>
      )}

      <div data-tour="journal-entries">
        <div style={{ color: TEXT_SOFT }} className="text-base uppercase tracking-wide mb-2 text-center">Past entries</div>
        {entries.length === 0 ? (
          <div style={{ background: INK_2, color: TEXT_SOFT }} className="rounded-md px-4 py-6 text-center text-sm">
            Nothing logged yet — your first entry will show up here.
          </div>
        ) : (
          <div className="space-y-2">
            <SwipeHint id="journal">Tip: tap an entry to edit or delete it.</SwipeHint>
            {entries.map((e) => (
              <JournalEntryRow key={e.id} entry={e} onEdit={() => setEditingEntry(e)} onDelete={() => deleteEntry(e.id)} />
            ))}
          </div>
        )}
      </div>

      {editingEntry && (
        <EditEntryModal entry={editingEntry} onClose={() => setEditingEntry(null)} onSaved={updateEntry} />
      )}
    </div>
  );
}

// A short recap of what was written, built right on the phone (journals never leave it). The row clamps it to two lines.
function entrySummary(entry) {
  const st = entry.structured;
  const clean = (t) => String(t || '').replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
  if (st) {
    const bits = [];
    if (st.mood) bits.push(`${MOOD_LABELS[st.mood - 1] || 'OK'} mood`);
    if (st.effort) bits.push(`effort ${st.effort}/10`);
    if (st.energy) bits.push(`${String(st.energy).toLowerCase()} energy`);
    const lead = bits.join(', ');
    const parts = [
      st.wentWell && `Good: ${clean(st.wentWell)}`,
      st.wasHard && `Hard: ${clean(st.wasHard)}`,
      st.nextTime && `Next: ${clean(st.nextTime)}`,
      st.favoriteMovement && `Loved: ${clean(st.favoriteMovement)}`,
      st.leastFavoriteMovement && `Least: ${clean(st.leastFavoriteMovement)}`,
      st.smile && `Smiled: ${clean(st.smile)}`,
      st.extra && clean(st.extra),
    ].filter(Boolean);
    return [lead, parts.join('. ')].filter(Boolean).join(' · ');
  }
  return clean(entry.response);
}

function JournalEntryRow({ entry, onEdit, onDelete }) {
  // Tap an entry for Edit / Delete. (It used to reveal buttons on a left swipe, but that is also the swipe
  // that moves on to Learn, so entries were getting opened for editing by accident.)
  const [showActions, setShowActions] = useState(false);
  const actionSheet = useSwipeDown(() => setShowActions(false));
  const arm = useArmed();
  const summary = entrySummary(entry);

  return (
    <div className="relative rounded-md overflow-hidden">
      <div
        onClick={() => setShowActions(true)}
        style={{ background: INK_2 }}
        className="flex items-center justify-between gap-2 px-4 py-3"
      >
        <div className="flex-1 min-w-0 text-center">
          <div style={{ color: PAPER }} className="text-sm">
            {new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {entry.structured?.workoutTitle ? `After ${shortWorkoutTitle(entry.structured.workoutTitle)}` : entry.prompt}
          </div>
          {summary && <div style={{ color: TEXT_SOFT }} className="text-[13px] leading-snug line-clamp-2 mt-0.5">{summary}</div>}
        </div>
      </div>

      {showActions && (
        <Portal>
          <div style={{ background: 'rgba(0,0,0,0.6)' }} className="fixed inset-0 flex items-end md:items-center justify-center z-50" onClick={() => setShowActions(false)}>
            <div ref={actionSheet.ref} {...actionSheet.handlers} style={{ background: INK_2, ...actionSheet.style }} className="w-full max-w-sm rounded-t-2xl md:rounded-2xl px-5 py-6" onClick={(e) => e.stopPropagation()}>
              <div style={{ background: TEXT_SOFT, opacity: 0.45 }} className={GRAB_BAR_CLASS} />
              <div style={{ color: PAPER }} className="text-sm text-center mb-5">
                {new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {entry.prompt}
                {entry.structured?.workoutTitle && <div style={{ color: TEXT_SOFT }} className="mt-0.5">After {entry.structured.workoutTitle}</div>}
              </div>
              <button
                onClick={() => { setShowActions(false); onEdit(); }}
                style={{ background: AMBER, color: ON_AMBER }}
                className="w-full flex items-center justify-center gap-2 rounded-md py-3 text-sm font-medium mb-2"
              >
                <Pencil size={16} /> Edit entry
              </button>
              <button
                onClick={() => arm.press('sheet', () => { setShowActions(false); onDelete(); })}
                data-armed={arm.armed === 'sheet'}
                style={{ background: BRICK, color: PAPER, outline: arm.armed === 'sheet' ? `2px solid ${PAPER}` : 'none', outlineOffset: -4 }}
                className="w-full flex items-center justify-center gap-2 rounded-md py-3 text-sm font-medium mb-2"
              >
                <Trash2 size={16} /> {arm.armed === 'sheet' ? 'Tap again to delete' : 'Delete entry'}
              </button>
              <button onClick={() => setShowActions(false)} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2 text-center">
                Cancel
              </button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

function EditEntryModal({ entry, onClose, onSaved }) {
  const isStructured = Boolean(entry.structured);
  const [response, setResponse] = useState(entry.response);
  const [mood, setMood] = useState(entry.structured?.mood || 4);
  const isV2 = Boolean(entry.structured && ('nextTime' in entry.structured || 'wentWell' in entry.structured));
  const [energy, setEnergy] = useState(entry.structured?.energy || '');
  const [effort, setEffort] = useState(entry.structured?.effort || null);
  const [wentWell, setWentWell] = useState(entry.structured?.wentWell || '');
  const [wasHard, setWasHard] = useState(entry.structured?.wasHard || '');
  const [nextTime, setNextTime] = useState(entry.structured?.nextTime || '');
  const [favoriteMovement, setFavoriteMovement] = useState(entry.structured?.favoriteMovement || '');
  const [leastFavoriteMovement, setLeastFavoriteMovement] = useState(entry.structured?.leastFavoriteMovement || '');
  const [smile, setSmile] = useState(entry.structured?.smile || '');
  const [extra, setExtra] = useState(entry.structured?.extra || '');
  const [saving, setSaving] = useState(false);
  const sheet = useSwipeDown(onClose);

  async function handleSave() {
    setSaving(true);
    const updates = { is_private: true };
    if (isStructured) {
      updates.structured = isV2 ? { ...(entry.structured || {}), mood, energy, ...(effort ? { effort } : {}), wentWell, wasHard, nextTime } : { ...(entry.structured || {}), mood, favoriteMovement, leastFavoriteMovement, smile, extra };
      updates.response = `${MOOD_LABELS[mood - 1]} mood${isV2 && effort ? `, effort ${effort}/10` : ''}`;
    } else {
      updates.response = response.trim();
    }
    const { data, error } = await supabase.from('journal_entries').update(updates).eq('id', entry.id).select().single();
    setSaving(false);
    if (error) return;
    onSaved(mapEntry(data));
  }

  return (
    <Portal>
      <div style={{ background: 'rgba(0,0,0,0.6)' }} className="fixed inset-0 flex items-end md:items-center justify-center z-50" onClick={onClose}>
        <div ref={sheet.ref} {...sheet.handlers} style={{ background: INK_2, ...sheet.style }} className="w-full max-w-sm rounded-t-2xl md:rounded-2xl px-5 py-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div style={{ background: TEXT_SOFT, opacity: 0.45 }} className={GRAB_BAR_CLASS} />
          <div className="flex items-center justify-between mb-5">
            <h2 style={{ color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="text-lg">Edit entry</h2>
            <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-2 -m-2"><X size={20} /></button>
          </div>

          {isStructured ? (
            <div className="space-y-4">
              <div>
                <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-2">Mood</div>
                <div style={{ color: AMBER, fontFamily: 'Outfit, sans-serif' }} className="text-xl font-medium text-center mb-2">
                  {MOOD_LABELS[mood - 1]}
                </div>
                <input type="range" min={1} max={7} value={mood} onChange={(e) => setMood(Number(e.target.value))} className="w-full" style={{ accentColor: AMBER }} />
              </div>
              {isV2 ? (
                <>
                  <div>
                    <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-2">How hard was it?</div>
                    <EffortRow value={effort} onChange={setEffort} />
                  </div>
                  {entry.structured?.energy ? <LabeledInput label="Energy" value={energy} onChange={setEnergy} /> : null}
                  <LabeledTextarea label="What felt good" value={wentWell} onChange={setWentWell} />
                  <LabeledTextarea label="What was hard" value={wasHard} onChange={setWasHard} />
                  <LabeledTextarea label="One thing for next time" value={nextTime} onChange={setNextTime} />
                </>
              ) : (
                <>
                  <LabeledInput label="Favorite movement" value={favoriteMovement} onChange={setFavoriteMovement} />
                  <LabeledInput label="Least favorite movement" value={leastFavoriteMovement} onChange={setLeastFavoriteMovement} />
                  <LabeledTextarea label="What made you smile" value={smile} onChange={setSmile} />
                  <LabeledTextarea label="Anything else" value={extra} onChange={setExtra} />
                </>
              )}
            </div>
          ) : (
            <div>
              <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-2">{entry.prompt}</div>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={5}
                style={{ background: INK_3, color: PAPER }}
                className="w-full rounded-md px-3 py-2.5 text-sm outline-none resize-none"
              />
            </div>
          )}

          <div className="mt-4">
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{ background: AMBER, color: ON_AMBER }}
            className="w-full rounded-md py-3 text-sm font-medium mt-2"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </Portal>
  );
}

function LabeledInput({ label, value, onChange }) {
  return (
    <div>
      <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-1">{label}</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ background: INK_3, color: PAPER }}
        className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center"
      />
    </div>
  );
}

function LabeledTextarea({ label, value, onChange }) {
  return (
    <div>
      <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-1">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        style={{ background: INK_3, color: PAPER }}
        className="w-full rounded-md px-3 py-2.5 text-sm outline-none resize-none"
      />
    </div>
  );
}

function FreeformEntry({ onSaved, onCancel }) {
  const [prompt, setPrompt] = useState(null);
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!response.trim() || !prompt) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({ prompt, response: response.trim(), is_private: true })
      .select()
      .single();
    setSaving(false);
    if (error) return;
    onSaved(mapEntry(data));
  }

  return (
    <div style={{ background: INK_2, borderTop: `2px solid ${AMBER}` }} className="rounded-lg px-5 py-5 mb-4">
      {!prompt ? (
        <>
          <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-3 text-center">Pick a prompt</div>
          <div className="space-y-2 mb-3">
            {PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => setPrompt(p)}
                style={{ background: INK_3, color: PAPER }}
                className="w-full text-center rounded-md px-4 py-2.5 text-sm"
              >
                {p}
              </button>
            ))}
          </div>
          <button onClick={onCancel} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2 text-center">
            Cancel
          </button>
        </>
      ) : (
        <>
          <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-2 text-center">Prompt</div>
          <div style={{ color: PAPER }} className="text-sm mb-3 text-center">{prompt}</div>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={4}
            placeholder="Write whatever comes to mind…"
            style={{ background: INK_3, color: PAPER }}
            className="w-full rounded-md px-3 py-2.5 text-sm outline-none resize-none mb-3"
          />
          <div className="flex items-center gap-2">
            <button onClick={() => setPrompt(null)} style={{ color: TEXT_SOFT }} className="text-sm py-3 px-2">
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={!response.trim() || saving}
              style={{ background: response.trim() ? AMBER : INK_3, color: response.trim() ? ON_AMBER : TEXT_SOFT }}
              className="flex-1 rounded-md py-3 text-sm font-medium"
            >
              {saving ? 'Saving…' : 'Save entry'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// "How hard was it?" 1 to 10 (the same scale as the effort question after a workout).
function EffortRow({ value, onChange }) {
  return (
    <div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onChange(value === n ? null : n)}
            style={{ background: value === n ? AMBER : INK_3, color: value === n ? ON_AMBER : PAPER_DIM }}
            className="rounded-md py-2.5 text-sm tabular-nums"
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span style={{ color: TEXT_SOFT }} className="text-[13px]">Easy</span>
        <span style={{ color: TEXT_SOFT }} className="text-[13px]">All out</span>
      </div>
    </div>
  );
}

const STEPS = ['feel', 'stood', 'next'];

// Three quick screens: how you feel, what stood out, and one thing to carry forward.
// The workout you just did is attached automatically.
function CheckinFlow({ recentWorkout, onSaved, onCancel }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [mood, setMood] = useState(4);
  const [effort, setEffort] = useState(null);
  const [wentWell, setWentWell] = useState('');
  const [wasHard, setWasHard] = useState('');
  const [nextTime, setNextTime] = useState('');
  const [saving, setSaving] = useState(false);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  async function handleFinish() {
    setSaving(true);
    const structured = {
      mood, ...(effort ? { effort } : {}), wentWell: wentWell.trim(), wasHard: wasHard.trim(), nextTime: nextTime.trim(),
      ...(recentWorkout ? { workoutId: recentWorkout.id, workoutTitle: recentWorkout.title } : {}),
    };
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({ prompt: 'Post-movement reflection', response: `${MOOD_LABELS[mood - 1]} mood${effort ? `, effort ${effort}/10` : ''}`, structured, is_private: true })
      .select()
      .single();
    setSaving(false);
    if (error) return;
    onSaved(mapEntry(data));
  }

  function handleNext() {
    if (isLast) { handleFinish(); return; }
    setStepIndex((i) => i + 1);
  }

  const box = { background: INK_3, color: PAPER };

  return (
    <div style={{ background: INK_2, borderTop: `2px solid ${AMBER}` }} className="rounded-lg px-5 py-6 mb-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onCancel} style={{ color: TEXT_SOFT }} className="p-2 -m-2">
          <X size={18} />
        </button>
        <span style={{ color: TEXT_SOFT }} className="text-sm">{stepIndex + 1} / {STEPS.length}</span>
      </div>
      {recentWorkout?.title && (
        <div style={{ color: AMBER }} className="text-sm font-medium text-center mb-3">After {recentWorkout.title}</div>
      )}

      {step === 'feel' && (
        <div>
          <div style={{ color: PAPER }} className="text-lg font-medium mb-2 text-center">How's your mood?</div>
          <div style={{ color: AMBER, fontFamily: 'Outfit, sans-serif' }} className="text-2xl font-medium mb-2 text-center">{MOOD_LABELS[mood - 1]}</div>
          <input type="range" min={1} max={7} value={mood} onChange={(e) => setMood(Number(e.target.value))} className="w-full" style={{ accentColor: AMBER }} />
          <div className="flex justify-between mt-1 mb-5">
            <span style={{ color: TEXT_SOFT }} className="text-sm">{MOOD_LABELS[0]}</span>
            <span style={{ color: TEXT_SOFT }} className="text-sm">{MOOD_LABELS[6]}</span>
          </div>
          <div style={{ color: PAPER }} className="text-lg font-medium mb-2 text-center">How hard was it?</div>
          <EffortRow value={effort} onChange={setEffort} />
        </div>
      )}

      {step === 'stood' && (
        <div>
          <div style={{ color: PAPER }} className="text-lg font-medium mb-3 text-center">What stood out?</div>
          <div style={{ color: PAPER_DIM }} className="text-sm text-center mb-1">What felt good</div>
          <textarea value={wentWell} onChange={(e) => setWentWell(e.target.value)} rows={2} placeholder="A lift, a feeling, a win…" style={box} className="w-full rounded-md px-3 py-2.5 text-sm outline-none resize-none text-center mb-3" />
          <div style={{ color: PAPER_DIM }} className="text-sm text-center mb-1">What was hard</div>
          <textarea value={wasHard} onChange={(e) => setWasHard(e.target.value)} rows={2} placeholder="Optional" style={box} className="w-full rounded-md px-3 py-2.5 text-sm outline-none resize-none text-center" />
        </div>
      )}

      {step === 'next' && (
        <div>
          <div style={{ color: PAPER }} className="text-lg font-medium mb-1 text-center">One thing for next time?</div>
          <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-3">A reminder to your future self.</div>
          <textarea value={nextTime} onChange={(e) => setNextTime(e.target.value)} rows={3} placeholder="Optional. Leave blank to skip" style={box} className="w-full rounded-md px-3 py-2.5 text-sm outline-none resize-none text-center" />
        </div>
      )}

      <div className="flex items-center gap-3 mt-5">
        {stepIndex > 0 && (
          <button onClick={() => setStepIndex((i) => i - 1)} style={{ color: TEXT_SOFT }} className="flex items-center gap-1 text-sm py-3 px-2 -mx-2">
            <ChevronLeft size={16} /> Back
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={saving}
          style={{ background: AMBER, color: ON_AMBER }}
          className="flex-1 rounded-md py-3 text-sm font-medium flex items-center justify-center gap-1.5"
        >
          {isLast ? (saving ? 'Saving…' : <><Check size={16} /> Save</>) : <>Next <ChevronRight size={16} /></>}
        </button>
      </div>
    </div>
  );
}
