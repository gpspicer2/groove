import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from './auth/AuthContext';
import { supabase } from './lib/supabaseClient';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY, BRICK, VIOLET } from './theme';
import { BASELINE_SECTIONS } from './features/baseline/baselineQuestions';
import { MUSCLE_GROUPS } from './features/move/exerciseLibrary';
import { computeHrZones } from './lib/heartRate';
import AccountMenu from './AccountMenu';

function daysBetween(a, b) {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export default function TrainerApp() {
  const { user } = useAuth();
  const [view, setView] = useState('clients'); // 'clients' | 'learn'
  const [clients, setClients] = useState([]);
  const [lastWorkoutByClient, setLastWorkoutByClient] = useState({});
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: clientRows } = await supabase.from('profiles').select('*').eq('role', 'client').order('created_at', { ascending: false });
      setClients(clientRows || []);
      const ids = (clientRows || []).map((c) => c.id);
      if (ids.length > 0) {
        const { data: workoutRows } = await supabase
          .from('workouts')
          .select('user_id, started_at')
          .in('user_id', ids)
          .not('completed_at', 'is', null)
          .order('started_at', { ascending: false });
        const last = {};
        (workoutRows || []).forEach((w) => { if (!last[w.user_id]) last[w.user_id] = w.started_at; });
        setLastWorkoutByClient(last);
      }
      setLoading(false);
    })();
  }, []);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  return (
    <div style={{ background: INK, fontFamily: 'Inter, sans-serif' }} className="min-h-[100svh]">
      <div className="max-w-md mx-auto px-4 pt-safe">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center mb-4">
          <div />
          <span style={{ color: LIME, fontFamily: "'Segoe UI', Manrope, sans-serif" }} className="text-base font-extrabold tracking-wide text-center italic">
            GROOVE
          </span>
          <AccountMenu />
        </div>
        {!selectedClient && (
          <div className="flex gap-2 pb-4">
            <button
              onClick={() => setView('clients')}
              style={{ background: view === 'clients' ? LIME : INK_2, color: view === 'clients' ? INK : PAPER_DIM }}
              className="flex-1 py-2.5 rounded-md text-sm font-medium"
            >
              Clients
            </button>
            <button
              onClick={() => setView('learn')}
              style={{ background: view === 'learn' ? VIOLET : INK_2, color: view === 'learn' ? INK : PAPER_DIM }}
              className="flex-1 py-2.5 rounded-md text-sm font-medium"
            >
              Learn articles
            </button>
          </div>
        )}
      </div>

      {selectedClient ? (
        <ClientDetail client={selectedClient} trainerId={user.id} onBack={() => setSelectedClientId(null)} />
      ) : view === 'learn' ? (
        <ArticleManager />
      ) : (
        <div className="max-w-md mx-auto px-4 pb-12">
          <h1 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-2xl font-medium mb-4">Clients</h1>
          {loading ? (
            <div style={{ color: TEXT_SOFT }} className="text-sm text-center py-8">Loading…</div>
          ) : clients.length === 0 ? (
            <div style={{ background: INK_2, color: TEXT_SOFT }} className="rounded-md px-4 py-6 text-center text-sm">
              No clients yet — once someone signs up, they'll show up here.
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map((c) => {
                const lastAt = lastWorkoutByClient[c.id];
                const daysSince = lastAt ? daysBetween(new Date(), new Date(lastAt)) : null;
                const inactive = daysSince == null || daysSince >= 7;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClientId(c.id)}
                    style={{ background: INK_2, borderLeft: `3px solid ${LIME}` }}
                    className="w-full text-left rounded-md px-4 py-3"
                  >
                    <div style={{ color: PAPER }} className="text-sm font-medium">{c.full_name || c.email}</div>
                    <div style={{ color: TEXT_SOFT }} className="text-sm">{c.email}</div>
                    {inactive && (
                      <div style={{ color: BRICK }} className="text-sm mt-1">
                        ⚠️ {daysSince == null ? 'No workouts logged yet' : `${daysSince} days since last workout`}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ArticleManager() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
      setArticles(data || []);
      setLoading(false);
    })();
  }, []);

  async function handleAdd() {
    if (!title.trim() || !summary.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('articles')
      .insert({ title: title.trim(), summary: summary.trim(), url: url.trim() || null })
      .select()
      .single();
    setSaving(false);
    if (error) return;
    setArticles((prev) => [data, ...prev]);
    setTitle(''); setSummary(''); setUrl('');
    setAdding(false);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this article?')) return;
    await supabase.from('articles').delete().eq('id', id);
    setArticles((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-12">
      <h1 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-2xl font-medium mb-1 text-center">Learn</h1>
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-4 text-center">Reasons to Move — shown to every client</div>

      {adding ? (
        <div style={{ background: INK_2, borderTop: `2px solid ${VIOLET}` }} className="rounded-lg px-5 py-5 mb-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            style={{ background: INK_3, color: PAPER }}
            className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center mb-3"
          />
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder="Main point / finding"
            style={{ background: INK_3, color: PAPER }}
            className="w-full rounded-md px-3 py-2.5 text-sm outline-none resize-none text-center mb-3"
          />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Link, optional"
            style={{ background: INK_3, color: PAPER }}
            className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center mb-3"
          />
          <div className="flex items-center gap-2">
            <button onClick={() => setAdding(false)} style={{ color: TEXT_SOFT }} className="text-sm py-2.5 px-3">Cancel</button>
            <button
              onClick={handleAdd}
              disabled={!title.trim() || !summary.trim() || saving}
              style={{ background: VIOLET, color: INK }}
              className="flex-1 rounded-md py-2.5 text-sm font-medium"
            >
              {saving ? 'Posting…' : 'Post article'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{ background: INK_2, color: VIOLET, borderLeft: `3px solid ${VIOLET}` }}
          className="w-full rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 mb-4"
        >
          <Plus size={14} /> Post new article
        </button>
      )}

      {loading ? (
        <div style={{ color: TEXT_SOFT }} className="text-sm text-center py-8">Loading…</div>
      ) : articles.length === 0 ? (
        <div style={{ background: INK_2, color: TEXT_SOFT }} className="rounded-md px-4 py-6 text-center text-sm">
          Nothing posted yet.
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((a) => (
            <div key={a.id} style={{ background: INK_2, borderLeft: `3px solid ${VIOLET}` }} className="rounded-md px-4 py-3 text-center">
              <div style={{ color: TEXT_SOFT }} className="text-sm mb-1">
                {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div style={{ color: PAPER }} className="text-sm font-medium mb-1">{a.title}</div>
              <div style={{ color: PAPER_DIM }} className="text-sm mb-2">{a.summary}</div>
              {a.url && <div style={{ color: VIOLET }} className="text-sm mb-2 break-all">{a.url}</div>}
              <button onClick={() => handleDelete(a.id)} style={{ color: TEXT_SOFT }} className="text-sm inline-flex items-center gap-1">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const CLIENT_TABS = ['baseline', 'program', 'workouts'];

function ClientDetail({ client, trainerId, onBack }) {
  const [tab, setTab] = useState('baseline');

  return (
    <div className="max-w-md mx-auto px-4 pb-12">
      <button onClick={onBack} style={{ color: TEXT_SOFT }} className="flex items-center gap-1 text-sm mb-3 p-2 -m-2">
        <ChevronLeft size={16} /> All clients
      </button>
      <h1 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-2xl font-medium mb-4">
        {client.full_name || client.email}
      </h1>
      <div className="flex gap-2 mb-4">
        {CLIENT_TABS.map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{ background: tab === key ? LIME : INK_2, color: tab === key ? INK : PAPER_DIM }}
            className="flex-1 py-2.5 rounded-md text-sm font-medium capitalize"
          >
            {key}
          </button>
        ))}
      </div>
      {tab === 'baseline' && (
        <div className="space-y-4">
          <ClientHeartRate clientId={client.id} />
          <ClientBaseline clientId={client.id} />
        </div>
      )}
      {tab === 'program' && <ProgramBuilder clientId={client.id} trainerId={trainerId} />}
      {tab === 'workouts' && <ClientWorkouts clientId={client.id} />}
    </div>
  );
}

const HR_ZONE_OPTIONS = ['Light', 'Moderate', 'Vigorous'];

function ClientHeartRate({ clientId }) {
  const [hr, setHr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('resting_hr_bpm, max_hr_bpm, prescribed_hr_zone').eq('id', clientId).maybeSingle();
      setHr(data);
      setLoading(false);
    })();
  }, [clientId]);

  async function setPrescribedZone(zone) {
    setSaving(true);
    const next = hr?.prescribed_hr_zone === zone ? null : zone;
    await supabase.from('profiles').update({ prescribed_hr_zone: next }).eq('id', clientId);
    setHr((prev) => ({ ...prev, prescribed_hr_zone: next }));
    setSaving(false);
  }

  if (loading) return null;
  const zones = computeHrZones(hr?.resting_hr_bpm, hr?.max_hr_bpm);

  return (
    <div style={{ background: INK_2 }} className="rounded-md px-4 py-3">
      <div style={{ color: SKY }} className="text-sm uppercase tracking-wide mb-2">Heart rate zones</div>
      {!zones ? (
        <div style={{ color: TEXT_SOFT }} className="text-sm">This client hasn't entered resting/max heart rate on Birdseye yet.</div>
      ) : (
        <div className="space-y-1 mb-3">
          {zones.map((z) => (
            <div key={z.label} className="flex items-center justify-between">
              <span style={{ color: PAPER_DIM }} className="text-sm">{z.label}</span>
              <span style={{ color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm">{z.lowBpm}–{z.highBpm} bpm</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-2">Prescribe a target intensity for their aerobic work</div>
      <div className="flex gap-2">
        {HR_ZONE_OPTIONS.map((zone) => {
          const selected = hr?.prescribed_hr_zone === zone;
          return (
            <button
              key={zone}
              onClick={() => setPrescribedZone(zone)}
              disabled={saving}
              style={{ background: selected ? SKY : INK_3, color: selected ? INK : PAPER_DIM }}
              className="flex-1 rounded-md py-2 text-sm font-medium"
            >
              {zone}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ClientBaseline({ clientId }) {
  const [baseline, setBaseline] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('baseline_responses').select('*').eq('user_id', clientId).maybeSingle();
      setBaseline(data);
      setLoading(false);
    })();
  }, [clientId]);

  if (loading) return <div style={{ color: TEXT_SOFT }} className="text-sm text-center py-8">Loading…</div>;
  if (!baseline || !baseline.submitted_at) {
    return (
      <div style={{ background: INK_2, color: TEXT_SOFT }} className="rounded-md px-4 py-6 text-center text-sm">
        This client hasn't completed their baseline yet.
      </div>
    );
  }

  const answers = baseline.form_answers || {};
  const assessment = baseline.fitness_assessment || {};

  return (
    <div className="space-y-4">
      {BASELINE_SECTIONS.map((section) => (
        <div key={section.title} style={{ background: INK_2 }} className="rounded-md px-4 py-3">
          <div style={{ color: SKY }} className="text-sm uppercase tracking-wide mb-2">{section.title}</div>
          <div className="space-y-2">
            {section.questions.map((q) => (
              <div key={q.key}>
                <div style={{ color: TEXT_SOFT }} className="text-sm">{q.label}</div>
                <div style={{ color: PAPER }} className="text-sm">{answers[q.key] || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ background: INK_2 }} className="rounded-md px-4 py-3">
        <div style={{ color: SKY }} className="text-sm uppercase tracking-wide mb-2">Fitness self-assessment</div>
        {!assessment.aerobic_rating ? (
          <div style={{ color: TEXT_SOFT }} className="text-sm">Not completed yet.</div>
        ) : (
          <div className="space-y-2">
            <div>
              <div style={{ color: TEXT_SOFT }} className="text-sm">Aerobic fitness (self-rated)</div>
              <div style={{ color: PAPER }} className="text-sm">{assessment.aerobic_rating}</div>
            </div>
            {assessment.aerobic_mode === 'timed' ? (
              <div>
                <div style={{ color: TEXT_SOFT }} className="text-sm">Timed activity</div>
                <div style={{ color: PAPER }} className="text-sm">
                  {assessment.aerobic_activity === 'walk' ? 'Walk ~600m' : 'Stair climb'} — {Math.floor((assessment.aerobic_seconds || 0) / 60)}:{String((assessment.aerobic_seconds || 0) % 60).padStart(2, '0')}, result: {assessment.aerobic_result || '—'}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ color: TEXT_SOFT }} className="text-sm">Aerobic endurance, in their words</div>
                <div style={{ color: PAPER }} className="text-sm">{assessment.aerobic_description || '—'}</div>
              </div>
            )}
            <div>
              <div style={{ color: TEXT_SOFT }} className="text-sm">Strength / resistance (self-rated)</div>
              <div style={{ color: PAPER }} className="text-sm">{assessment.resistance_rating}</div>
            </div>
            {assessment.one_rep_maxes && (
              <div>
                <div style={{ color: TEXT_SOFT }} className="text-sm">Estimated 1RMs</div>
                <div style={{ color: PAPER }} className="text-sm">
                  {Object.entries(assessment.one_rep_maxes).filter(([, v]) => v).map(([k, v]) => `${k}: ${v} lb`).join(', ') || '—'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProgramBuilder({ clientId, trainerId }) {
  const [programId, setProgramId] = useState(null);
  const [name, setName] = useState('Assigned Program');
  const [exercises, setExercises] = useState([]); // [{name, muscleGroup, sets, reps}]
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: program } = await supabase
        .from('programs')
        .select('id, name')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (program) {
        setProgramId(program.id);
        setName(program.name);
        const { data: rows } = await supabase
          .from('program_exercises')
          .select('*')
          .eq('program_id', program.id)
          .order('order_index', { ascending: true });
        setExercises((rows || []).map((r) => ({ name: r.exercise_name, muscleGroup: r.muscle_group, sets: r.target_sets, reps: r.target_reps })));
      }
      setLoading(false);
    })();
  }, [clientId]);

  function addExercise() {
    setExercises((prev) => [...prev, { name: '', muscleGroup: MUSCLE_GROUPS[0], sets: 3, reps: '10-12' }]);
  }

  function updateExercise(i, field, value) {
    setExercises((prev) => prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));
  }

  function removeExercise(i) {
    setExercises((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setSaving(true);
    let pid = programId;
    if (!pid) {
      const { data, error } = await supabase
        .from('programs')
        .insert({ client_id: clientId, trainer_id: trainerId, name: name.trim() || 'Assigned Program' })
        .select()
        .single();
      if (error) { setSaving(false); return; }
      pid = data.id;
      setProgramId(pid);
    } else {
      await supabase.from('programs').update({ name: name.trim() || 'Assigned Program' }).eq('id', pid);
    }

    await supabase.from('program_exercises').delete().eq('program_id', pid);
    const rows = exercises
      .filter((e) => e.name.trim())
      .map((e, i) => ({
        program_id: pid,
        exercise_name: e.name.trim(),
        muscle_group: e.muscleGroup,
        target_sets: Number(e.sets) || 3,
        target_reps: e.reps || '10-12',
        order_index: i,
      }));
    if (rows.length > 0) await supabase.from('program_exercises').insert(rows);

    setSaving(false);
    setSavedAt(new Date());
  }

  if (loading) return <div style={{ color: TEXT_SOFT }} className="text-sm text-center py-8">Loading…</div>;

  return (
    <div>
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-3 text-center">
        Build the plan this client sees as "Your coach assigned" when they open Move.
      </div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Program name"
        style={{ background: INK_2, color: PAPER }}
        className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center mb-3"
      />

      <div className="space-y-2 mb-3">
        {exercises.map((ex, i) => (
          <div key={i} style={{ background: INK_2 }} className="rounded-md px-3 py-3">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={ex.name}
                onChange={(e) => updateExercise(i, 'name', e.target.value)}
                placeholder="Exercise name"
                style={{ background: INK_3, color: PAPER }}
                className="flex-1 rounded-md px-2 py-2 text-sm outline-none"
              />
              <button onClick={() => removeExercise(i)} style={{ color: TEXT_SOFT }} className="p-2 -m-1">
                <X size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={ex.muscleGroup}
                onChange={(e) => updateExercise(i, 'muscleGroup', e.target.value)}
                style={{ background: INK_3, color: PAPER }}
                className="rounded-md px-2 py-2 text-sm outline-none"
              >
                {MUSCLE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <input
                type="number"
                value={ex.sets}
                onChange={(e) => updateExercise(i, 'sets', e.target.value)}
                placeholder="sets"
                style={{ background: INK_3, color: PAPER }}
                className="w-16 rounded-md px-2 py-2 text-sm outline-none text-center"
              />
              <input
                type="text"
                value={ex.reps}
                onChange={(e) => updateExercise(i, 'reps', e.target.value)}
                placeholder="reps"
                style={{ background: INK_3, color: PAPER }}
                className="w-20 rounded-md px-2 py-2 text-sm outline-none text-center"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addExercise}
        style={{ background: INK_2, color: SKY, borderLeft: `3px solid ${SKY}` }}
        className="w-full rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 mb-3"
      >
        <Plus size={14} /> Add exercise
      </button>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{ background: LIME, color: INK }}
        className="w-full rounded-md py-3 text-sm font-medium"
      >
        {saving ? 'Saving…' : 'Save program'}
      </button>
      {savedAt && (
        <div style={{ color: TEXT_SOFT }} className="text-sm mt-2 text-center">Saved</div>
      )}
    </div>
  );
}

function ClientWorkouts({ clientId }) {
  const [workouts, setWorkouts] = useState([]);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    (async () => {
      const [{ data: w }, { data: s }] = await Promise.all([
        supabase.from('workouts').select('*').eq('user_id', clientId).not('completed_at', 'is', null).order('started_at', { ascending: false }),
        supabase.from('workout_sets').select('*').eq('user_id', clientId),
      ]);
      setWorkouts(w || []);
      setSets(s || []);
      setLoading(false);
    })();
  }, [clientId]);

  if (loading) return <div style={{ color: TEXT_SOFT }} className="text-sm text-center py-8">Loading…</div>;
  if (workouts.length === 0) {
    return (
      <div style={{ background: INK_2, color: TEXT_SOFT }} className="rounded-md px-4 py-6 text-center text-sm">
        No completed workouts logged yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {workouts.map((w) => {
        const workoutSets = sets.filter((s) => s.workout_id === w.id);
        const expanded = expandedId === w.id;
        return (
          <div key={w.id} style={{ background: INK_2, borderLeft: `3px solid ${SKY}` }} className="rounded-md px-4 py-3">
            <button onClick={() => setExpandedId(expanded ? null : w.id)} className="w-full flex items-center justify-between">
              <div className="text-left">
                <div style={{ color: PAPER }} className="text-sm font-medium">{(w.muscle_groups || []).join(' + ')}</div>
                <div style={{ color: TEXT_SOFT }} className="text-sm">
                  {new Date(w.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {workoutSets.length} sets
                  {w.program_id ? ' · Followed assigned program' : ' · Self-directed'}
                </div>
              </div>
              {expanded ? <ChevronUp size={16} color={TEXT_SOFT} /> : <ChevronDown size={16} color={TEXT_SOFT} />}
            </button>
            {expanded && (
              <div style={{ borderTop: `1px dashed ${INK_3}` }} className="mt-3 pt-3 space-y-1">
                {workoutSets.map((s) => (
                  <div key={s.id} style={{ color: PAPER_DIM }} className="text-sm">
                    {s.exercise_name}: {s.weight ?? '—'} lb × {s.reps ?? '—'}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
