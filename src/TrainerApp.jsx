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
  ['library', 'Library', BookOpen],
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

  const stats = computeMemberStats(clients, workouts, sets);
  const attention = buildAttention(clients, stats);
  const selected = clients.find((c) => c.id === selectedId) || null;
  const firstName = (profile?.full_name || '').split(' ')[0] || 'Greg';

  function open(id) { setSelectedId(id); setTab('clients'); window.scrollTo(0, 0); }
  function goTab(key) { setSelectedId(null); setTab(key); window.scrollTo(0, 0); }

  return (
    <div style={{ background: INK, fontFamily: 'Manrope, sans-serif' }} className="min-h-[100svh]">
      <div className="max-w-md mx-auto px-4 pt-safe">
        <div className="flex items-center justify-between gap-2 mb-3">
          <ViewToggle />
          <Wordmark height={28} />
          <AccountMenu />
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-28 pt-2">
        {loading ? (
          <div style={{ color: TEXT_SOFT }} className="text-sm text-center py-16">Loading…</div>
        ) : selected ? (
          <ClientScreen
            client={selected}
            stat={stats[selected.id]}
            workouts={workouts}
            trainerId={user.id}
            onBack={() => setSelectedId(null)}
            onClientChanged={clientChanged}
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
