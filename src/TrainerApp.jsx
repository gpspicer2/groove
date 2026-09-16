import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from './auth/AuthContext';
import { supabase } from './lib/supabaseClient';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY } from './theme';
import { BASELINE_SECTIONS } from './features/baseline/baselineQuestions';
import MessageTab from './features/message/MessageTab';
import AccountMenu from './AccountMenu';

export default function TrainerApp() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('*').eq('role', 'client').order('created_at', { ascending: false });
      setClients(data || []);
      setLoading(false);
    })();
  }, []);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  return (
    <div style={{ background: INK, fontFamily: 'Inter, sans-serif' }} className="min-h-[100svh]">
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center mb-4">
          <AccountMenu />
          <span style={{ color: LIME, fontFamily: 'Manrope, sans-serif' }} className="text-base font-medium tracking-wide text-center italic">
            GROOVE
          </span>
          <div />
        </div>
      </div>

      {selectedClient ? (
        <ClientDetail client={selectedClient} trainerId={user.id} onBack={() => setSelectedClientId(null)} />
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
              {clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClientId(c.id)}
                  style={{ background: INK_2, borderLeft: `3px solid ${LIME}` }}
                  className="w-full text-left rounded-md px-4 py-3"
                >
                  <div style={{ color: PAPER }} className="text-sm font-medium">{c.full_name || c.email}</div>
                  <div style={{ color: TEXT_SOFT }} className="text-sm">{c.email}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const CLIENT_TABS = ['baseline', 'workouts', 'chat'];

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
      {tab === 'baseline' && <ClientBaseline clientId={client.id} />}
      {tab === 'workouts' && <ClientWorkouts clientId={client.id} />}
      {tab === 'chat' && <MessageTab userId={trainerId} peerId={client.id} />}
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
