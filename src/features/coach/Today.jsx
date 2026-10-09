import React from 'react';
import { ChevronRight, CheckCircle2 } from '../../lib/icons';
import { INK, INK_2, PAPER, PAPER_DIM, TEXT_SOFT, PLUM, MOSS } from '../../theme';
import { workoutTitle } from '../move/exerciseLibrary';
import { Avatar, Stat, SectionTitle, StatusDot } from './CoachParts';
import { timeAgo } from './stats';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Today({ firstName, clients, stats, attention, workouts, onOpenClient }) {
  const members = clients.length;
  const active = clients.filter((c) => stats[c.id]?.week.sessions > 0).length;
  const goalsMet = clients.filter((c) => stats[c.id]?.allGoalsMet).length;
  const rpes = clients.map((c) => stats[c.id]?.avgRpe).filter(Boolean);
  const avgEffort = rpes.length ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : '—';
  const byId = Object.fromEntries(clients.map((c) => [c.id, c]));
  const recent = workouts.slice(0, 8);

  return (
    <div>
      <div className="px-1 mb-4">
        <div style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-2xl font-semibold">{greeting()}, {firstName}</div>
        <div style={{ color: TEXT_SOFT }} className="text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Members" value={members} />
        <Stat label="Active this week" value={`${active}/${members}`} color={PLUM} />
        <Stat label="Hit every goal" value={goalsMet} sub="so far this week" color={MOSS} />
        <Stat label="Avg effort" value={avgEffort} sub="last 2 weeks, of 10" />
      </div>

      <SectionTitle right={attention.length > 0 && <span style={{ background: PLUM, color: INK }} className="text-xs font-semibold rounded-full px-2 py-0.5">{attention.length}</span>}>
        Needs attention
      </SectionTitle>
      {attention.length === 0 ? (
        <div style={{ background: INK_2, color: PAPER_DIM }} className="rounded-2xl px-4 py-4 text-sm flex items-center gap-2">
          <CheckCircle2 size={18} color={MOSS} /> All clear. Nobody needs you right now.
        </div>
      ) : (
        <div style={{ background: INK_2 }} className="rounded-2xl overflow-hidden">
          {attention.map((a, i) => (
            <button
              key={`${a.id}-${i}`}
              onClick={() => onOpenClient(a.id)}
              style={{ borderTop: i ? `1px solid color-mix(in srgb, ${TEXT_SOFT} 18%, transparent)` : 'none' }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
            >
              <StatusDot level={a.level} />
              <span className="flex-1 min-w-0">
                <span style={{ color: PAPER }} className="block text-sm font-medium truncate">{a.title}</span>
                <span style={{ color: TEXT_SOFT }} className="block text-sm">{a.text}</span>
              </span>
              <ChevronRight size={16} color={TEXT_SOFT} />
            </button>
          ))}
        </div>
      )}

      <SectionTitle>Recent activity</SectionTitle>
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
