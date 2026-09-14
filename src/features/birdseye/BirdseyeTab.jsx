import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY } from '../../theme';

const LIFT_GOAL = 3; // workouts/week — matches Move tab's own weekly tracker for now

export default function BirdseyeTab() {
  const [workouts, setWorkouts] = useState([]);
  const [journalCount, setJournalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: w }, { data: j }] = await Promise.all([
        supabase.from('workouts').select('started_at, completed_at').not('completed_at', 'is', null),
        supabase.from('journal_entries').select('id'),
      ]);
      setWorkouts(w || []);
      setJournalCount((j || []).length);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <span style={{ color: TEXT_SOFT }} className="text-sm">Loading…</span>
      </div>
    );
  }

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const workoutsThisWeek = workouts.filter((w) => new Date(w.started_at) >= startOfWeek).length;
  const liftPct = Math.min(100, (workoutsThisWeek / LIFT_GOAL) * 100);

  // Streak: consecutive weeks (including this one) hitting the lift goal.
  let streak = 0;
  for (let i = 0; ; i++) {
    const weekStart = new Date(startOfWeek);
    weekStart.setDate(startOfWeek.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const count = workouts.filter((w) => {
      const d = new Date(w.started_at);
      return d >= weekStart && d < weekEnd;
    }).length;
    if (count >= LIFT_GOAL) streak++;
    else break;
    if (i > 52) break;
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-12">
      <h1 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-2xl font-medium mb-4">
        Birdseye
      </h1>

      <div style={{ background: INK_2, borderTop: `2px solid ${LIME}` }} className="rounded-lg px-5 py-6 mb-4">
        <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-2">This week</div>
        <div className="flex items-end justify-between mb-2">
          <span style={{ color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }} className="text-2xl font-medium">
            {workoutsThisWeek} <span style={{ color: TEXT_SOFT, fontSize: '1rem' }}>/ {LIFT_GOAL} workouts</span>
          </span>
        </div>
        <div style={{ background: INK_3 }} className="h-2 rounded-full overflow-hidden">
          <div style={{ width: `${liftPct}%`, background: LIME }} className="h-full rounded-full transition-all" />
        </div>
        {streak > 0 && (
          <div style={{ color: SKY }} className="text-sm mt-2">
            🔥 {streak} week{streak === 1 ? '' : 's'} in a row hitting your goal
          </div>
        )}
      </div>

      <div style={{ background: INK_2 }} className="rounded-md px-4 py-3">
        <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-1">Journal entries logged</div>
        <div style={{ color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }} className="text-lg">{journalCount}</div>
      </div>
    </div>
  );
}
