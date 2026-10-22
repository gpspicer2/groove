import React from 'react';
import { ChevronRight, CheckCircle2 } from '../../lib/icons';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, PLUM, MOSS } from '../../theme';
import { workoutTitle } from '../move/exerciseLibrary';
import { Avatar, Stat, SectionTitle, StatusDot } from './CoachParts';
import { timeAgo } from './stats';
import { ClearButton } from './ClearanceCard';
import MessageComposer, { SendWelcome } from './MessageComposer';

export default function Today({ firstName, clients, stats, attention, workouts, onOpenClient, onClientChanged }) {
  const members = clients.length;
  const active = clients.filter((c) => stats[c.id]?.week.sessions > 0).length;
  const goalsMet = clients.filter((c) => stats[c.id]?.allGoalsMet).length;
  const rpes = clients.map((c) => stats[c.id]?.avgRpe).filter(Boolean);
  const avgEffort = rpes.length ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : '—';
  const byId = Object.fromEntries(clients.map((c) => [c.id, c]));
  const [hiFor, setHiFor] = React.useState(null);
  const recent = workouts.slice(0, 8);
  // One row per member, even when several things need him.
  const groups = [];
  attention.forEach((a) => { const g = groups.find((x) => x.id === a.id); if (g) g.items.push(a); else groups.push({ id: a.id, items: [a] }); });

  return (
    <div className="-mt-4">
      <SectionTitle right={groups.length > 0 && <span style={{ background: PLUM, color: INK }} className="text-xs font-semibold rounded-full px-2 py-0.5">{groups.length}</span>}>
        Needs You
      </SectionTitle>
      {attention.length === 0 ? (
        <div style={{ background: INK_2, color: PAPER_DIM }} className="rounded-2xl px-4 py-4 text-sm flex items-center gap-2">
          <CheckCircle2 size={18} color={MOSS} /> All clear. Nobody needs you right now.
        </div>
      ) : (
        <div style={{ background: INK_2 }} className="rounded-2xl overflow-hidden">
          {groups.map((g, i) => {
            const c = byId[g.id];
            const review = g.items.some((a) => a.kind === 'clearance' || a.kind === 'symptoms');
            return (
              <div key={g.id} style={{ borderTop: i ? `1px solid color-mix(in srgb, ${TEXT_SOFT} 18%, transparent)` : 'none' }}>
                <button onClick={() => onOpenClient(g.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                  <StatusDot level={g.items[0].level} />
                  <span className="flex-1 min-w-0">
                    <span style={{ color: PAPER }} className="block text-sm font-medium truncate">{g.items[0].title}</span>
                    {g.items.map((a) => <span key={a.kind} style={{ color: TEXT_SOFT }} className="block text-sm">{a.text}</span>)}
                  </span>
                  <ChevronRight size={16} color={TEXT_SOFT} />
                </button>
                {review && c && (
                  <div className="px-4 pb-3 -mt-1 pl-9">
                    <ClearButton client={c} onClientChanged={onClientChanged} />
                  </div>
                )}
                {c && g.items.some((a) => a.kind === 'newMember') && (
                  <div className="px-4 pb-3 -mt-1 pl-9">
                    {hiFor === g.id ? (
                      <MessageComposer client={c} startOpen defaultText={`Hi ${(c.full_name || '').split(' ')[0]}! I see you're all set up. Welcome to Groove. `} onClose={() => setHiFor(null)} />
                    ) : (
                      <SendWelcome client={c} onWrite={() => setHiFor(g.id)} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <SectionTitle>This Week</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Members" value={members} />
        <Stat label="Active This Week" value={`${active}/${members}`} color={PLUM} />
        <Stat label="Hit Every Goal" value={goalsMet} sub="so far this week" color={MOSS} />
        <Stat label="Avg Effort" value={avgEffort} sub="last 2 weeks, of 10" />
      </div>

      <SectionTitle>Recent Activity</SectionTitle>
      {recent.length === 0 ? (
        <div style={{ background: INK_2, color: TEXT_SOFT }} className="rounded-2xl px-4 py-4 text-sm">No workouts yet.</div>
      ) : (
        <div style={{ background: INK_2 }} className="rounded-2xl overflow-hidden">
          {recent.map((w, i) => {
            const c = byId[w.user_id];
            if (!c) return null;
            return (
              <button
                key={w.id}
                onClick={() => onOpenClient(c.id)}
                style={{ borderTop: i ? `1px solid color-mix(in srgb, ${TEXT_SOFT} 18%, transparent)` : 'none' }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <Avatar client={c} size={34} />
                <span className="flex-1 min-w-0">
                  <span style={{ color: PAPER }} className="block text-sm font-medium truncate">{c.full_name || c.email}</span>
                  <span style={{ color: TEXT_SOFT }} className="block text-sm truncate">
                    {workoutTitle(w.muscle_groups || [], w.activities || [])}{w.rpe ? ` · effort ${w.rpe}` : ''}
                  </span>
                </span>
                <span style={{ color: TEXT_SOFT }} className="text-sm shrink-0">{timeAgo(new Date(w.started_at))}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
