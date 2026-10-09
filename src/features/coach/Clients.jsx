import React, { useState } from 'react';
import { Search, ChevronRight } from '../../lib/icons';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, PLUM, BRICK, AMBER, MOSS } from '../../theme';
import { Avatar, WeekBars, StatusDot } from './CoachParts';
import { COACH_ALERT_DAYS } from '../../lib/activityGap';

const FILTERS = [
  ['all', 'All'],
  ['attention', 'Needs attention'],
  ['quiet', 'Quiet'],
  ['new', 'New'],
];

function memberBadge(c) {
  const s = c.membership_status;
  if (s === 'active' || s === 'trialing') return ['Member', MOSS];
  if (s === 'comped') return ['Comped', PLUM];
  if (s === 'past_due') return ['Past due', BRICK];
  if (s === 'canceled') return ['Canceled', TEXT_SOFT];
  return null;
}

export default function Clients({ clients, stats, attention, onOpenClient }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const attentionIds = new Set(attention.map((a) => a.id));
  const levelFor = (id) => (attention.find((a) => a.id === id)?.level) || null;

  const list = clients.filter((c) => {
    const q = query.trim().toLowerCase();
    if (q && !`${c.full_name || ''} ${c.email || ''}`.toLowerCase().includes(q)) return false;
    const st = stats[c.id];
    if (filter === 'attention') return attentionIds.has(c.id);
    if (filter === 'quiet') return st.daysSince == null || st.daysSince >= COACH_ALERT_DAYS;
    if (filter === 'new') return c.created_at && Date.now() - new Date(c.created_at).getTime() < 14 * 864e5;
    return true;
  });

  return (
    <div>
      <div style={{ background: INK_2 }} className="rounded-2xl flex items-center gap-2 px-4 py-3 mb-3">
        <Search size={16} color={TEXT_SOFT} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members"
          style={{ color: PAPER }}
          className="flex-1 bg-transparent outline-none text-sm"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 -mx-4 px-4" data-no-swipe>
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{ background: filter === key ? PLUM : INK_2, color: filter === key ? INK : PAPER_DIM }}
            className="rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap"
          >
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div style={{ background: INK_2, color: TEXT_SOFT }} className="rounded-2xl px-4 py-6 text-center text-sm">
          {clients.length === 0 ? 'No members yet. Share the app link and they will show up here.' : 'Nobody matches.'}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((c) => {
            const st = stats[c.id];
            const badge = memberBadge(c);
            const level = levelFor(c.id);
            return (
              <button key={c.id} onClick={() => onOpenClient(c.id)} style={{ background: INK_2 }} className="w-full rounded-2xl px-4 py-3.5 text-left">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar client={c} />
                  <span className="flex-1 min-w-0">
                    <span style={{ color: PAPER }} className="flex items-center gap-2 text-base font-semibold">
                      <span className="truncate">{c.full_name || c.email}</span>
                      {level && <StatusDot level={level} />}
                    </span>
                    <span style={{ color: TEXT_SOFT }} className="block text-sm">
                      {st.daysSince == null ? 'No workouts yet' : st.daysSince === 0 ? 'Active today' : `Last active ${st.daysSince}d ago`}
                      {badge && <> · <span style={{ color: badge[1] }}>{badge[0]}</span></>}
                    </span>
                  </span>
                  <ChevronRight size={18} color={TEXT_SOFT} />
                </div>
                <WeekBars client={c} week={st.week} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
