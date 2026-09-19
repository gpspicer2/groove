import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Check, Replace, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY, BRICK } from '../../theme';
import { MUSCLE_GROUPS, EXERCISE_LIBRARY, TRAINING_STYLES, STYLE_CONFIG, generateWorkout, suggestNextWeight } from './exerciseLibrary';

function formatMoneyLikeWeight(w) {
  if (w == null || w === '') return null;
  return `${w} lb`;
}

function mapWorkout(row) {
  return {
    id: row.id,
    muscleGroups: row.muscle_groups || [],
    style: row.style || null,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function daysBetween(a, b) {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
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
  const [selectedStyle, setSelectedStyle] = useState('');
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
  // Also reports days since that session, so the suggestion can account
  // for how much time has passed.
  function lastPerformance(exerciseName) {
    const matches = sets
      .filter((s) => s.exerciseName === exerciseName && s.workoutId !== activeWorkoutId)
      .map((s) => {
        const w = workouts.find((wk) => wk.id === s.workoutId);
        return { ...s, startedAt: w?.startedAt || null };
      })
      .filter((s) => s.startedAt)
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    const last = matches[0];
    if (!last) return null;
    return { ...last, daysSince: daysBetween(new Date(), new Date(last.startedAt)) };
  }

  function toggleGroup(group) {
    setSelectedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  }

  async function startWorkout() {
    if (selectedGroups.length === 0 || !selectedStyle) return;
    // Avoid repeating last workout's exact exercise picks where possible.
    const lastWorkout = completedWorkouts[0];
    const recentNames = lastWorkout
      ? sets.filter((s) => s.workoutId === lastWorkout.id).map((s) => s.exerciseName)
      : [];
    const plan = generateWorkout(selectedGroups, selectedStyle, [...new Set(recentNames)]);

    const { data, error } = await supabase
      .from('workouts')
      .insert({ muscle_groups: selectedGroups, style: selectedStyle })
      .select()
      .single();
    if (error) { setLoadError(error.message); return; }
    setWorkouts((prev) => [mapWorkout(data), ...prev]);
    setActiveWorkoutId(data.id);
    setPlanExercises(plan);
    setSelectedGroups([]);
    setSelectedStyle('');
  }

  function replaceExercise(index, next) {
    const ex = planExercises[index];
    setPlanExercises((prev) =>
      prev.map((e, i) => (i === index ? { ...next, muscleGroup: ex.muscleGroup, sets: ex.sets, reps: ex.reps } : e))
    );
  }

  function moveExercise(index, direction) {
    setPlanExercises((prev) => {
      const next = [...prev];
      const swapWith = index + direction;
      if (swapWith < 0 || swapWith >= next.length) return prev;
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return next;
    });
  }

  function addExercise(name, muscleGroup) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const styleConfig = STYLE_CONFIG[activeWorkout?.style] || {};
    const fromLibrary = (EXERCISE_LIBRARY[muscleGroup] || []).find(
      (e) => e.name.toLowerCase() === trimmed.toLowerCase()
    );
    setPlanExercises((prev) => [
      ...prev,
      {
        name: fromLibrary?.name || trimmed,
        muscleGroup,
        sets: styleConfig.sets ?? fromLibrary?.sets ?? 3,
        reps: styleConfig.reps ?? fromLibrary?.reps ?? '10-12',
      },
    ]);
  }

  function removeExercise(index, hasLoggedSets) {
    if (hasLoggedSets && !window.confirm('Remove this exercise? The sets already logged for it will stay in your history, but it will drop off this workout.')) {
      return;
    }
    setPlanExercises((prev) => prev.filter((_, i) => i !== index));
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

      <h1 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-2xl font-medium mb-4 text-center">
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
          onReplace={replaceExercise}
          onMove={moveExercise}
          onAddExercise={addExercise}
          onRemoveExercise={removeExercise}
          onFinish={finishWorkout}
          onDiscard={discardWorkout}
        />
      ) : (
        <StartWorkout
          selectedGroups={selectedGroups}
          onToggleGroup={toggleGroup}
          selectedStyle={selectedStyle}
          onSelectStyle={setSelectedStyle}
          onStart={startWorkout}
        />
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

function StartWorkout({ selectedGroups, onToggleGroup, selectedStyle, onSelectStyle, onStart }) {
  const canStart = selectedGroups.length > 0 && Boolean(selectedStyle);
  return (
    <div style={{ background: INK_2, borderTop: `2px solid ${SKY}` }} className="rounded-lg px-5 py-6 mb-2">
      <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-3 text-center">
        What are you training today?
      </div>
      <div style={{ color: PAPER_DIM }} className="text-sm text-center mb-2">Pick any body parts (multiple OK)</div>
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

      {selectedGroups.length > 0 && (
        <>
          <div style={{ color: PAPER_DIM }} className="text-sm text-center mb-2">Training style</div>
          <div className="space-y-2 mb-5">
            {TRAINING_STYLES.map((style) => {
              const selected = selectedStyle === style;
              return (
                <button
                  key={style}
                  onClick={() => onSelectStyle(style)}
                  style={{ background: selected ? SKY : INK_3, borderLeft: `3px solid ${selected ? SKY : 'transparent'}` }}
                  className="w-full text-left rounded-md px-4 py-2.5"
                >
                  <div style={{ color: selected ? INK : PAPER }} className="text-sm font-medium">{style}</div>
                  <div style={{ color: selected ? INK : TEXT_SOFT }} className="text-sm">{STYLE_CONFIG[style].blurb}</div>
                </button>
              );
            })}
          </div>
        </>
      )}

      <button
        onClick={onStart}
        disabled={!canStart}
        style={{ background: canStart ? SKY : INK_3, color: canStart ? INK : TEXT_SOFT }}
        className="w-full rounded-md py-3 text-sm font-medium"
      >
        Start workout
      </button>
    </div>
  );
}

function ActiveWorkout({ workout, exercises, sets, lastPerformance, onLogSet, onDeleteSet, onReplace, onMove, onAddExercise, onRemoveExercise, onFinish, onDiscard }) {
  const [addingExercise, setAddingExercise] = useState(false);
  const [swapIndex, setSwapIndex] = useState(null);

  return (
    <div className="mb-8">
      <div className="mb-3">
        <div style={{ color: PAPER }} className="text-sm font-medium">
          {workout.muscleGroups.join(' + ')}
        </div>
        {workout.style && (
          <div style={{ color: SKY }} className="text-sm">{workout.style}</div>
        )}
      </div>

      <div className="space-y-3 mb-4">
        {exercises.map((ex, i) => {
          const loggedSets = sets.filter((s) => s.exerciseName === ex.name);
          return (
            <ExerciseCard
              key={`${ex.name}-${i}`}
              exercise={ex}
              style={workout.style}
              loggedSets={loggedSets}
              last={lastPerformance(ex.name)}
              onLogSet={(setNumber, weight, reps) => onLogSet(ex.name, ex.muscleGroup, setNumber, weight, reps)}
              onDeleteSet={onDeleteSet}
              onOpenSwap={() => setSwapIndex(i)}
              onMoveUp={i > 0 ? () => onMove(i, -1) : null}
              onMoveDown={i < exercises.length - 1 ? () => onMove(i, 1) : null}
              onRemove={() => onRemoveExercise(i, loggedSets.length > 0)}
            />
          );
        })}
      </div>

      {addingExercise ? (
        <AddExerciseForm
          muscleGroups={workout.muscleGroups}
          onAdd={(name, group) => { onAddExercise(name, group); setAddingExercise(false); }}
          onCancel={() => setAddingExercise(false)}
        />
      ) : (
        <button
          onClick={() => setAddingExercise(true)}
          style={{ background: INK_2, color: SKY, borderLeft: `3px solid ${SKY}` }}
          className="w-full rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 mb-4"
        >
          <Plus size={14} /> Add exercise
        </button>
      )}

      <button
        onClick={onFinish}
        style={{ background: SKY, color: INK }}
        className="w-full rounded-md py-3 text-sm font-medium flex items-center justify-center gap-1.5 mb-3"
      >
        <Check size={16} /> Finish workout
      </button>

      <button onClick={onDiscard} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2 underline">
        Discard this workout
      </button>

      {swapIndex !== null && (
        <SwapPicker
          exercise={exercises[swapIndex]}
          usedNames={exercises.map((e) => e.name)}
          onPick={(next) => { onReplace(swapIndex, next); setSwapIndex(null); }}
          onClose={() => setSwapIndex(null)}
        />
      )}
    </div>
  );
}

function SwapPicker({ exercise, usedNames, onPick, onClose }) {
  const pool = (EXERCISE_LIBRARY[exercise.muscleGroup] || []).filter(
    (e) => e.name !== exercise.name && !usedNames.includes(e.name)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" />
      <div
        style={{ background: INK_2 }}
        className="relative w-full max-w-md rounded-t-xl px-4 pt-4 pb-6 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div style={{ color: PAPER }} className="text-sm font-medium">Swap "{exercise.name}" for…</div>
          <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-2 -m-2">
            <X size={18} />
          </button>
        </div>
        {pool.length === 0 ? (
          <div style={{ color: TEXT_SOFT }} className="text-sm py-4 text-center">
            No other {exercise.muscleGroup.toLowerCase()} exercises left in the library.
          </div>
        ) : (
          <div className="space-y-1">
            {pool.map((e) => (
              <button
                key={e.name}
                onClick={() => onPick(e)}
                style={{ background: INK_3, color: PAPER }}
                className="w-full text-left rounded-md px-4 py-3 text-sm"
              >
                {e.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AddExerciseForm({ muscleGroups, onAdd, onCancel }) {
  const [group, setGroup] = useState(muscleGroups[0] || MUSCLE_GROUPS[0]);
  const [name, setName] = useState('');

  const libraryOptions = EXERCISE_LIBRARY[group] || [];

  return (
    <div style={{ background: INK_2 }} className="rounded-md px-4 py-3 mb-4">
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-2">Muscle group</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {MUSCLE_GROUPS.map((g) => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            style={{ background: group === g ? SKY : INK_3, color: group === g ? INK : PAPER_DIM }}
            className="px-3 py-1.5 rounded-full text-sm"
          >
            {g}
          </button>
        ))}
      </div>

      <div style={{ color: TEXT_SOFT }} className="text-sm mb-2">Pick from the library, or type your own</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {libraryOptions.map((ex) => (
          <button
            key={ex.name}
            onClick={() => setName(ex.name)}
            style={{ background: name === ex.name ? SKY : INK_3, color: name === ex.name ? INK : PAPER_DIM }}
            className="px-3 py-1.5 rounded-full text-sm"
          >
            {ex.name}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Exercise name"
        style={{ background: INK_3, color: PAPER }}
        className="w-full rounded-md px-3 py-2.5 text-sm outline-none mb-3"
      />

      <div className="flex items-center gap-2">
        <button onClick={onCancel} style={{ color: TEXT_SOFT }} className="text-sm py-2.5 px-3">
          Cancel
        </button>
        <button
          onClick={() => onAdd(name, group)}
          disabled={!name.trim()}
          style={{ background: name.trim() ? SKY : INK_3, color: name.trim() ? INK : TEXT_SOFT }}
          className="flex-1 rounded-md py-2.5 text-sm font-medium"
        >
          Add to workout
        </button>
      </div>
    </div>
  );
}

function formatDaysSince(days) {
  if (days == null) return '';
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 14) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
}

function ExerciseCard({ exercise, style, loggedSets, last, onLogSet, onDeleteSet, onOpenSwap, onMoveUp, onMoveDown, onRemove }) {
  const suggestion = suggestNextWeight(exercise, last, style, last?.daysSince);
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
        <div className="flex items-center gap-0.5">
          <button
            onClick={onMoveUp || undefined}
            disabled={!onMoveUp}
            style={{ color: onMoveUp ? TEXT_SOFT : INK_3 }}
            className="p-2 -m-1"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={onMoveDown || undefined}
            disabled={!onMoveDown}
            style={{ color: onMoveDown ? TEXT_SOFT : INK_3 }}
            className="p-2 -m-1"
          >
            <ChevronDown size={14} />
          </button>
          <button onClick={onOpenSwap} style={{ color: TEXT_SOFT }} className="p-2 -m-1" title="Swap for another exercise">
            <Replace size={14} />
          </button>
          <button onClick={onRemove} style={{ color: TEXT_SOFT }} className="p-2 -m-1">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-2">
        Target: {exercise.sets} sets × {exercise.reps}
        {last && ` · Last time (${formatDaysSince(last.daysSince)}): ${formatMoneyLikeWeight(last.weight) ?? '—'} × ${last.reps ?? '—'}`}
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
