import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Dumbbell, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY } from '../../theme';
import FitnessAssessmentFlow from '../baseline/FitnessAssessmentFlow';

const LIFT_GOAL = 3; // workouts/week — matches Move tab's own weekly tracker for now

function daysBetween(a, b) {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function sameDay(a, b) {
  return a.toDateString() === b.toDateString();
}

export default function BirdseyeTab({ userId, onOpenWorkout }) {
  const [workouts, setWorkouts] = useState([]);
  const [workoutIcons, setWorkoutIcons] = useState({}); // workoutId -> 'resistance' | 'aerobic'
  const [journalCount, setJournalCount] = useState(0);
  const [assessmentDone, setAssessmentDone] = useState(true); // assume done until checked, to avoid a flash
  const [loading, setLoading] = useState(true);
  const [showAssessment, setShowAssessment] = useState(false);
  const [bodyweight, setBodyweight] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: w }, { data: j }, { data: baseline }, { data: profile }, { data: setRows }] = await Promise.all([
        supabase.from('workouts').select('id, started_at, completed_at').not('completed_at', 'is', null).order('started_at', { ascending: false }),
        supabase.from('journal_entries').select('id'),
        supabase.from('baseline_responses').select('fitness_assessment').eq('user_id', userId).maybeSingle(),
        supabase.from('profiles').select('bodyweight_lb').eq('id', userId).maybeSingle(),
        supabase.from('workout_sets').select('workout_id, movement_type').eq('user_id', userId),
      ]);
      setWorkouts(w || []);
      setJournalCount((j || []).length);
      setAssessmentDone(Boolean(baseline?.fitness_assessment && Object.keys(baseline.fitness_assessment).length > 0));
      setBodyweight(profile?.bodyweight_lb != null ? String(profile.bodyweight_lb) : '');

      const icons = {};
      (setRows || []).forEach((s) => {
        if (!icons[s.workout_id]) icons[s.workout_id] = new Set();
        icons[s.workout_id].add(s.movement_type || 'resistance');
      });
      const resolved = {};
      Object.entries(icons).forEach(([id, types]) => {
        resolved[id] = types.size === 1 && types.has('aerobic') ? 'aerobic' : 'resistance';
      });
      setWorkoutIcons(resolved);
      setLoading(false);
    })();
  }, [userId]);

  async function saveBodyweight(value) {
    setSavingWeight(true);
    const numeric = value.trim() === '' ? null : parseFloat(value);
    await supabase.from('profiles').update({ bodyweight_lb: numeric }).eq('id', userId);
    setSavingWeight(false);
  }

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

  const daysSinceLast = workouts.length > 0 ? daysBetween(now, new Date(workouts[0].started_at)) : null;
  const insight = buildInsight({ workoutsThisWeek, daysSinceLast });

  return (
    <div className="max-w-md mx-auto px-4 pb-12 text-center">
      <h1 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-2xl font-medium mb-4">
        Birdseye
      </h1>

      {insight && (
        <div style={{ background: INK_2, borderTop: `2px solid ${LIME}` }} className="rounded-lg px-5 py-4 mb-4">
          <div style={{ color: PAPER }} className="text-sm">{insight}</div>
        </div>
      )}

      {!assessmentDone && (
        <button
          onClick={() => setShowAssessment(true)}
          style={{ background: INK_2, borderTop: `2px solid ${SKY}` }}
          className="w-full rounded-lg px-5 py-4 mb-4 text-center"
        >
          <div style={{ color: SKY }} className="text-sm uppercase tracking-wide mb-1">Optional, recommended</div>
          <div style={{ color: PAPER }} className="text-sm font-medium">Complete your fitness baseline →</div>
          <div style={{ color: TEXT_SOFT }} className="text-sm mt-0.5">Helps Greg help you — takes about 2 minutes.</div>
        </button>
      )}

      <div style={{ background: INK_2, borderTop: `2px solid ${LIME}` }} className="rounded-lg px-5 py-6 mb-4">
        <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-2">This week</div>
        <div className="flex items-center justify-center mb-2">
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

      <WorkoutCalendar workouts={workouts} workoutIcons={workoutIcons} onOpenWorkout={onOpenWorkout} />

      <div style={{ background: INK_2 }} className="rounded-md px-4 py-3 mb-4 mt-4">
        <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-1">Journal entries logged</div>
        <div style={{ color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }} className="text-lg">{journalCount}</div>
      </div>

      <div style={{ background: INK_2 }} className="rounded-md px-4 py-3">
        <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-1">Bodyweight</div>
        <div className="flex items-center justify-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={bodyweight}
            onChange={(e) => setBodyweight(e.target.value)}
            onBlur={(e) => saveBodyweight(e.target.value)}
            placeholder="—"
            style={{ background: INK_3, color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }}
            className="w-20 rounded-md px-2 py-1.5 text-lg text-center outline-none"
          />
          <span style={{ color: TEXT_SOFT }} className="text-sm">lb {savingWeight && '· saving…'}</span>
        </div>
        <div style={{ color: TEXT_SOFT }} className="text-sm mt-1">Used to log bodyweight movements in Move</div>
      </div>

      {showAssessment && (
        <FitnessAssessmentFlow
          userId={userId}
          onClose={() => setShowAssessment(false)}
          onComplete={() => { setShowAssessment(false); setAssessmentDone(true); }}
        />
      )}
    </div>
  );
}

// Light, in-app encouragement — friendly and specific, never guilt-driven.
function buildInsight({ workoutsThisWeek, daysSinceLast }) {
  if (workoutsThisWeek >= LIFT_GOAL) {
    return `Howdy! You hit your goal of ${LIFT_GOAL} workouts this week — nice work. 🎉`;
  }
  if (workoutsThisWeek === LIFT_GOAL - 1) {
    return "Howdy! You're 2/3 of the way to your weekly goal — let's get one more in today or tomorrow!";
  }
  if (daysSinceLast != null && daysSinceLast >= 4) {
    return `Howdy! It's been ${daysSinceLast} days since your last session — do you have time for a 20 min walk today?`;
  }
  if (daysSinceLast == null) {
    return "Howdy! Ready for your first session? Head over to Move whenever you've got a few minutes.";
  }
  return null;
}

function WorkoutCalendar({ workouts, workoutIcons, onOpenWorkout }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  function workoutForDay(day) {
    return workouts.find((w) => sameDay(new Date(w.started_at), day));
  }

  return (
    <div style={{ background: INK_2 }} className="rounded-md px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonthOffset((m) => m - 1)} style={{ color: TEXT_SOFT }} className="p-2 -m-2">
          <ChevronLeft size={16} />
        </button>
        <span style={{ color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm font-medium">
          {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={() => setMonthOffset((m) => m + 1)}
          disabled={monthOffset >= 0}
          style={{ color: monthOffset >= 0 ? INK_3 : TEXT_SOFT }}
          className="p-2 -m-2"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} style={{ color: TEXT_SOFT }} className="text-sm text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const workout = workoutForDay(day);
          const isToday = sameDay(day, now);
          const icon = workout ? workoutIcons[workout.id] : null;
          return (
            <button
              key={i}
              onClick={() => workout && onOpenWorkout && onOpenWorkout(workout.id)}
              disabled={!workout}
              style={{ outline: isToday ? `1px solid ${SKY}` : 'none', outlineOffset: -1 }}
              className="aspect-square rounded-md flex flex-col items-center justify-center gap-0.5"
            >
              <span style={{ color: workout ? PAPER : TEXT_SOFT }} className="text-sm">{day.getDate()}</span>
              {workout && (
                icon === 'aerobic'
                  ? <Activity size={12} color={SKY} />
                  : <Dumbbell size={12} color={LIME} />
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 mt-3">
        <div className="flex items-center gap-1">
          <Dumbbell size={12} color={LIME} />
          <span style={{ color: TEXT_SOFT }} className="text-sm">Lifting</span>
        </div>
        <div className="flex items-center gap-1">
          <Activity size={12} color={SKY} />
          <span style={{ color: TEXT_SOFT }} className="text-sm">Cardio</span>
        </div>
      </div>
    </div>
  );
}
