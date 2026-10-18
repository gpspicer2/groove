import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Users, BookOpen, CreditCard } from './lib/icons';
import { useAuth } from './auth/AuthContext';
import { ViewToggle } from './auth/SwitchAccount';
import { supabase } from './lib/supabaseClient';
import { INK, INK_2, PAPER, TEXT_SOFT, PLUM } from './theme';
import AccountMenu from './AccountMenu';
import Wordmark from './Wordmark';
import { ArticleManager } from './features/coach/clientTools';
import { computeMemberStats, buildAttention, DAY } from './features/coach/stats';
import Today from './features/coach/Today';
import Clients from './features/coach/Clients';
import ClientScreen from './features/coach/ClientScreen';
import Members from './features/coach/Members';

const TABS = [
  ['today', 'Today', LayoutDashboard],
  ['clients', 'Members', Users],
  ['library', 'Learn', BookOpen],
  ['billing', 'Billing', CreditCard],
];

// Greg's side of Groove. Built differently from the member app on purpose:
// a dashboard that tells him who needs him, a members list with each
// person's week at a glance, and a bottom bar instead of swipe tabs.
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

  function open(id) { acknowledge(id); setSelectedId(id); setTab('clients'); window.scrollTo(0, 0); }
  function goTab(key) { setSelectedId(null); setTab(key); window.scrollTo(0, 0); }

  return (
    <div style={{ background: INK, fontFamily: 'Outfit, sans-serif' }} className="min-h-[100svh]">
      <div className="max-w-md mx-auto px-4 pt-safe">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center mb-3">
          <div />
          <Wordmark height={28} className="justify-self-center" />
          <div className="justify-self-end flex items-center gap-2">
            <ViewToggle compact />
            <AccountMenu />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-28 pt-2">
        {loading ? (
          <div className="py-32" aria-busy="true" />
        ) : selected ? (
          <ClientScreen
            client={selected}
            stat={stats[selected.id]}
            workouts={workouts}
            trainerId={user.id}
            onBack={() => setSelectedId(null)}
            onClientChanged={clientChanged}
            onClientRemoved={(id) => { setClients((prev) => prev.filter((c) => c.id !== id)); setSelectedId(null); }}
          />
        ) : tab === 'today' ? (
          <Today firstName={firstName} clients={clients} stats={stats} attention={attention} workouts={workouts} onOpenClient={open} />
        ) : tab === 'clients' ? (
          <Clients clients={clients} stats={stats} attention={attention} onOpenClient={open} />
        ) : tab === 'library' ? (
          <div className="-mx-4"><ArticleManager /></div>
        ) : (
          <Members clients={clients} onClientChanged={clientChanged} />
        )}
      </div>

      <nav style={{ background: INK_2, borderTop: `1px solid color-mix(in srgb, ${TEXT_SOFT} 22%, transparent)` }} className="fixed bottom-0 inset-x-0 z-40">
        <div className="max-w-md mx-auto grid grid-cols-4 px-2 pt-1.5" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
          {TABS.map(([key, label, Icon]) => {
            const active = tab === key && !(key !== 'clients' && selected);
            return (
              <button key={key} onClick={() => goTab(key)} className="flex flex-col items-center gap-0.5 py-1.5 relative">
                {active && <span style={{ background: PLUM }} className="absolute top-0 h-0.5 w-8 rounded-full" />}
                <Icon size={21} color={active ? PLUM : TEXT_SOFT} />
                <span style={{ color: active ? PLUM : TEXT_SOFT }} className="text-xs font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
