import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Check, Shuffle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY, BRICK } from '../../theme';
import { MUSCLE_GROUPS, EXERCISE_LIBRARY, generateWorkout, suggestNextWeight } from './exerciseLibrary';

function formatMoneyLikeWeight(w) {
  if (w == null || w === '') return null;
  return `${w} lb`;
}

function mapWorkout(row) {
  return {
    id: row.id,
    muscleGroups: row.muscle_groups || [],
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function mapSet(row) {
  return {
    id: row.id,
    workoutId: row.workout_id,
    exerciseName: row.exercise_name,
    muscleGroup: row.muscle_group,
    setNumber: row.set_number,
    weight: row.weight != null ? Number(row.weight) : null,
    reps: row.reps != null ? Number(row.reps) : null,
  };
}

export default function MoveTab() {
  const [workouts, setWorkouts] = useState([]);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [activeWorkoutId, setActiveWorkoutId] = useState(null);
  const [planExercises, setPlanExercises] = useState([]); // [{name, muscleGroup, sets, reps}]
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  const loadData = useCallback(async () => {
    const [workoutRes, setRes] = await Promise.all([
      supabase.from('workouts').select('*').order('started_at', { ascending: false }),
      supabase.from('workout_sets').select('*').order('set_number', { ascending: true }),
    ]);
    if (workoutRes.error || setRes.error) {
      setLoadError("Couldn't load your workouts. Try refreshing the page.");
      return;
    }
    setWorkouts(workoutRes.data.map(mapWorkout));
    setSets(setRes.data.map(mapSet));
  }, []);

  useEffect(() => {
    (async () => {
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  const activeWorkout = workouts.find((w) => w.id === activeWorkoutId) || null;
  const completedWorkouts = workouts.filter((w) => w.completedAt);

  // Most recent logged set for each exercise, across any past workout —
  // shown as "last time" so you can judge whether to push weight up.
  function lastPerformance(exerciseName) {
    const matches = sets
      .filter((s) => s.exerciseName === exerciseName && s.workoutId !== activeWorkoutId)
      .sort((a, b) => b.id.localeCompare(a.id));
    return matches[0] || null;
  }

  function toggleGroup(group) {
    setSelectedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  }

  async function startWorkout() {
    if (selectedGroups.length === 0) return;
    // Avoid repeating last workout's exact exercise picks where possible.
    const lastWorkout = completedWorkouts[0];
    const recentNames = lastWorkout
      ? sets.filter((s) => s.workoutId === lastWorkout.id).map((s) => s.exerciseName)
      : [];
    const plan = generateWorkout(selectedGroups, [...new Set(recentNames)]);

    const { data, error } = await supabase
      .from('workouts')
      .insert({ muscle_groups: selectedGroups })
      .select()
      .single();
    if (error) { setLoadError(error.message); return; }
    setWorkouts((prev) => [mapWorkout(data), ...prev]);
    setActiveWorkoutId(data.id);
    setPlanExercises(plan);
    setSelectedGroups([]);
  }

  function swapExercise(index) {
    const ex = planExercises[index];
    const pool = EXERCISE_LIBRARY[ex.muscleGroup] || [];
    const usedNames = planExercises.map((e) => e.name);
    const options = pool.filter((e) => !usedNames.includes(e.name));
    if (options.length === 0) return;
    const next = options[Math.floor(Math.random() * options.length)];
    setPlanExercises((prev) =>
      prev.map((e, i) => (i === index ? { ...next, muscleGroup: ex.muscleGroup } : e))
    );
  }

  async function logSet(exerciseName, muscleGroup, setNumber, weight, reps) {
    const { data, error } = await supabase
      .from('workout_sets')
      .insert({
        workout_id: activeWorkoutId,
        exercise_name: exerciseName,
        muscle_group: muscleGroup,
        set_number: setNumber,
        weight: weight === '' ? null : parseFloat(weight),
        reps: reps === '' ? null : parseInt(reps, 10),
      })
      .select()
      .single();
    if (error) { setLoadError(error.message); return; }
    setSets((prev) => [...prev, mapSet(data)]);
  }

  async function deleteSet(id) {
    const { error } = await supabase.from('workout_sets').delete().eq('id', id);
    if (error) { setLoadError(error.message); return; }
    setSets((prev) => prev.filter((s) => s.id !== id));
  }

  async function finishWorkout() {
    const { data, error } = await supabase
      .from('workouts')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', activeWorkoutId)
      .select()
      .single();
    if (error) { setLoadError(error.message); return; }
    setWorkouts((prev) => prev.map((w) => (w.id === activeWorkoutId ? mapWorkout(data) : w)));
    setActiveWorkoutId(null);
    setPlanExercises([]);
  }

  async function discardWorkout() {
    if (!window.confirm('Discard this workout? Any sets you logged will be deleted.')) return;
    const { error } = await supabase.from('workouts').delete().eq('id', activeWorkoutId);
    if (error) { setLoadError(error.message); return; }
    setWorkouts((prev) => prev.filter((w) => w.id !== activeWorkoutId));
    setSets((prev) => prev.filter((s) => s.workoutId !== activeWorkoutId));
    setActiveWorkoutId(null);
    setPlanExercises([]);
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <span style={{ color: TEXT_SOFT }} className="text-sm">Loading your workouts…</span>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-12">
      {loadError && (
        <div style={{ background: INK_2, color: BRICK }} className="rounded-md px-4 py-3 mb-4 text-sm">
          {loadError}
        </div>
      )}

      <h1 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-2xl font-medium mb-4">
        Move
      </h1>

      <WeeklyTracker completedWorkouts={completedWorkouts} />

      {activeWorkout ? (
        <ActiveWorkout
          workout={activeWorkout}
          exercises={planExercises}
          sets={sets.filter((s) => s.workoutId === activeWorkout.id)}
          lastPerformance={lastPerformance}
          onLogSet={logSet}
          onDeleteSet={deleteSet}
          onSwap={swapExercise}
          onFinish={finishWorkout}
          onDiscard={discardWorkout}
        />
      ) : (
        <StartWorkout selectedGroups={selectedGroups} onToggleGroup={toggleGroup} onStart={startWorkout} />
      )}

      <div className="mt-8">
        <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-2">History</div>
        {completedWorkouts.length === 0 ? (
          <div style={{ background: INK_2, color: TEXT_SOFT }} className="rounded-md px-4 py-6 text-center text-sm">
            No completed workouts yet — finish one and it'll show up here.
          </div>
        ) : (
          <div className="space-y-2">
            {completedWorkouts.map((w) => {
              const workoutSets = sets.filter((s) => s.workoutId === w.id);
              const exerciseNames = [...new Set(workoutSets.map((s) => s.exerciseName))];
              const expanded = expandedHistoryId === w.id;
              const date = new Date(w.startedAt);
              return (
                <div key={w.id} style={{ background: INK_2, borderLeft: `3px solid ${SKY}` }} className="rounded-md px-4 py-3">
                  <button
                    onClick={() => setExpandedHistoryId(expanded ? null : w.id)}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="text-left">
                      <div style={{ color: PAPER }} className="text-sm font-medium">
                        {w.muscleGroups.join(' + ')}
                      </div>
                      <div style={{ color: TEXT_SOFT }} className="text-sm">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {exerciseNames.length} exercises · {workoutSets.length} sets
                      </div>
                    </div>
                    {expanded ? <ChevronUp size={16} color={TEXT_SOFT} /> : <ChevronDown size={16} color={TEXT_SOFT} />}
                  </button>
                  {expanded && (
                    <div style={{ borderTop: `1px dashed ${INK_3}` }} className="mt-3 pt-3 space-y-2">
                      {exerciseNames.map((name) => {
                        const exSets = workoutSets.filter((s) => s.exerciseName === name);
                        return (
                          <div key={name}>
                            <div style={{ color: PAPER }} className="text-sm mb-0.5">{name}</div>
                            <div style={{ color: TEXT_SOFT }} className="text-sm">
                              {exSets.map((s) => `${s.weight ?? '—'}×${s.reps ?? '—'}`).join(', ')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const WEEK_DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function WeeklyTracker({ completedWorkouts }) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay()); // back up to Sunday

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const trainedDates = new Set(
    completedWorkouts.map((w) => new Date(w.startedAt).toDateString())
  );
  const trainedThisWeek = days.filter((d) => trainedDates.has(d.toDateString())).length;
  const goal = 3;

  return (
    <div style={{ background: INK_2 }} className="rounded-md px-4 py-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide">This week</span>
        <span style={{ color: trainedThisWeek >= goal ? SKY : TEXT_SOFT, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm font-medium">
          {trainedThisWeek} / {goal}
        </span>
      </div>
      <div className="flex justify-center gap-2">
        {days.map((d, i) => {
          const trained = trainedDates.has(d.toDateString());
          const isToday = d.toDateString() === now.toDateString();
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                style={{
                  background: trained ? SKY : INK_3,
                  color: trained ? INK : TEXT_SOFT,
                  outline: isToday ? `1px solid ${SKY}` : 'none',
                  outlineOffset: 2,
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
              >
                {trained ? <Check size={14} /> : WEEK_DAY_LABELS[i]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StartWorkout({ selectedGroups, onToggleGroup, onStart }) {
  return (
    <div style={{ background: INK_2, borderTop: `2px solid ${SKY}` }} className="rounded-lg px-5 py-6 mb-2">
      <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-3 text-center">
        What are you training today?
      </div>
      <div className="flex flex-wrap justify-center gap-2 mb-5">
        {MUSCLE_GROUPS.map((group) => {
          const selected = selectedGroups.includes(group);
          return (
            <button
              key={group}
              onClick={() => onToggleGroup(group)}
              style={{
                background: selected ? SKY : INK_3,
                color: selected ? INK : PAPER_DIM,
              }}
              className="px-3 py-2 rounded-full text-sm font-medium"
            >
              {group}
            </button>
          );
        })}
      </div>
      <button
        onClick={onStart}
        disabled={selectedGroups.length === 0}
        style={{ background: selectedGroups.length ? SKY : INK_3, color: selectedGroups.length ? INK : TEXT_SOFT }}
        className="w-full rounded-md py-3 text-sm font-medium"
      >
        Start workout
      </button>
    </div>
  );
}

function ActiveWorkout({ workout, exercises, sets, lastPerformance, onLogSet, onDeleteSet, onSwap, onFinish, onDiscard }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div style={{ color: PAPER }} className="text-sm font-medium">
          {workout.muscleGroups.join(' + ')}
        </div>
        <button onClick={onDiscard} style={{ color: TEXT_SOFT }} className="text-sm flex items-center gap-1 py-2 -my-2">
          <Trash2 size={14} /> Discard
        </button>
      </div>

      <div className="space-y-3 mb-4">
        {exercises.map((ex, i) => (
          <ExerciseCard
            key={`${ex.name}-${i}`}
            exercise={ex}
            loggedSets={sets.filter((s) => s.exerciseName === ex.name)}
            last={lastPerformance(ex.name)}
            onLogSet={(setNumber, weight, reps) => onLogSet(ex.name, ex.muscleGroup, setNumber, weight, reps)}
            onDeleteSet={onDeleteSet}
            onSwap={() => onSwap(i)}
          />
        ))}
      </div>

      <button
        onClick={onFinish}
        style={{ background: SKY, color: INK }}
        className="w-full rounded-md py-3 text-sm font-medium flex items-center justify-center gap-1.5"
      >
        <Check size={16} /> Finish workout
      </button>
    </div>
  );
}

function ExerciseCard({ exercise, loggedSets, last, onLogSet, onDeleteSet, onSwap }) {
  const suggestion = suggestNextWeight(exercise, last);
  const [weight, setWeight] = useState(suggestion?.weight != null ? String(suggestion.weight) : '');
  const [reps, setReps] = useState('');
  const nextSetNumber = loggedSets.length + 1;

  function handleLog() {
    if (reps === '') return;
    onLogSet(nextSetNumber, weight, reps);
  }

  return (
    <div style={{ background: INK_2, borderLeft: `3px solid ${SKY}` }} className="rounded-md px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <div style={{ color: PAPER }} className="text-sm font-medium">{exercise.name}</div>
        <button onClick={onSwap} style={{ color: TEXT_SOFT }} className="p-2 -m-2">
          <Shuffle size={14} />
        </button>
      </div>
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-2">
        Target: {exercise.sets} sets × {exercise.reps}
        {last && ` · Last time: ${formatMoneyLikeWeight(last.weight) ?? '—'} × ${last.reps ?? '—'}`}
      </div>
      {suggestion && (
        <div style={{ color: SKY }} className="text-sm mb-2">
          Suggested: {formatMoneyLikeWeight(suggestion.weight)} — {suggestion.note}
        </div>
      )}

      {loggedSets.length > 0 && (
        <div className="space-y-1 mb-2">
          {loggedSets.map((s) => (
            <div key={s.id} className="flex items-center justify-between">
              <span style={{ color: PAPER_DIM, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm tabular-nums">
                Set {s.setNumber}: {s.weight ?? '—'} lb × {s.reps ?? '—'}
              </span>
              <button onClick={() => onDeleteSet(s.id)} style={{ color: TEXT_SOFT }} className="p-2 -m-2">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="lb"
          style={{ background: INK_3, color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }}
          className="w-16 rounded-md px-2 py-2 text-sm outline-none"
        />
        <input
          type="number"
          inputMode="numeric"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          placeholder="reps"
          style={{ background: INK_3, color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }}
          className="w-16 rounded-md px-2 py-2 text-sm outline-none"
        />
        <button
          onClick={handleLog}
          disabled={reps === ''}
          style={{ background: reps === '' ? INK_3 : SKY, color: reps === '' ? TEXT_SOFT : INK }}
          className="flex-1 rounded-md py-2 text-sm font-medium flex items-center justify-center gap-1"
        >
          <Plus size={14} /> Log set {nextSetNumber}
        </button>
      </div>
    </div>
  );
}
