import React, { useState, useEffect } from 'react';
import { ChevronLeft, Minus, Plus, Trash2 } from '../../lib/icons';
import { supabase } from '../../lib/supabaseClient';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, PLUM, BRICK, AMBER, MOSS } from '../../theme';
import { Avatar, Stat, SectionTitle, WeekBars } from './CoachParts';
import { goalsFor, timeAgo } from './stats';
import { workoutTitle } from '../move/exerciseLibrary';
import { RESULT_COPY, needsClearance } from '../screening/screening';
import { ClientScreening, ClientHeartRate, ClientBaseline, ProgramBuilder, ClientWorkouts } from './clientTools';

const TABS = [['overview', 'Overview'], ['plan', 'Plan'], ['health', 'Health'], ['workouts', 'Workouts'], ['notes', 'Notes']];

function Stepper({ label, value, unit, step, min, max, onChange }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span style={{ color: PAPER }} className="text-sm">{label}</span>
      <span className="flex items-center gap-3">
        <button onClick={() => onChange(Math.max(min, value - step))} style={{ background: INK_3, color: PAPER_DIM }} className="w-8 h-8 rounded-full inline-flex items-center justify-center" aria-label={`Less ${label}`}><Minus size={14} /></button>
        <span style={{ color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }} className="text-base font-semibold w-16 text-center">{value}{unit}</span>
        <button onClick={() => onChange(Math.min(max, value + step))} style={{ background: INK_3, color: PAPER_DIM }} className="w-8 h-8 rounded-full inline-flex items-center justify-center" aria-label={`More ${label}`}><Plus size={14} /></button>
      </span>
    </div>
  );
}

// The weekly targets Greg sets for this member. They show up on the
// member's Birdseye as their goals.
function GoalPrescription({ client, onSaved }) {
  const g = goalsFor(client);
  const [vals, setVals] = useState({ aerobic: g.aerobic, resistance: g.resistance, flexibility: g.flexibility });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = vals.aerobic !== g.aerobic || vals.resistance !== g.resistance || vals.flexibility !== g.flexibility;

  async function save() {
    setSaving(true);
    const fields = { aerobic_goal_minutes: vals.aerobic, resistance_goal: vals.resistance, flexibility_goal: vals.flexibility };
    const { error } = await supabase.from('profiles').update(fields).eq('id', client.id);
    setSaving(false);
    if (!error) { setSaved(true); onSaved(fields); setTimeout(() => setSaved(false), 1800); }
  }

  return (
    <div style={{ background: INK_2 }} className="rounded-2xl px-4 py-3">
      <div style={{ color: PAPER }} className="text-base font-semibold mb-1">Weekly targets</div>
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-1">These become their goals on Birdseye.</div>
      <Stepper label="Aerobic" value={vals.aerobic} unit=" min" step={15} min={30} max={600} onChange={(v) => setVals({ ...vals, aerobic: v })} />
      <Stepper label="Resistance" value={vals.resistance} unit=" days" step={1} min={1} max={7} onChange={(v) => setVals({ ...vals, resistance: v })} />
      <Stepper label="Flexibility" value={vals.flexibility} unit=" days" step={1} min={1} max={7} onChange={(v) => setVals({ ...vals, flexibility: v })} />
      <button
        onClick={save}
        disabled={!dirty || saving}
        style={{ background: dirty ? PLUM : INK_3, color: dirty ? INK : TEXT_SOFT }}
        className="w-full rounded-xl py-2.5 text-sm font-medium mt-2"
      >
        {saving ? 'Saving…' : saved ? 'Saved' : 'Save targets'}
      </button>
    </div>
  );
}

function CoachNotes({ clientId }) {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState('');
  const [state, setState] = useState('loading'); // loading | ready | missing
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('coach_notes').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
      if (error) { setState('missing'); return; }
      setNotes(data || []); setState('ready');
    })();
  }, [clientId]);

  async function add() {
    if (!text.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('coach_notes').insert({ client_id: clientId, body: text.trim() }).select().single();
    setSaving(false);
    if (!error && data) { setNotes((n) => [data, ...n]); setText(''); }
  }
  async function remove(id) {
    if (!window.confirm('Delete this note?')) return;
    const { error } = await supabase.from('coach_notes').delete().eq('id', id);
    if (!error) setNotes((n) => n.filter((x) => x.id !== id));
  }

  if (state === 'loading') return <div style={{ color: TEXT_SOFT }} className="text-sm text-center py-6">Loading…</div>;
  if (state === 'missing') {
    return <div style={{ background: INK_2, color: TEXT_SOFT }} className="rounded-2xl px-4 py-5 text-sm text-center">Notes need one quick setup step in Supabase. Ask Claude for the SQL.</div>;
  }
  return (
    <div>
      <div style={{ background: INK_2 }} className="rounded-2xl px-4 py-3">
        <div style={{ color: TEXT_SOFT }} className="text-sm mb-2">Private to you. Injuries, preferences, what you are working on together.</div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Add a note" style={{ background: INK_3, color: PAPER }} className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none" />
        <button onClick={add} disabled={!text.trim() || saving} style={{ background: text.trim() ? PLUM : INK_3, color: text.trim() ? INK : TEXT_SOFT }} className="w-full rounded-xl py-2.5 text-sm font-medium mt-2">
          {saving ? 'Saving…' : 'Add note'}
        </button>
      </div>
      <div className="space-y-2 mt-3">
        {notes.map((n) => (
          <div key={n.id} style={{ background: INK_2 }} className="rounded-2xl px-4 py-3">
            <div style={{ color: PAPER }} className="text-sm whitespace-pre-wrap">{n.body}</div>
            <div className="flex items-center justify-between mt-1.5">
              <span style={{ color: TEXT_SOFT }} className="text-sm">{new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <button onClick={() => remove(n.id)} style={{ color: BRICK }} className="p-1" aria-label="Delete note"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ClientScreen({ client, stat, workouts, trainerId, onBack, onClientChanged }) {
  const [tab, setTab] = useState('overview');
  const name = client.full_name || client.email;
  const mine = workouts.filter((w) => w.user_id === client.id).slice(0, 3);
  const s = client.screening;
  const flags = [];
  if (stat.feltOff) flags.push([BRICK, `Felt off after a workout${stat.feltOff.note ? `: ${stat.feltOff.note}` : ''}`]);
  if (s && needsClearance(s)) flags.push([s.result === 'stop_and_clearance' ? BRICK : AMBER, RESULT_COPY[s.result].banner]);
  if (!s) flags.push([TEXT_SOFT, 'Health check not done yet.']);
  const since = client.created_at ? new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null;

  return (
    <div>
      <button onClick={onBack} style={{ color: TEXT_SOFT }} className="flex items-center gap-1 text-sm mb-3 p-2 -m-2">
        <ChevronLeft size={16} /> Members
      </button>
      <div className="flex items-center gap-3 mb-4">
        <Avatar client={client} size={56} />
        <div className="min-w-0">
          <div style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-xl font-semibold truncate">{name}</div>
          <div style={{ color: TEXT_SOFT }} className="text-sm truncate">{client.email}{since ? ` · since ${since}` : ''}</div>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-4 -mx-4 px-4" data-no-swipe>
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{ background: tab === key ? PLUM : INK_2, color: tab === key ? INK : PAPER_DIM }}
            className="rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap"
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          <div style={{ background: INK_2 }} className="rounded-2xl px-4 py-3.5">
            <div style={{ color: TEXT_SOFT }} className="text-sm mb-2">This week</div>
            <WeekBars client={client} week={stat.week} unitless />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Stat label="Workouts, 2 weeks" value={stat.sessions14} />
            <Stat label="Avg effort" value={stat.avgRpe ? stat.avgRpe.toFixed(1) : '—'} sub="of 10" />
          </div>
          {flags.length > 0 && (
            <>
              <SectionTitle>Flags</SectionTitle>
              <div style={{ background: INK_2 }} className="rounded-2xl px-4 py-3 space-y-2">
                {flags.map(([color, text], i) => <div key={i} style={{ color }} className="text-sm">{text}</div>)}
              </div>
            </>
          )}
          <SectionTitle>Latest workouts</SectionTitle>
          {mine.length === 0 ? (
            <div style={{ background: INK_2, color: TEXT_SOFT }} className="rounded-2xl px-4 py-4 text-sm">No workouts yet.</div>
          ) : (
            <div style={{ background: INK_2 }} className="rounded-2xl overflow-hidden">
              {mine.map((w, i) => (
                <div key={w.id} style={{ borderTop: i ? `1px solid color-mix(in srgb, ${TEXT_SOFT} 18%, transparent)` : 'none' }} className="px-4 py-3">
                  <div style={{ color: PAPER }} className="text-sm font-medium">{workoutTitle(w.muscle_groups || [], w.activities || [])}</div>
                  <div style={{ color: TEXT_SOFT }} className="text-sm">{timeAgo(new Date(w.started_at))}{w.rpe ? ` · effort ${w.rpe}/10` : ''}</div>
                  {w.felt_off && <div style={{ color: BRICK }} className="text-sm">Felt off{w.felt_off_note ? `: ${w.felt_off_note}` : ''}</div>}
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setTab('workouts')} style={{ color: PLUM }} className="text-sm font-medium mt-2 px-1">All workouts</button>
        </div>
      )}

      {tab === 'plan' && (
        <div className="space-y-4">
          <GoalPrescription client={client} onSaved={(fields) => onClientChanged(client.id, fields)} />
          <ClientHeartRate clientId={client.id} />
          <ProgramBuilder clientId={client.id} trainerId={trainerId} />
        </div>
      )}
      {tab === 'health' && (
        <div className="space-y-4">
          <ClientScreening client={client} />
          <ClientBaseline clientId={client.id} />
        </div>
      )}
      {tab === 'workouts' && <ClientWorkouts clientId={client.id} />}
      {tab === 'notes' && <CoachNotes clientId={client.id} />}
    </div>
  );
}
