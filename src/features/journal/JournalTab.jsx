import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Lock, Check } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY } from '../../theme';

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
  return { id: row.id, prompt: row.prompt, response: row.response, structured: row.structured || null, isPrivate: Boolean(row.is_private), createdAt: row.created_at };
}

function PrivacyToggle({ isPrivate, onToggle }) {
  return (
    <button onClick={onToggle} style={{ color: isPrivate ? LIME : TEXT_SOFT }} className="flex items-center justify-center gap-1.5 text-sm mx-auto mb-3">
      <Check size={12} style={{ opacity: isPrivate ? 1 : 0.25 }} />
      <Lock size={12} />
      Keep this entry private (just for you)
    </button>
  );
}

export default function JournalTab() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [recentExerciseNames, setRecentExerciseNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(null); // null | 'checkin' | 'freeform'

  useEffect(() => {
    (async () => {
      const [{ data: journalData }, { data: recentWorkout }] = await Promise.all([
        supabase.from('journal_entries').select('*').order('created_at', { ascending: false }),
        user
          ? supabase.from('workouts').select('id').eq('user_id', user.id).not('completed_at', 'is', null).order('started_at', { ascending: false }).limit(1).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setEntries((journalData || []).map(mapEntry));
      if (recentWorkout) {
        const { data: recentSets } = await supabase.from('workout_sets').select('exercise_name').eq('workout_id', recentWorkout.id);
        setRecentExerciseNames([...new Set((recentSets || []).map((s) => s.exercise_name))]);
      }
      setLoading(false);
    })();
  }, [user]);

  function addEntry(entry) {
    setEntries((prev) => [entry, ...prev]);
    setMode(null);
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
      <h1 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-2xl font-medium mb-4 text-center">
        Journal
      </h1>

      {mode === 'checkin' ? (
        <CheckinFlow recentExerciseNames={recentExerciseNames} onSaved={addEntry} onCancel={() => setMode(null)} />
      ) : mode === 'freeform' ? (
        <FreeformEntry onSaved={addEntry} onCancel={() => setMode(null)} />
      ) : (
        <div className="space-y-2 mb-4">
          <button
            onClick={() => setMode('checkin')}
            style={{ background: INK_2, borderTop: `2px solid ${LIME}` }}
            className="w-full rounded-lg px-5 py-4 text-center"
          >
            <div style={{ color: PAPER }} className="text-sm font-medium">Daily check-in</div>
            <div style={{ color: TEXT_SOFT }} className="text-sm mt-0.5">A few quick questions — mood, favorite movement, and more.</div>
          </button>
          <button
            onClick={() => setMode('freeform')}
            style={{ background: INK_2, borderTop: `2px solid ${SKY}` }}
            className="w-full rounded-lg px-5 py-4 text-center"
          >
            <div style={{ color: PAPER }} className="text-sm font-medium">Choose a prompt</div>
            <div style={{ color: TEXT_SOFT }} className="text-sm mt-0.5">Pick from a list and write freely.</div>
          </button>
        </div>
      )}

      <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-2 text-center">Past entries</div>
      {entries.length === 0 ? (
        <div style={{ background: INK_2, color: TEXT_SOFT }} className="rounded-md px-4 py-6 text-center text-sm">
          Nothing logged yet — your first entry will show up here.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} style={{ background: INK_2 }} className="rounded-md px-4 py-3">
              <div style={{ color: TEXT_SOFT }} className="text-sm mb-1 text-center flex items-center justify-center gap-1">
                {new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {e.prompt}
                {e.isPrivate && <Lock size={11} />}
              </div>
              {e.structured ? (
                <div className="space-y-1.5">
                  <div style={{ color: PAPER }} className="text-sm text-center">
                    Mood: {MOOD_LABELS[e.structured.mood - 1] || e.structured.mood} ({e.structured.mood}/7)
                  </div>
                  {e.structured.favoriteMovement && (
                    <div style={{ color: PAPER }} className="text-sm text-center">Favorite: {e.structured.favoriteMovement}</div>
                  )}
                  {e.structured.leastFavoriteMovement && (
                    <div style={{ color: PAPER }} className="text-sm text-center">Least favorite: {e.structured.leastFavoriteMovement}</div>
                  )}
                  {e.structured.smile && (
                    <div style={{ color: PAPER }} className="text-sm text-center">Made you smile: {e.structured.smile}</div>
                  )}
                  {e.structured.extra && (
                    <div style={{ color: PAPER_DIM }} className="text-sm text-center">{e.structured.extra}</div>
                  )}
                </div>
              ) : (
                <div style={{ color: PAPER }} className="text-sm text-center">{e.response}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FreeformEntry({ onSaved, onCancel }) {
  const [prompt, setPrompt] = useState(null);
  const [response, setResponse] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!response.trim() || !prompt) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({ prompt, response: response.trim(), is_private: isPrivate })
      .select()
      .single();
    setSaving(false);
    if (error) return;
    onSaved(mapEntry(data));
  }

  return (
    <div style={{ background: INK_2, borderTop: `2px solid ${SKY}` }} className="rounded-lg px-5 py-5 mb-4">
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
          <PrivacyToggle isPrivate={isPrivate} onToggle={() => setIsPrivate((v) => !v)} />
          <div className="flex items-center gap-2">
            <button onClick={() => setPrompt(null)} style={{ color: TEXT_SOFT }} className="text-sm py-3 px-2">
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={!response.trim() || saving}
              style={{ background: response.trim() ? LIME : INK_3, color: response.trim() ? INK : TEXT_SOFT }}
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

const STEPS = ['mood', 'favorite', 'least_favorite', 'smile', 'extra'];

function CheckinFlow({ recentExerciseNames, onSaved, onCancel }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [mood, setMood] = useState(4);
  const [favoriteMovement, setFavoriteMovement] = useState('');
  const [leastFavoriteMovement, setLeastFavoriteMovement] = useState('');
  const [smile, setSmile] = useState('');
  const [extra, setExtra] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const hasRecent = recentExerciseNames.length > 0;

  async function handleFinish() {
    setSaving(true);
    const structured = { mood, favoriteMovement: favoriteMovement.trim(), leastFavoriteMovement: leastFavoriteMovement.trim(), smile: smile.trim(), extra: extra.trim() };
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({ prompt: 'Daily check-in', response: `Mood ${mood}/7`, structured, is_private: isPrivate })
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

  return (
    <div style={{ background: INK_2, borderTop: `2px solid ${LIME}` }} className="rounded-lg px-5 py-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onCancel} style={{ color: TEXT_SOFT }} className="p-2 -m-2">
          <X size={18} />
        </button>
        <span style={{ color: TEXT_SOFT }} className="text-sm">{stepIndex + 1} / {STEPS.length}</span>
      </div>

      {step === 'mood' && (
        <div>
          <div style={{ color: PAPER }} className="text-lg font-medium mb-4 text-center">How did you feel today?</div>
          <div style={{ color: LIME, fontFamily: 'Space Grotesk, sans-serif' }} className="text-2xl font-medium mb-3 text-center">
            {MOOD_LABELS[mood - 1]}
          </div>
          <input
            type="range"
            min={1}
            max={7}
            value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: LIME }}
          />
          <div className="flex justify-between mt-1">
            <span style={{ color: TEXT_SOFT }} className="text-sm">{MOOD_LABELS[0]}</span>
            <span style={{ color: TEXT_SOFT }} className="text-sm">{MOOD_LABELS[6]}</span>
          </div>
        </div>
      )}

      {step === 'favorite' && (
        <div>
          <div style={{ color: PAPER }} className="text-lg font-medium mb-4 text-center">
            Which movement was your favorite today?
          </div>
          {hasRecent ? (
            <div className="space-y-2">
              {recentExerciseNames.map((name) => (
                <button
                  key={name}
                  onClick={() => setFavoriteMovement(name)}
                  style={{ background: favoriteMovement === name ? LIME : INK_3, color: favoriteMovement === name ? INK : PAPER_DIM }}
                  className="w-full text-center rounded-md px-4 py-2.5 text-sm"
                >
                  {name}
                </button>
              ))}
              <input
                type="text"
                value={recentExerciseNames.includes(favoriteMovement) ? '' : favoriteMovement}
                onChange={(e) => setFavoriteMovement(e.target.value)}
                placeholder="Or type something else…"
                style={{ background: INK_3, color: PAPER }}
                className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center mt-2"
              />
            </div>
          ) : (
            <input
              type="text"
              value={favoriteMovement}
              onChange={(e) => setFavoriteMovement(e.target.value)}
              placeholder="e.g. Barbell Squat"
              style={{ background: INK_3, color: PAPER }}
              className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center"
            />
          )}
        </div>
      )}

      {step === 'least_favorite' && (
        <div>
          <div style={{ color: PAPER }} className="text-lg font-medium mb-4 text-center">
            What was your least favorite movement today?
          </div>
          {hasRecent ? (
            <div className="space-y-2">
              {recentExerciseNames.map((name) => (
                <button
                  key={name}
                  onClick={() => setLeastFavoriteMovement(name)}
                  style={{ background: leastFavoriteMovement === name ? LIME : INK_3, color: leastFavoriteMovement === name ? INK : PAPER_DIM }}
                  className="w-full text-center rounded-md px-4 py-2.5 text-sm"
                >
                  {name}
                </button>
              ))}
              <input
                type="text"
                value={recentExerciseNames.includes(leastFavoriteMovement) ? '' : leastFavoriteMovement}
                onChange={(e) => setLeastFavoriteMovement(e.target.value)}
                placeholder="Or type something else…"
                style={{ background: INK_3, color: PAPER }}
                className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center mt-2"
              />
            </div>
          ) : (
            <input
              type="text"
              value={leastFavoriteMovement}
              onChange={(e) => setLeastFavoriteMovement(e.target.value)}
              placeholder="e.g. Burpees"
              style={{ background: INK_3, color: PAPER }}
              className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center"
            />
          )}
        </div>
      )}

      {step === 'smile' && (
        <div>
          <div style={{ color: PAPER }} className="text-lg font-medium mb-4 text-center">
            What's one thing that made you smile today?
          </div>
          <textarea
            value={smile}
            onChange={(e) => setSmile(e.target.value)}
            rows={3}
            placeholder="Anything, big or small…"
            style={{ background: INK_3, color: PAPER }}
            className="w-full rounded-md px-3 py-2.5 text-sm outline-none resize-none text-center"
          />
        </div>
      )}

      {step === 'extra' && (
        <div>
          <div style={{ color: PAPER }} className="text-lg font-medium mb-4 text-center">
            Anything else on your mind?
          </div>
          <textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            rows={3}
            placeholder="Optional — leave blank to skip"
            style={{ background: INK_3, color: PAPER }}
            className="w-full rounded-md px-3 py-2.5 text-sm outline-none resize-none text-center"
          />
          <div className="mt-3">
            <PrivacyToggle isPrivate={isPrivate} onToggle={() => setIsPrivate((v) => !v)} />
          </div>
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
          style={{ background: LIME, color: INK }}
          className="flex-1 rounded-md py-3 text-sm font-medium flex items-center justify-center gap-1.5"
        >
          {saving ? 'Saving…' : isLast ? 'Finish' : 'Next'}
          {!isLast && !saving && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  );
}
