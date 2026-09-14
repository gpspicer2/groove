import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME } from '../../theme';

const PROMPTS = [
  'What felt good in your body today?',
  "What's one thing you're proud of this week?",
  'What got in the way of movement today, if anything?',
  'How would you describe your energy today, and why?',
  'What are you looking forward to in your next workout?',
  "What's a small win you don't want to forget?",
  'How did your body feel different than it did a month ago?',
];

function todaysPrompt() {
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return PROMPTS[dayIndex % PROMPTS.length];
}

function mapEntry(row) {
  return { id: row.id, prompt: row.prompt, response: row.response, createdAt: row.created_at };
}

export default function JournalTab() {
  const [entries, setEntries] = useState([]);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const prompt = todaysPrompt();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('journal_entries').select('*').order('created_at', { ascending: false });
      setEntries((data || []).map(mapEntry));
      setLoading(false);
    })();
  }, []);

  const alreadyLoggedToday = entries[0] && entries[0].prompt === prompt &&
    new Date(entries[0].createdAt).toDateString() === new Date().toDateString();

  async function handleSave() {
    if (!response.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({ prompt, response: response.trim() })
      .select()
      .single();
    setSaving(false);
    if (error) return;
    setEntries((prev) => [mapEntry(data), ...prev]);
    setResponse('');
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
      <h1 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-2xl font-medium mb-4">
        Journal
      </h1>

      {!alreadyLoggedToday && (
        <div style={{ background: INK_2, borderTop: `2px solid ${LIME}` }} className="rounded-lg px-5 py-5 mb-4">
          <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-2">Today's prompt</div>
          <div style={{ color: PAPER }} className="text-sm mb-3">{prompt}</div>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={4}
            placeholder="Write whatever comes to mind…"
            style={{ background: INK_3, color: PAPER }}
            className="w-full rounded-md px-3 py-2.5 text-sm outline-none resize-none mb-3"
          />
          <button
            onClick={handleSave}
            disabled={!response.trim() || saving}
            style={{ background: response.trim() ? LIME : INK_3, color: response.trim() ? INK : TEXT_SOFT }}
            className="w-full rounded-md py-3 text-sm font-medium"
          >
            {saving ? 'Saving…' : 'Save entry'}
          </button>
        </div>
      )}

      <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-2">Past entries</div>
      {entries.length === 0 ? (
        <div style={{ background: INK_2, color: TEXT_SOFT }} className="rounded-md px-4 py-6 text-center text-sm">
          Nothing logged yet — your first entry will show up here.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} style={{ background: INK_2 }} className="rounded-md px-4 py-3">
              <div style={{ color: TEXT_SOFT }} className="text-sm mb-1">
                {new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {e.prompt}
              </div>
              <div style={{ color: PAPER }} className="text-sm">{e.response}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
