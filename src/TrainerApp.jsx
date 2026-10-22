import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './auth/AuthContext';
import { ViewToggle } from './auth/SwitchAccount';
import { supabase } from './lib/supabaseClient';
import { INK, INK_2, PAPER_DIM, LIME, SKY, VIOLET, AMBER, ON_AMBER } from './theme';
import SwipeTabs from './SwipeTabs';
import AccountMenu from './AccountMenu';
import Wordmark from './Wordmark';
import { ArticleManager } from './features/coach/clientTools';
import { computeMemberStats, buildAttention, DAY } from './features/coach/stats';
import Today from './features/coach/Today';
import Clients from './features/coach/Clients';
import ClientScreen from './features/coach/ClientScreen';
import Members from './features/coach/Members';

// Same top tabs as the member app: tap or swipe between them.
const TABS = [
  ['today', 'Today', LIME],
  ['clients', 'Members', SKY],
  ['library', 'Learn', VIOLET],
  ['billing', 'Billing', AMBER],
];

// Greg's side of Groove. Same shell as the member app (tabs up top, swipe between them), with his own screens:
// a dashboard that tells him who needs him, a members list with each person's week at a glance, Learn and Billing.
export default function TrainerApp() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState('today');
  const [clients, setClients] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [sets, setSets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: clientRows } = await supabase.from('profiles').select('*').eq('role', 'client').order('created_at', { ascending: false });
    const list = clientRows || [];
    setClients(list);
    const ids = list.map((c) => c.id);
    if (ids.length > 0) {
      const since = new Date(Date.now() - 21 * DAY).toISOString();
      const [w, s] = await Promise.all([
        supabase.from('workouts').select('*').in('user_id', ids).is('deleted_at', null).not('completed_at', 'is', null).gte('started_at', since).order('started_at', { ascending: false }),
        supabase.from('workout_sets').select('workout_id, movement_type, exercise_name, muscle_group, light_minutes, moderate_minutes, vigorous_minutes').in('user_id', ids).gte('created_at', since),
      ]);
      setWorkouts(w.data || []);
      setSets(s.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  // Refresh when Greg comes back to the app.
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [load]);

  function clientChanged(id, fields) {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields } : c)));
  }

  // Opening a member acknowledges their current flags: they stay gone until something new happens.
  const ackKey = `groove:coachAck:${user.id}`;
  const [acks, setAcks] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ackKey) || '{}'); } catch { return {}; }
  });
  const stats = computeMemberStats(clients, workouts, sets);
  const attention = buildAttention(clients, stats, new Date(), acks);
  function acknowledge(id) {
    const mine = {};
    buildAttention(clients, stats, new Date(), {}).filter((i) => i.id === id).forEach((i) => { mine[i.kind] = i.sig; });
    if (Object.keys(mine).length === 0) return;
    setAcks((prev) => {
      const next = { ...prev, [id]: { ...(prev[id] || {}), ...mine } };
      try { localStorage.setItem(ackKey, JSON.stringify(next)); } catch { /* storage blocked */ }
      return next;
    });
    // Also saved on the member's row (so the morning push respects it); quietly skipped if the column isn't there yet.
    const merged = { ...(clients.find((c) => c.id === id)?.coach_ack || {}), ...mine };
    supabase.from('profiles').update({ coach_ack: merged }).eq('id', id).then(() => {});
  }
  const selected = clients.find((c) => c.id === selectedId) || null;
  const firstName = (profile?.full_name || '').split(' ')[0] || 'Greg';

  function open(id) { acknowledge(id); setSelectedId(id); setTab('clients'); }
  function goTab(key) { if (key === tab || key === 'clients') setSelectedId(null); setTab(key); }

  const scrollRef = useRef(null);
  useEffect(() => { scrollRef.current?.scrollTo(0, 0); }, [selectedId]);
  const activeIndex = TABS.findIndex(([key]) => key === tab);

  const pageWrap = (key, node) => <div key={key} className="max-w-md mx-auto px-4 pb-10 pt-1">{node}</div>;
  const todayEl = pageWrap('today', <Today firstName={firstName} clients={clients} stats={stats} attention={attention} workouts={workouts} onOpenClient={open} onClientChanged={clientChanged} />);
  const clientsEl = pageWrap('clients', selected ? (
    <ClientScreen
      client={selected}
      stat={stats[selected.id]}
      workouts={workouts}
      trainerId={user.id}
      onBack={() => setSelectedId(null)}
      onClientChanged={clientChanged}
      onClientRemoved={(id) => { setClients((prev) => prev.filter((c) => c.id !== id)); setSelectedId(null); }}
    />
  ) : <Clients clients={clients} stats={stats} attention={attention} onOpenClient={open} />);
  const libraryEl = pageWrap('library', <div className="-mx-4"><ArticleManager /></div>);
  const billingEl = pageWrap('billing', <Members clients={clients} onClientChanged={clientChanged} />);
  const needs = new Set(attention.map((a) => a.id)).size;

  return (
    <div style={{ background: INK, fontFamily: 'Outfit, sans-serif' }} className="h-[100svh] flex flex-col">
      <div style={{ background: INK }} className="flex-none max-w-md mx-auto w-full px-4 pt-safe">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center mb-4">
          <div />
          <div className="justify-self-center flex flex-col items-center">
            <Wordmark height={30} />
            <span style={{ color: SKY }} className="text-[11px] font-bold tracking-[0.35em] uppercase mt-0.5 pl-[0.35em]">Coach</span>
          </div>
          <div className="justify-self-end flex items-center gap-2">
            <ViewToggle compact />
            <AccountMenu />
          </div>
        </div>
        <div className="flex gap-1.5 pb-4">
          {TABS.map(([key, label, color]) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => goTab(key)}
                style={{ background: active ? color : INK_2, color: active ? (key === 'billing' ? ON_AMBER : INK) : PAPER_DIM }}
                className="flex-1 py-2.5 rounded-md text-sm font-medium transition-colors relative"
              >
                {label}
                {key === 'today' && needs > 0 && (
                  <span style={{ background: active ? INK : LIME, color: active ? LIME : INK }} className="absolute -top-1.5 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold flex items-center justify-center">{needs}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={scrollRef} id="app-scroll" className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="py-32" aria-busy="true" />
        ) : (
          <SwipeTabs
            index={activeIndex}
            onChangeIndex={(i) => setTab(TABS[i][0])}
            scrollContainerRef={scrollRef}
            pages={[todayEl, clientsEl, libraryEl, billingEl]}
          />
        )}
      </div>
    </div>
  );
}
