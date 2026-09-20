import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Check, Replace, ChevronDown, ChevronUp, Trash2, Link2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Portal from '../../Portal';
import { useAuth } from '../../auth/AuthContext';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY, LIME, BRICK } from '../../theme';
import { MUSCLE_GROUPS, EXERCISE_LIBRARY, FLEXIBILITY_LIBRARY, FLEXIBILITY_ACTIVITIES, MOVEMENT_MODES, AEROBIC_ACTIVITIES_QUICK, LIFESTYLE_ACTIVITIES, TRAINING_STYLES, STYLE_CONFIG, WORKOUT_LOCATIONS, locationEmojis, filterByLocation, generateWorkout, generateFlexibilityPlan, suggestNextWeight } from './exerciseLibrary';
import { startOfWeek, weekDayLabels } from '../../lib/week';
import { MuscleGroupPicker, ActivityPicker } from './MovementTypePicker';

function formatMoneyLikeWeight(w) {
  if (w == null || w === '') return null;
  return `${w} lb`;
}

function mapWorkout(row) {
  return {
    id: row.id,
    muscleGroups: row.muscle_groups || [],
    activities: row.activities || [],
    movementMode: row.movement_mode || null,
    style: row.style || null,
    location: row.location || null,
    programId: row.program_id || null,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    deletedAt: row.deleted_at || null,
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
    movementType: row.movement_type || 'resistance',
    isBodyweight: Boolean(row.is_bodyweight),
    durationSeconds: row.duration_seconds != null ? Number(row.duration_seconds) : null,
    distance: row.distance || null,
  };
}

function totalWeightLifted(workoutSets) {
  return workoutSets
    .filter((s) => s.movementType === 'resistance')
    .reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
}

function formatDuration(seconds) {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Groups planExercises into render units: pairs sharing a supersetId
// become one unit, everything else stands alone. Superset members are
// always kept adjacent by the functions that build/edit the plan.
function groupPlan(exercises) {
  const groups = [];
  let i = 0;
  while (i < exercises.length) {
    const ex = exercises[i];
    if (ex.supersetId && exercises[i + 1]?.supersetId === ex.supersetId) {
      groups.push([{ ...ex, index: i }, { ...exercises[i + 1], index: i + 1 }]);
      i += 2;
    } else {
      groups.push([{ ...ex, index: i }]);
      i += 1;
    }
  }
  return groups;
}

// After a removal, drop any leftover lone supersetId so a former pair
// doesn't render as an orphaned "superset" of one.
function cleanupSupersets(exercises) {
  const counts = {};
  exercises.forEach((e) => { if (e.supersetId) counts[e.supersetId] = (counts[e.supersetId] || 0) + 1; });
  return exercises.map((e) => (e.supersetId && counts[e.supersetId] < 2 ? { ...e, supersetId: null } : e));
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function MoveTab({ deepLinkWorkoutId, onConsumeDeepLink }) {
  const { user, profile, updateProfile } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [movementMode, setMovementMode] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [selectedFlexActivities, setSelectedFlexActivities] = useState([]);
  const [selectedStyle, setSelectedStyle] = useState('');
  const [activeWorkoutId, setActiveWorkoutId] = useState(null);
  const [planExercises, setPlanExercises] = useState([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [addingAerobicToId, setAddingAerobicToId] = useState(null);
  const [bodyweight, setBodyweight] = useState(null);
  const [assignedProgram, setAssignedProgram] = useState(null); // { id, name, exercises: [...] }

  const weekStartDay = profile?.week_start_day || 'sunday';
  const customActivities = profile?.custom_activities || [];

  const loadData = useCallback(async () => {
    const [workoutRes, setRes, profileRes, programRes] = await Promise.all([
      supabase.from('workouts').select('*').order('started_at', { ascending: false }),
      supabase.from('workout_sets').select('*').order('set_number', { ascending: true }),
      user ? supabase.from('profiles').select('bodyweight_lb').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null }),
      user ? supabase.from('programs').select('id, name').eq('client_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (workoutRes.error || setRes.error) {
      setLoadError("Couldn't load your workouts. Try refreshing the page.");
      return;
    }
    setWorkouts(workoutRes.data.map(mapWorkout));
    setSets(setRes.data.map(mapSet));
    setBodyweight(profileRes.data?.bodyweight_lb != null ? Number(profileRes.data.bodyweight_lb) : null);

    if (programRes.data) {
      const { data: exerciseRows } = await supabase
        .from('program_exercises')
        .select('*')
        .eq('program_id', programRes.data.id)
        .order('order_index', { ascending: true });
      setAssignedProgram({
        id: programRes.data.id,
        name: programRes.data.name,
        exercises: (exerciseRows || []).map((r) => ({
          name: r.exercise_name,
          muscleGroup: r.muscle_group,
          sets: r.target_sets,
          reps: r.target_reps,
          type: 'resistance',
          supersetId: null,
        })),
      });
    } else {
      setAssignedProgram(null);
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  const activeWorkout = workouts.find((w) => w.id === activeWorkoutId) || null;
  const completedWorkouts = workouts.filter((w) => w.completedAt && !w.deletedAt);

  useEffect(() => {
    if (!deepLinkWorkoutId || loading) return;
    if (!completedWorkouts.some((w) => w.id === deepLinkWorkoutId)) return;
    setExpandedHistoryId(deepLinkWorkoutId);
    const el = document.getElementById(`history-${deepLinkWorkoutId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onConsumeDeepLink && onConsumeDeepLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkWorkoutId, loading]);

  // Most recent logged set for each exercise, across any past workout —
  // shown as "last time" so you can judge whether to push weight up.
  // Also reports days since that session, so the suggestion can account
  // for how much time has passed.
  function lastPerformance(exerciseName) {
    const matches = sets
      .filter((s) => s.exerciseName === exerciseName && s.workoutId !== activeWorkoutId && s.movementType === 'resistance')
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

  function toggleActivity(activity) {
    setSelectedActivities((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]
    );
  }

  function toggleFlexActivity(activity) {
    setSelectedFlexActivities((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]
    );
  }

  async function addCustomActivity(name) {
    const trimmed = name.trim();
    if (!trimmed || customActivities.includes(trimmed) || LIFESTYLE_ACTIVITIES.includes(trimmed) || FLEXIBILITY_ACTIVITIES.includes(trimmed)) return;
    await updateProfile({ custom_activities: [...customActivities, trimmed] });
    if (movementMode === 'Flexibility') setSelectedFlexActivities((prev) => [...prev, trimmed]);
    else setSelectedActivities((prev) => [...prev, trimmed]);
  }

  async function removeCustomActivity(name) {
    await updateProfile({ custom_activities: customActivities.filter((a) => a !== name) });
    setSelectedActivities((prev) => prev.filter((a) => a !== name));
    setSelectedFlexActivities((prev) => prev.filter((a) => a !== name));
  }

  function selectMode(mode) {
    if (movementMode === mode) {
      setMovementMode('');
      setSelectedGroups([]);
      setSelectedActivities([]);
      setSelectedFlexActivities([]);
      setSelectedStyle('');
      return;
    }
    setMovementMode(mode);
    setSelectedGroups([]);
    setSelectedActivities([]);
    setSelectedFlexActivities([]);
    setSelectedStyle('');
  }

  function canStartMode() {
    if (!movementMode || !selectedLocation) return false;
    if (movementMode === 'Aerobic') return selectedActivities.length > 0;
    if (movementMode === 'Resistance') return selectedGroups.length > 0 && Boolean(selectedStyle);
    if (movementMode === 'Combined') return selectedGroups.length > 0 && selectedActivities.length > 0 && Boolean(selectedStyle);
    if (movementMode === 'Flexibility') return selectedGroups.length > 0 && selectedFlexActivities.length > 0;
    return false;
  }

  async function startWorkout() {
    if (!canStartMode()) return;
    const usesResistance = movementMode === 'Resistance' || movementMode === 'Combined';
    const usesAerobic = movementMode === 'Aerobic' || movementMode === 'Combined';
    const usesFlexibility = movementMode === 'Flexibility';

    let plan = [];
    if (usesResistance) {
      const lastWorkout = completedWorkouts[0];
      const recentNames = lastWorkout
        ? sets.filter((s) => s.workoutId === lastWorkout.id).map((s) => s.exerciseName)
        : [];
      plan = generateWorkout(selectedGroups, selectedStyle, [...new Set(recentNames)], selectedLocation)
        .map((ex) => ({ ...ex, type: 'resistance', supersetId: null }));
    }
    if (usesFlexibility) {
      plan = generateFlexibilityPlan(selectedGroups);
      const flexActivityEntries = selectedFlexActivities.map((name) => ({
        name, muscleGroup: 'Flexibility', type: 'flexibility-activity', supersetId: null, targetNote: '',
      }));
      plan = [...plan, ...flexActivityEntries];
    }
    if (usesAerobic) {
      const activityEntries = selectedActivities.map((name) => ({
        name, muscleGroup: 'Cardio', type: 'aerobic', supersetId: null, targetNote: '',
      }));
      plan = [...plan, ...activityEntries];
    }

    const { data, error } = await supabase
      .from('workouts')
      .insert({
        muscle_groups: usesResistance || usesFlexibility ? selectedGroups : [],
        activities: usesAerobic ? selectedActivities : usesFlexibility ? selectedFlexActivities : [],
        movement_mode: movementMode,
        style: usesResistance ? selectedStyle : null,
        location: selectedLocation,
      })
      .select()
      .single();
    if (error) { setLoadError(error.message); return; }
    setWorkouts((prev) => [mapWorkout(data), ...prev]);
    setActiveWorkoutId(data.id);
    setPlanExercises(plan);
    setSelectedGroups([]);
    setSelectedActivities([]);
    setSelectedFlexActivities([]);
    setSelectedStyle('');
    setSelectedLocation('');
    setMovementMode('');
  }

  // Lets a past resistance (or flexibility) movement pick up aerobic
  // work after the fact, bumping it to Combined so it counts toward
  // both goals — same idea as mid-session mixing, just for history.
  async function addAerobicToHistory(workoutId, name, durationSeconds, distance) {
    const { data, error } = await supabase
      .from('workout_sets')
      .insert({
        workout_id: workoutId,
        exercise_name: name,
        muscle_group: 'Cardio',
        set_number: 1,
        movement_type: 'aerobic',
        duration_seconds: durationSeconds || null,
        distance: distance || null,
      })
      .select()
      .single();
    if (error) { setLoadError(error.message); return; }
    setSets((prev) => [...prev, mapSet(data)]);
    const w = workouts.find((x) => x.id === workoutId);
    if (w && (w.movementMode === 'Resistance' || w.movementMode === 'Flexibility')) {
      const { data: wdata, error: werror } = await supabase.from('workouts').update({ movement_mode: 'Combined' }).eq('id', workoutId).select().single();
      if (!werror) setWorkouts((prev) => prev.map((x) => (x.id === workoutId ? mapWorkout(wdata) : x)));
    }
    setAddingAerobicToId(null);
  }

  async function deleteWorkout(workoutId) {
    if (!window.confirm('Delete this movement? You can restore it later from Birdseye if you change your mind.')) return;
    const { error } = await supabase.from('workouts').update({ deleted_at: new Date().toISOString() }).eq('id', workoutId).select().single();
    if (error) { setLoadError(error.message); return; }
    setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? { ...w, deletedAt: new Date().toISOString() } : w)));
    setExpandedHistoryId((id) => (id === workoutId ? null : id));
  }

  async function startAssignedProgram(location) {
    if (!assignedProgram || !location) return;
    const muscleGroups = [...new Set(assignedProgram.exercises.map((e) => e.muscleGroup))];
    const { data, error } = await supabase
      .from('workouts')
      .insert({ muscle_groups: muscleGroups, location, movement_mode: 'Resistance', program_id: assignedProgram.id })
      .select()
      .single();
    if (error) { setLoadError(error.message); return; }
    setWorkouts((prev) => [mapWorkout(data), ...prev]);
    setActiveWorkoutId(data.id);
    setPlanExercises(assignedProgram.exercises.map((e) => ({ ...e })));
  }

  function replaceExercise(index, next) {
    const ex = planExercises[index];
    setPlanExercises((prev) =>
      prev.map((e, i) => (i === index ? { ...e, name: next.name, sets: ex.sets, reps: ex.reps } : e))
    );
  }

  function moveGroup(groupIndex, direction) {
    setPlanExercises((prev) => {
      const groups = groupPlan(prev).map((g) => g.map(({ index, ...rest }) => rest));
      const swapWith = groupIndex + direction;
      if (swapWith < 0 || swapWith >= groups.length) return prev;
      const next = [...groups];
      [next[groupIndex], next[swapWith]] = [next[swapWith], next[groupIndex]];
      return next.flat();
    });
  }

  // A workout started as one mode can pick up a different kind of
  // movement mid-session (aerobic work added into a resistance day,
  // say) — bump its stored mode to Combined so goal counts and the
  // calendar reflect what actually happened, not just how it started.
  async function upgradeToCombinedIfNeeded(addedType) {
    if (!activeWorkoutId || !activeWorkout) return;
    const mode = activeWorkout.movementMode;
    const needsUpgrade =
      (addedType === 'aerobic' && (mode === 'Resistance' || mode === 'Flexibility')) ||
      (addedType === 'resistance' && (mode === 'Aerobic' || mode === 'Flexibility'));
    if (!needsUpgrade) return;
    const { data, error } = await supabase.from('workouts').update({ movement_mode: 'Combined' }).eq('id', activeWorkoutId).select().single();
    if (error) return;
    setWorkouts((prev) => prev.map((w) => (w.id === activeWorkoutId ? mapWorkout(data) : w)));
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
        type: 'resistance',
        supersetId: null,
        sets: styleConfig.sets ?? fromLibrary?.sets ?? 3,
        reps: styleConfig.reps ?? fromLibrary?.reps ?? '10-12',
      },
    ]);
    upgradeToCombinedIfNeeded('resistance');
  }

  function addSuperset(a, b) {
    const styleConfig = STYLE_CONFIG[activeWorkout?.style] || {};
    const pairId = uid();
    const build = (m) => ({
      name: m.name.trim(),
      muscleGroup: m.muscleGroup,
      type: 'resistance',
      supersetId: pairId,
      sets: styleConfig.sets ?? 3,
      reps: styleConfig.reps ?? '10-12',
    });
    setPlanExercises((prev) => [...prev, build(a), build(b)]);
  }

  function addAerobic(name, targetNote) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPlanExercises((prev) => [
      ...prev,
      { name: trimmed, muscleGroup: 'Cardio', type: 'aerobic', supersetId: null, targetNote: targetNote.trim() },
    ]);
    upgradeToCombinedIfNeeded('aerobic');
  }

  function removeExercise(index, hasLoggedSets) {
    if (hasLoggedSets && !window.confirm('Remove this exercise? The sets already logged for it will stay in your history, but it will drop off this movement.')) {
      return;
    }
    setPlanExercises((prev) => cleanupSupersets(prev.filter((_, i) => i !== index)));
  }

  async function logSet(payload) {
    const { data, error } = await supabase
      .from('workout_sets')
      .insert({
        workout_id: activeWorkoutId,
        exercise_name: payload.exerciseName,
        muscle_group: payload.muscleGroup,
        set_number: payload.setNumber,
        weight: payload.weight,
        reps: payload.reps,
        movement_type: payload.movementType || 'resistance',
        is_bodyweight: Boolean(payload.isBodyweight),
        duration_seconds: payload.durationSeconds ?? null,
        distance: payload.distance ?? null,
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

  async function updateSet(id, fields) {
    const { data, error } = await supabase.from('workout_sets').update(fields).eq('id', id).select().single();
    if (error) { setLoadError(error.message); return; }
    setSets((prev) => prev.map((s) => (s.id === id ? mapSet(data) : s)));
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
    if (!window.confirm('Discard this movement? Any sets you logged will be deleted.')) return;
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
        <span style={{ color: TEXT_SOFT }} className="text-sm">Loading your movement…</span>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-12">
      {loadError && (
        <div style={{ background: INK_2, color: BRICK }} className="rounded-md px-4 py-3 mb-4 text-sm text-center">
          {loadError}
        </div>
      )}

      <h1 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-2xl font-medium mb-4 text-center">
        Move
      </h1>

      <WeeklyTracker completedWorkouts={completedWorkouts} weekStartDay={weekStartDay} />

      {activeWorkout ? (
        <ActiveWorkout
          workout={activeWorkout}
          exercises={planExercises}
          sets={sets.filter((s) => s.workoutId === activeWorkout.id)}
          lastPerformance={lastPerformance}
          bodyweight={bodyweight}
          onLogSet={logSet}
          onDeleteSet={deleteSet}
          onReplace={replaceExercise}
          onMoveGroup={moveGroup}
          onAddExercise={addExercise}
          onAddSuperset={addSuperset}
          onAddAerobic={addAerobic}
          onRemoveExercise={removeExercise}
          onFinish={finishWorkout}
          onDiscard={discardWorkout}
        />
      ) : (
        <StartWorkout
          gender={profile?.gender}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
          movementMode={movementMode}
          onSelectMode={selectMode}
          selectedGroups={selectedGroups}
          onToggleGroup={toggleGroup}
          selectedActivities={selectedActivities}
          onToggleActivity={toggleActivity}
          selectedFlexActivities={selectedFlexActivities}
          onToggleFlexActivity={toggleFlexActivity}
          customActivities={customActivities}
          onAddCustomActivity={addCustomActivity}
          onRemoveCustomActivity={removeCustomActivity}
          selectedStyle={selectedStyle}
          onSelectStyle={setSelectedStyle}
          onStart={startWorkout}
          canStart={canStartMode()}
          assignedProgram={assignedProgram}
          onStartAssignedProgram={startAssignedProgram}
        />
      )}

      <div className="mt-8">
        <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-2 text-center">History</div>
        {completedWorkouts.length === 0 ? (
          <div style={{ background: INK_2, color: TEXT_SOFT }} className="rounded-md px-4 py-6 text-center text-sm">
            No movement logged yet — finish one and it'll show up here.
          </div>
        ) : (
          <div className="space-y-2">
            {completedWorkouts.map((w) => {
              const workoutSets = sets.filter((s) => s.workoutId === w.id);
              const exerciseNames = [...new Set(workoutSets.map((s) => s.exerciseName))];
              const expanded = expandedHistoryId === w.id;
              const editing = editingHistoryId === w.id;
              const date = new Date(w.startedAt);
              const total = totalWeightLifted(workoutSets);
              return (
                <div id={`history-${w.id}`} key={w.id} style={{ background: INK_2, borderLeft: `3px solid ${SKY}` }} className="rounded-md px-4 py-3">
                  <button
                    onClick={() => { setExpandedHistoryId(expanded ? null : w.id); if (expanded) setEditingHistoryId(null); }}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="text-left">
                      <div style={{ color: PAPER }} className="text-sm font-medium">
                        {[...w.muscleGroups, ...w.activities].join(' + ')}{w.location && ` · ${w.location}`}
                      </div>
                      <div style={{ color: TEXT_SOFT }} className="text-sm">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {exerciseNames.length} exercises · {workoutSets.length} sets
                        {total > 0 && ` · ${Math.round(total).toLocaleString()} lb lifted`}
                      </div>
                    </div>
                    {expanded ? <ChevronUp size={16} color={TEXT_SOFT} /> : <ChevronDown size={16} color={TEXT_SOFT} />}
                  </button>
                  {expanded && (
                    <div style={{ borderTop: `1px dashed ${INK_3}` }} className="mt-3 pt-3 space-y-3">
                      {exerciseNames.map((name) => {
                        const exSets = workoutSets.filter((s) => s.exerciseName === name);
                        const isAerobic = exSets[0]?.movementType === 'aerobic';
                        const isFlexibility = exSets[0]?.movementType === 'flexibility';
                        return (
                          <div key={name}>
                            <div style={{ color: PAPER }} className="text-sm mb-1">{name}</div>
                            {editing ? (
                              <div className="space-y-1.5">
                                {exSets.map((s) => (
                                  <div key={s.id} className="flex items-center gap-2 justify-center">
                                    {isAerobic ? (
                                      <span style={{ color: PAPER_DIM }} className="text-sm">
                                        {formatDuration(s.durationSeconds) || '—'}{s.distance ? ` · ${s.distance}` : ''}
                                      </span>
                                    ) : isFlexibility ? (
                                      <span style={{ color: PAPER_DIM }} className="text-sm">
                                        {s.durationSeconds ? `${s.durationSeconds}s` : '—'}
                                      </span>
                                    ) : (
                                      <>
                                        <input
                                          type="number"
                                          defaultValue={s.weight ?? ''}
                                          onBlur={(e) => updateSet(s.id, { weight: e.target.value === '' ? null : parseFloat(e.target.value) })}
                                          style={{ background: INK_3, color: PAPER }}
                                          className="w-14 rounded-md px-2 py-1.5 text-sm outline-none text-center"
                                        />
                                        <span style={{ color: TEXT_SOFT }} className="text-sm">×</span>
                                        <input
                                          type="number"
                                          defaultValue={s.reps ?? ''}
                                          onBlur={(e) => updateSet(s.id, { reps: e.target.value === '' ? null : parseInt(e.target.value, 10) })}
                                          style={{ background: INK_3, color: PAPER }}
                                          className="w-14 rounded-md px-2 py-1.5 text-sm outline-none text-center"
                                        />
                                      </>
                                    )}
                                    <button onClick={() => deleteSet(s.id)} style={{ color: TEXT_SOFT }} className="p-2 -m-1">
                                      <X size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ color: TEXT_SOFT }} className="text-sm text-center">
                                {isAerobic
                                  ? exSets.map((s) => `${formatDuration(s.durationSeconds) || '—'}${s.distance ? ` · ${s.distance}` : ''}`).join(', ')
                                  : isFlexibility
                                  ? exSets.map((s) => (s.durationSeconds ? `${s.durationSeconds}s` : '—')).join(', ')
                                  : exSets.map((s) => `${s.weight ?? '—'}×${s.reps ?? '—'}`).join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {editing && (
                        addingAerobicToId === w.id ? (
                          <AddAerobicToHistoryForm
                            onAdd={(name, durationSeconds, distance) => addAerobicToHistory(w.id, name, durationSeconds, distance)}
                            onCancel={() => setAddingAerobicToId(null)}
                          />
                        ) : (
                          <button
                            onClick={() => setAddingAerobicToId(w.id)}
                            style={{ background: INK_3, color: SKY }}
                            className="w-full rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-1.5"
                          >
                            <Plus size={14} /> Add aerobic work
                          </button>
                        )
                      )}
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() => { setEditingHistoryId(editing ? null : w.id); setAddingAerobicToId(null); }}
                          style={{ color: SKY }}
                          className="text-sm py-2 text-center underline"
                        >
                          {editing ? 'Done editing' : 'Edit this movement'}
                        </button>
                        <button
                          onClick={() => deleteWorkout(w.id)}
                          style={{ color: BRICK }}
                          className="text-sm py-2 text-center underline"
                        >
                          Delete movement
                        </button>
                      </div>
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

function WeeklyTracker({ completedWorkouts, weekStartDay }) {
  const now = new Date();
  const weekStart = startOfWeek(now, weekStartDay);
  const dayLabels = weekDayLabels(weekStartDay);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
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
                {trained ? <Check size={14} /> : dayLabels[i]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StartWorkout({
  gender,
  selectedLocation, onSelectLocation,
  movementMode, onSelectMode,
  selectedGroups, onToggleGroup,
  selectedActivities, onToggleActivity,
  selectedFlexActivities, onToggleFlexActivity,
  customActivities, onAddCustomActivity, onRemoveCustomActivity,
  selectedStyle, onSelectStyle, onStart, canStart,
  assignedProgram, onStartAssignedProgram,
}) {
  const startEmoji = gender === 'Female' ? ' 💃🏻' : gender === 'Male' ? ' 🕺' : '';
  const [skipProgram, setSkipProgram] = useState(false);
  const showProgramOffer = assignedProgram && selectedLocation && !skipProgram;

  const needsGroups = movementMode === 'Resistance' || movementMode === 'Combined' || movementMode === 'Flexibility';
  const needsActivities = movementMode === 'Aerobic' || movementMode === 'Combined';
  const needsFlexActivities = movementMode === 'Flexibility';
  const needsStyle = movementMode === 'Resistance' || movementMode === 'Combined';

  return (
    <div style={{ background: INK_2, borderTop: `2px solid ${SKY}` }} className="rounded-lg px-5 py-6 mb-2">
      <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-3 text-center">
        Where are you getting your movement in today?
      </div>
      <div className="space-y-2 mb-5">
        {WORKOUT_LOCATIONS.map((loc) => {
          const selected = selectedLocation === loc;
          const [left, right] = locationEmojis(loc, gender);
          return (
            <button
              key={loc}
              onClick={() => onSelectLocation(loc)}
              style={{ background: selected ? SKY : INK_3, borderLeft: `3px solid ${selected ? SKY : 'transparent'}` }}
              className="w-full text-center rounded-md px-4 py-2.5 text-sm font-medium"
            >
              <span style={{ color: selected ? INK : PAPER }}>{left} {loc} {right}</span>
            </button>
          );
        })}
      </div>

      {showProgramOffer && (
        <div style={{ background: INK_3, borderLeft: `3px solid ${LIME}` }} className="rounded-md px-4 py-3 mb-5 text-center">
          <div style={{ color: LIME }} className="text-sm uppercase tracking-wide mb-1">Your coach assigned</div>
          <div style={{ color: PAPER }} className="text-sm font-medium mb-3">{assignedProgram.name}</div>
          <button
            onClick={() => onStartAssignedProgram(selectedLocation)}
            style={{ background: LIME, color: INK }}
            className="w-full rounded-md py-2.5 text-sm font-medium mb-2"
          >
            Start assigned plan
          </button>
          <button onClick={() => setSkipProgram(true)} style={{ color: TEXT_SOFT }} className="w-full text-sm py-1 underline">
            Build my own instead
          </button>
        </div>
      )}

      {selectedLocation && !showProgramOffer && (
        <>
          <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-3 text-center">
            Select Movement Mode
          </div>
          <div className="space-y-2 mb-5">
            {MOVEMENT_MODES.map((mode) => {
              const selected = movementMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => onSelectMode(mode)}
                  style={{ background: selected ? SKY : INK_3, borderLeft: `3px solid ${selected ? SKY : 'transparent'}` }}
                  className="w-full text-center rounded-md px-4 py-2.5 text-sm font-medium"
                >
                  <span style={{ color: selected ? INK : PAPER }}>{mode}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {selectedLocation && !showProgramOffer && needsActivities && (
        <>
          <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-3 text-center">
            Select Aerobic Activity
          </div>
          <ActivityPicker
            selectedActivities={selectedActivities}
            onToggleActivity={onToggleActivity}
            customActivities={customActivities}
            onAddCustomActivity={onAddCustomActivity}
            onRemoveCustomActivity={onRemoveCustomActivity}
          />
        </>
      )}

      {selectedLocation && !showProgramOffer && needsFlexActivities && (
        <>
          <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-3 text-center">
            Select Flexibility Activity
          </div>
          <ActivityPicker
            baseActivities={FLEXIBILITY_ACTIVITIES}
            selectedActivities={selectedFlexActivities}
            onToggleActivity={onToggleFlexActivity}
            customActivities={customActivities}
            onAddCustomActivity={onAddCustomActivity}
            onRemoveCustomActivity={onRemoveCustomActivity}
          />
        </>
      )}

      {selectedLocation && !showProgramOffer && needsGroups && (
        <>
          <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-3 text-center mt-2">
            Select Targeted Muscle Groups
          </div>
          <MuscleGroupPicker selectedGroups={selectedGroups} onToggleGroup={onToggleGroup} />
        </>
      )}

      {selectedLocation && needsStyle && (
        <>
          <div style={{ color: PAPER_DIM }} className="text-sm text-center mb-2 mt-3">Training style</div>
          <div className="space-y-2 mb-5">
            {TRAINING_STYLES.map((style) => {
              const selected = selectedStyle === style;
              return (
                <button
                  key={style}
                  onClick={() => onSelectStyle(style)}
                  style={{ background: selected ? SKY : INK_3, borderLeft: `3px solid ${selected ? SKY : 'transparent'}` }}
                  className="w-full text-center rounded-md px-4 py-2.5"
                >
                  <div style={{ color: selected ? INK : PAPER }} className="text-sm font-medium">{style}</div>
                  <div style={{ color: selected ? INK : TEXT_SOFT }} className="text-sm">{STYLE_CONFIG[style].blurb}</div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {!showProgramOffer && (
        <button
          onClick={onStart}
          disabled={!canStart}
          style={{ background: canStart ? SKY : INK_3, color: canStart ? INK : TEXT_SOFT }}
          className="w-full rounded-md py-3 text-sm font-medium mt-2"
        >
          🪩 Start Movement{startEmoji}
        </button>
      )}
    </div>
  );
}

function ActiveWorkout({
  workout, exercises, sets, lastPerformance, bodyweight,
  onLogSet, onDeleteSet, onReplace, onMoveGroup,
  onAddExercise, onAddSuperset, onAddAerobic, onRemoveExercise, onFinish, onDiscard,
}) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [addMode, setAddMode] = useState(null); // 'resistance' | 'superset' | 'aerobic'
  const [swapIndex, setSwapIndex] = useState(null);
  const [restRemaining, setRestRemaining] = useState(null);
  const [restTotal, setRestTotal] = useState(0);

  const groups = groupPlan(exercises);
  const total = Math.round(totalWeightLifted(sets));

  function closeAddForm() {
    setAddMenuOpen(false);
    setAddMode(null);
  }

  function startRest() {
    const seconds = STYLE_CONFIG[workout.style]?.restSeconds || 90;
    setRestTotal(seconds);
    setRestRemaining(seconds);
  }

  useEffect(() => {
    if (restRemaining == null) return;
    if (restRemaining <= 0) { setRestRemaining(null); return; }
    const t = setTimeout(() => setRestRemaining((r) => (r == null ? null : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [restRemaining]);

  function handleResistanceLog(payload) {
    onLogSet(payload);
    startRest();
  }

  return (
    <div className="mb-8">
      <div className="mb-3 text-center">
        <div style={{ color: PAPER }} className="text-sm font-medium">
          {[...workout.muscleGroups, ...workout.activities].join(' + ')}
        </div>
        {(workout.style || workout.location) && (
          <div style={{ color: SKY }} className="text-sm">
            {[workout.style, workout.location].filter(Boolean).join(' · ')}
          </div>
        )}
        {total > 0 && (
          <div style={{ color: TEXT_SOFT }} className="text-sm mt-0.5">{total.toLocaleString()} lb lifted so far</div>
        )}
      </div>

      <div className="space-y-3 mb-4">
        {groups.map((group, gi) => {
          if (group.length === 2) {
            return (
              <SupersetCard
                key={`superset-${group[0].index}`}
                members={group}
                style={workout.style}
                bodyweight={bodyweight}
                sets={sets}
                lastPerformance={lastPerformance}
                onLogSet={handleResistanceLog}
                onDeleteSet={onDeleteSet}
                onOpenSwap={setSwapIndex}
                onMoveUp={gi > 0 ? () => onMoveGroup(gi, -1) : null}
                onMoveDown={gi < groups.length - 1 ? () => onMoveGroup(gi, 1) : null}
                onRemove={(index, hasLoggedSets) => onRemoveExercise(index, hasLoggedSets)}
              />
            );
          }
          const ex = group[0];
          const loggedSets = sets.filter((s) => s.exerciseName === ex.name);
          if (ex.type === 'aerobic' || ex.type === 'flexibility-activity') {
            return (
              <AerobicCard
                key={`aerobic-${ex.index}`}
                exercise={ex}
                movementType={ex.type === 'flexibility-activity' ? 'flexibility' : 'aerobic'}
                loggedSets={loggedSets}
                onLogSet={onLogSet}
                onDeleteSet={onDeleteSet}
                onMoveUp={gi > 0 ? () => onMoveGroup(gi, -1) : null}
                onMoveDown={gi < groups.length - 1 ? () => onMoveGroup(gi, 1) : null}
                onRemove={() => onRemoveExercise(ex.index, loggedSets.length > 0)}
              />
            );
          }
          if (ex.type === 'flexibility') {
            return (
              <FlexibilityCard
                key={`flex-${ex.index}`}
                exercise={ex}
                loggedSets={loggedSets}
                onLogSet={onLogSet}
                onDeleteSet={onDeleteSet}
                onMoveUp={gi > 0 ? () => onMoveGroup(gi, -1) : null}
                onMoveDown={gi < groups.length - 1 ? () => onMoveGroup(gi, 1) : null}
                onRemove={() => onRemoveExercise(ex.index, loggedSets.length > 0)}
              />
            );
          }
          return (
            <ExerciseCard
              key={`ex-${ex.index}`}
              exercise={ex}
              style={workout.style}
              bodyweight={bodyweight}
              loggedSets={loggedSets}
              last={lastPerformance(ex.name)}
              onLogSet={(payload) => handleResistanceLog({ ...payload, exerciseName: ex.name, muscleGroup: ex.muscleGroup })}
              onDeleteSet={onDeleteSet}
              onOpenSwap={() => setSwapIndex(ex.index)}
              onMoveUp={gi > 0 ? () => onMoveGroup(gi, -1) : null}
              onMoveDown={gi < groups.length - 1 ? () => onMoveGroup(gi, 1) : null}
              onRemove={() => onRemoveExercise(ex.index, loggedSets.length > 0)}
            />
          );
        })}
      </div>

      {restRemaining != null && (
        <div style={{ background: INK_2, borderLeft: `3px solid ${LIME}` }} className="rounded-md px-4 py-2.5 mb-4 flex items-center gap-3">
          <span style={{ color: LIME, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm font-medium tabular-nums">
            Rest {Math.floor(restRemaining / 60)}:{String(restRemaining % 60).padStart(2, '0')}
          </span>
          <div style={{ background: INK_3 }} className="flex-1 h-1.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${(restRemaining / restTotal) * 100}%`, background: LIME }}
              className="h-full rounded-full transition-all"
            />
          </div>
          <button onClick={() => setRestRemaining(null)} style={{ color: TEXT_SOFT }} className="p-1 -m-1">
            <X size={14} />
          </button>
        </div>
      )}

      {addMenuOpen ? (
        addMode === null ? (
          <div style={{ background: INK_2 }} className="rounded-md px-4 py-3 mb-4">
            <div style={{ color: TEXT_SOFT }} className="text-sm mb-2 text-center">Add what kind of movement?</div>
            <div className="space-y-2">
              <button onClick={() => setAddMode('resistance')} style={{ background: INK_3, color: PAPER }} className="w-full rounded-md py-2.5 text-sm font-medium">
                Resistance
              </button>
              <button onClick={() => setAddMode('superset')} style={{ background: INK_3, color: PAPER }} className="w-full rounded-md py-2.5 text-sm font-medium">
                Superset (two paired movements)
              </button>
              <button onClick={() => setAddMode('aerobic')} style={{ background: INK_3, color: PAPER }} className="w-full rounded-md py-2.5 text-sm font-medium">
                Aerobic / cardio
              </button>
              <button onClick={closeAddForm} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2">
                Cancel
              </button>
            </div>
          </div>
        ) : addMode === 'resistance' ? (
          <AddExerciseForm
            muscleGroups={workout.muscleGroups}
            location={workout.location}
            onAdd={(name, group) => { onAddExercise(name, group); closeAddForm(); }}
            onCancel={closeAddForm}
          />
        ) : addMode === 'superset' ? (
          <AddSupersetForm
            muscleGroups={workout.muscleGroups}
            location={workout.location}
            onAdd={(a, b) => { onAddSuperset(a, b); closeAddForm(); }}
            onCancel={closeAddForm}
          />
        ) : (
          <AddAerobicForm
            onAdd={(name, note) => { onAddAerobic(name, note); closeAddForm(); }}
            onCancel={closeAddForm}
          />
        )
      ) : (
        <button
          onClick={() => setAddMenuOpen(true)}
          style={{ background: INK_2, color: SKY, borderLeft: `3px solid ${SKY}` }}
          className="w-full rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 mb-4"
        >
          <Plus size={14} /> Add movement
        </button>
      )}

      <button
        onClick={onFinish}
        style={{ background: SKY, color: INK }}
        className="w-full rounded-md py-3 text-sm font-medium flex items-center justify-center gap-1.5 mb-3"
      >
        <Check size={16} /> Finish Movement
      </button>

      <button onClick={onDiscard} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2 underline text-center">
        Discard this movement
      </button>

      {swapIndex !== null && (
        <SwapPicker
          exercise={exercises[swapIndex]}
          usedNames={exercises.map((e) => e.name)}
          location={workout.location}
          onPick={(next) => { onReplace(swapIndex, next); setSwapIndex(null); }}
          onClose={() => setSwapIndex(null)}
        />
      )}
    </div>
  );
}

function SwapPicker({ exercise, usedNames, location, onPick, onClose }) {
  const pool = filterByLocation(EXERCISE_LIBRARY[exercise.muscleGroup] || [], location).filter(
    (e) => e.name !== exercise.name && !usedNames.includes(e.name)
  );

  return (
    <Portal>
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
                className="w-full text-center rounded-md px-4 py-3 text-sm"
              >
                {e.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
    </Portal>
  );
}

function MovementPicker({ label, group, setGroup, name, setName, location }) {
  const libraryOptions = filterByLocation(EXERCISE_LIBRARY[group] || [], location);
  return (
    <div className="mb-3">
      {label && <div style={{ color: SKY }} className="text-sm mb-2 text-center">{label}</div>}
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-2 text-center">Muscle group</div>
      <div className="flex flex-wrap justify-center gap-2 mb-3">
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
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-2 text-center">Pick from the library, or type your own</div>
      <div className="flex flex-wrap justify-center gap-2 mb-3">
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
        className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center"
      />
    </div>
  );
}

function AddExerciseForm({ muscleGroups, location, onAdd, onCancel }) {
  const [group, setGroup] = useState(muscleGroups[0] || MUSCLE_GROUPS[0]);
  const [name, setName] = useState('');

  return (
    <div style={{ background: INK_2 }} className="rounded-md px-4 py-3 mb-4">
      <MovementPicker group={group} setGroup={setGroup} name={name} setName={setName} location={location} />
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
          Add to movement
        </button>
      </div>
    </div>
  );
}

function AddSupersetForm({ muscleGroups, location, onAdd, onCancel }) {
  const [groupA, setGroupA] = useState(muscleGroups[0] || MUSCLE_GROUPS[0]);
  const [nameA, setNameA] = useState('');
  const [groupB, setGroupB] = useState(muscleGroups[1] || muscleGroups[0] || MUSCLE_GROUPS[0]);
  const [nameB, setNameB] = useState('');
  const canAdd = nameA.trim() && nameB.trim();

  return (
    <div style={{ background: INK_2 }} className="rounded-md px-4 py-3 mb-4">
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-3 text-center">
        Paired movements, done back-to-back with no rest between them.
      </div>
      <MovementPicker label="Movement 1" group={groupA} setGroup={setGroupA} name={nameA} setName={setNameA} location={location} />
      <div style={{ borderTop: `1px dashed ${INK_3}` }} className="pt-3">
        <MovementPicker label="Movement 2" group={groupB} setGroup={setGroupB} name={nameB} setName={setNameB} location={location} />
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onCancel} style={{ color: TEXT_SOFT }} className="text-sm py-2.5 px-3">
          Cancel
        </button>
        <button
          onClick={() => onAdd({ name: nameA, muscleGroup: groupA }, { name: nameB, muscleGroup: groupB })}
          disabled={!canAdd}
          style={{ background: canAdd ? SKY : INK_3, color: canAdd ? INK : TEXT_SOFT }}
          className="flex-1 rounded-md py-2.5 text-sm font-medium"
        >
          Add superset
        </button>
      </div>
    </div>
  );
}

function AddAerobicToHistoryForm({ onAdd, onCancel }) {
  const [name, setName] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [distance, setDistance] = useState('');

  function handleAdd() {
    const durationSeconds = (parseInt(minutes, 10) || 0) * 60 + (parseInt(seconds, 10) || 0);
    onAdd(name.trim(), durationSeconds || null, distance.trim() || null);
  }

  return (
    <div style={{ background: INK_3 }} className="rounded-md px-3 py-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Activity name"
        style={{ background: INK_2, color: PAPER }}
        className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center mb-2"
      />
      <div className="flex items-center justify-center gap-2 flex-wrap mb-2">
        <input
          type="number"
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="min"
          style={{ background: INK_2, color: PAPER }}
          className="w-16 rounded-md px-2 py-2 text-sm outline-none text-center"
        />
        <input
          type="number"
          inputMode="numeric"
          value={seconds}
          onChange={(e) => setSeconds(e.target.value)}
          placeholder="sec"
          style={{ background: INK_2, color: PAPER }}
          className="w-16 rounded-md px-2 py-2 text-sm outline-none text-center"
        />
        <input
          type="text"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          placeholder="distance (optional)"
          style={{ background: INK_2, color: PAPER }}
          className="flex-1 min-w-[7rem] rounded-md px-2 py-2 text-sm outline-none text-center"
        />
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onCancel} style={{ color: TEXT_SOFT }} className="text-sm py-2.5 px-3">
          Cancel
        </button>
        <button
          onClick={handleAdd}
          disabled={!name.trim()}
          style={{ background: name.trim() ? SKY : INK_2, color: name.trim() ? INK : TEXT_SOFT }}
          className="flex-1 rounded-md py-2.5 text-sm font-medium"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function AddAerobicForm({ onAdd, onCancel }) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');

  return (
    <div style={{ background: INK_2 }} className="rounded-md px-4 py-3 mb-4">
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-2 text-center">Pick an activity, or type your own</div>
      <div className="flex flex-wrap justify-center gap-2 mb-3">
        {AEROBIC_ACTIVITIES_QUICK.map((a) => (
          <button
            key={a}
            onClick={() => setName(a)}
            style={{ background: name === a ? SKY : INK_3, color: name === a ? INK : PAPER_DIM }}
            className="px-3 py-1.5 rounded-full text-sm"
          >
            {a}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Activity name"
        style={{ background: INK_3, color: PAPER }}
        className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center mb-3"
      />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Target, optional (e.g. 10 min @ moderate pace)"
        style={{ background: INK_3, color: PAPER }}
        className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center mb-3"
      />
      <div className="flex items-center gap-2">
        <button onClick={onCancel} style={{ color: TEXT_SOFT }} className="text-sm py-2.5 px-3">
          Cancel
        </button>
        <button
          onClick={() => onAdd(name, note)}
          disabled={!name.trim()}
          style={{ background: name.trim() ? SKY : INK_3, color: name.trim() ? INK : TEXT_SOFT }}
          className="flex-1 rounded-md py-2.5 text-sm font-medium"
        >
          Add to movement
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

function CardHeader({ title, onMoveUp, onMoveDown, onOpenSwap, onRemove }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <div style={{ color: PAPER }} className="text-sm font-medium">{title}</div>
      <div className="flex items-center gap-0.5">
        <button onClick={onMoveUp || undefined} disabled={!onMoveUp} style={{ color: onMoveUp ? TEXT_SOFT : INK_3 }} className="p-2 -m-1">
          <ChevronUp size={14} />
        </button>
        <button onClick={onMoveDown || undefined} disabled={!onMoveDown} style={{ color: onMoveDown ? TEXT_SOFT : INK_3 }} className="p-2 -m-1">
          <ChevronDown size={14} />
        </button>
        {onOpenSwap && (
          <button onClick={onOpenSwap} style={{ color: TEXT_SOFT }} className="p-2 -m-1" title="Swap for another exercise">
            <Replace size={14} />
          </button>
        )}
        <button onClick={onRemove} style={{ color: TEXT_SOFT }} className="p-2 -m-1">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function WeightRepsInput({ exercise, style, bodyweight, last, onLog, nextSetNumber }) {
  const suggestion = suggestNextWeight(exercise, last, style, last?.daysSince);
  const [useBodyweight, setUseBodyweight] = useState(false);
  const [weight, setWeight] = useState(suggestion?.weight != null ? String(suggestion.weight) : '');
  const [reps, setReps] = useState('');

  function handleLog() {
    if (reps === '') return;
    if (useBodyweight) {
      const added = weight === '' ? 0 : parseFloat(weight);
      onLog({ setNumber: nextSetNumber, weight: (bodyweight || 0) + added, reps: parseInt(reps, 10), isBodyweight: true });
    } else {
      onLog({ setNumber: nextSetNumber, weight: weight === '' ? null : parseFloat(weight), reps: parseInt(reps, 10), isBodyweight: false });
    }
    setReps('');
  }

  return (
    <>
      {last && (
        <div style={{ color: TEXT_SOFT }} className="text-sm mb-2 text-center">
          Last time ({formatDaysSince(last.daysSince)}): {last.isBodyweight ? 'BW' : ''}{formatMoneyLikeWeight(last.weight) ?? '—'} × {last.reps ?? '—'}
        </div>
      )}
      {suggestion && (
        <div style={{ color: SKY }} className="text-sm mb-2 text-center">
          Suggested: {formatMoneyLikeWeight(suggestion.weight)} — {suggestion.note}
        </div>
      )}
      {bodyweight != null && (
        <button
          onClick={() => setUseBodyweight((v) => !v)}
          style={{ color: useBodyweight ? LIME : TEXT_SOFT }}
          className="text-sm mb-2 flex items-center gap-1 mx-auto"
        >
          <Check size={12} style={{ opacity: useBodyweight ? 1 : 0.25 }} /> Use bodyweight ({bodyweight} lb)
        </button>
      )}
      <div className="flex items-center justify-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder={useBodyweight ? '+lb' : 'lb'}
          style={{ background: INK_3, color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }}
          className="w-16 rounded-md px-2 py-2 text-sm outline-none text-center"
        />
        <input
          type="number"
          inputMode="numeric"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          placeholder="reps"
          style={{ background: INK_3, color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }}
          className="w-16 rounded-md px-2 py-2 text-sm outline-none text-center"
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
    </>
  );
}

function ExerciseCard({ exercise, style, bodyweight, loggedSets, last, onLogSet, onDeleteSet, onOpenSwap, onMoveUp, onMoveDown, onRemove }) {
  const nextSetNumber = loggedSets.length + 1;

  return (
    <div style={{ background: INK_2, borderLeft: `3px solid ${SKY}` }} className="rounded-md px-4 py-3">
      <CardHeader title={exercise.name} onMoveUp={onMoveUp} onMoveDown={onMoveDown} onOpenSwap={onOpenSwap} onRemove={onRemove} />
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-2 text-center">
        Target: {exercise.sets} sets × {exercise.reps}
      </div>

      {loggedSets.length > 0 && (
        <div className="space-y-1 mb-2">
          {loggedSets.map((s) => (
            <div key={s.id} className="flex items-center justify-center gap-2">
              <span style={{ color: PAPER_DIM, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm tabular-nums">
                Set {s.setNumber}: {s.isBodyweight ? 'BW ' : ''}{s.weight ?? '—'} lb × {s.reps ?? '—'}
              </span>
              <button onClick={() => onDeleteSet(s.id)} style={{ color: TEXT_SOFT }} className="p-2 -m-2">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <WeightRepsInput exercise={exercise} style={style} bodyweight={bodyweight} last={last} onLog={onLogSet} nextSetNumber={nextSetNumber} />
    </div>
  );
}

function SupersetCard({ members, style, bodyweight, sets, lastPerformance, onLogSet, onDeleteSet, onOpenSwap, onMoveUp, onMoveDown, onRemove }) {
  return (
    <div style={{ background: INK_2, borderLeft: `3px solid ${LIME}` }} className="rounded-md px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 mx-auto">
          <Link2 size={12} color={LIME} />
          <span style={{ color: LIME }} className="text-sm uppercase tracking-wide">Superset</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={onMoveUp || undefined} disabled={!onMoveUp} style={{ color: onMoveUp ? TEXT_SOFT : INK_3 }} className="p-2 -m-1">
            <ChevronUp size={14} />
          </button>
          <button onClick={onMoveDown || undefined} disabled={!onMoveDown} style={{ color: onMoveDown ? TEXT_SOFT : INK_3 }} className="p-2 -m-1">
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {members.map((ex) => {
          const loggedSets = sets.filter((s) => s.exerciseName === ex.name);
          return (
            <div key={ex.index} style={{ borderTop: `1px dashed ${INK_3}` }} className="pt-3 first:border-0 first:pt-0">
              <div className="flex items-center justify-between mb-1">
                <div style={{ color: PAPER }} className="text-sm font-medium mx-auto">{ex.name}</div>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => onOpenSwap(ex.index)} style={{ color: TEXT_SOFT }} className="p-2 -m-1" title="Swap for another exercise">
                    <Replace size={14} />
                  </button>
                  <button onClick={() => onRemove(ex.index, loggedSets.length > 0)} style={{ color: TEXT_SOFT }} className="p-2 -m-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div style={{ color: TEXT_SOFT }} className="text-sm mb-2 text-center">
                Target: {ex.sets} sets × {ex.reps}
              </div>
              {loggedSets.length > 0 && (
                <div className="space-y-1 mb-2">
                  {loggedSets.map((s) => (
                    <div key={s.id} className="flex items-center justify-center gap-2">
                      <span style={{ color: PAPER_DIM, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm tabular-nums">
                        Round {s.setNumber}: {s.isBodyweight ? 'BW ' : ''}{s.weight ?? '—'} lb × {s.reps ?? '—'}
                      </span>
                      <button onClick={() => onDeleteSet(s.id)} style={{ color: TEXT_SOFT }} className="p-2 -m-2">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <WeightRepsInput
                exercise={ex}
                style={style}
                bodyweight={bodyweight}
                last={lastPerformance(ex.name)}
                onLog={(payload) => onLogSet({ ...payload, exerciseName: ex.name, muscleGroup: ex.muscleGroup })}
                nextSetNumber={loggedSets.length + 1}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AerobicCard({ exercise, movementType = 'aerobic', loggedSets, onLogSet, onDeleteSet, onMoveUp, onMoveDown, onRemove }) {
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [distance, setDistance] = useState('');

  function handleLog() {
    const durationSeconds = (minutes === '' ? 0 : parseInt(minutes, 10) * 60) + (seconds === '' ? 0 : parseInt(seconds, 10));
    if (durationSeconds === 0 && !distance.trim()) return;
    onLogSet({
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup || 'Cardio',
      setNumber: loggedSets.length + 1,
      movementType,
      weight: null,
      reps: null,
      durationSeconds: durationSeconds || null,
      distance: distance.trim() || null,
    });
    setMinutes('');
    setSeconds('');
    setDistance('');
  }

  return (
    <div style={{ background: INK_2, borderLeft: `3px solid ${LIME}` }} className="rounded-md px-4 py-3">
      <CardHeader title={exercise.name} onMoveUp={onMoveUp} onMoveDown={onMoveDown} onRemove={onRemove} />
      {exercise.targetNote && (
        <div style={{ color: TEXT_SOFT }} className="text-sm mb-2 text-center">Target: {exercise.targetNote}</div>
      )}

      {loggedSets.length > 0 && (
        <div className="space-y-1 mb-2">
          {loggedSets.map((s) => (
            <div key={s.id} className="flex items-center justify-center gap-2">
              <span style={{ color: PAPER_DIM, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm tabular-nums">
                {formatDuration(s.durationSeconds) || '—'}{s.distance ? ` · ${s.distance}` : ''}
              </span>
              <button onClick={() => onDeleteSet(s.id)} style={{ color: TEXT_SOFT }} className="p-2 -m-2">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-2 flex-wrap">
        <input
          type="number"
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="min"
          style={{ background: INK_3, color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }}
          className="w-14 rounded-md px-2 py-2 text-sm outline-none text-center"
        />
        <input
          type="number"
          inputMode="numeric"
          value={seconds}
          onChange={(e) => setSeconds(e.target.value)}
          placeholder="sec"
          style={{ background: INK_3, color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }}
          className="w-14 rounded-md px-2 py-2 text-sm outline-none text-center"
        />
        <input
          type="text"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          placeholder="distance (optional)"
          style={{ background: INK_3, color: PAPER }}
          className="flex-1 min-w-[7rem] rounded-md px-2 py-2 text-sm outline-none text-center"
        />
      </div>
      <button
        onClick={handleLog}
        style={{ background: SKY, color: INK }}
        className="w-full rounded-md py-2 text-sm font-medium flex items-center justify-center gap-1 mt-2"
      >
        <Plus size={14} /> Log activity
      </button>
    </div>
  );
}

function FlexibilityCard({ exercise, loggedSets, onLogSet, onDeleteSet, onMoveUp, onMoveDown, onRemove }) {
  const [seconds, setSeconds] = useState('');
  const nextSetNumber = loggedSets.length + 1;

  function handleLog() {
    const durationSeconds = seconds === '' ? null : parseInt(seconds, 10);
    if (!durationSeconds) return;
    onLogSet({
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      setNumber: nextSetNumber,
      movementType: 'flexibility',
      weight: null,
      reps: null,
      durationSeconds,
    });
    setSeconds('');
  }

  return (
    <div style={{ background: INK_2, borderLeft: `3px solid ${BRICK}` }} className="rounded-md px-4 py-3">
      <CardHeader title={exercise.name} onMoveUp={onMoveUp} onMoveDown={onMoveDown} onRemove={onRemove} />
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-2 text-center">
        Target: {exercise.sets} holds, {exercise.reps}
      </div>

      {loggedSets.length > 0 && (
        <div className="space-y-1 mb-2">
          {loggedSets.map((s) => (
            <div key={s.id} className="flex items-center justify-center gap-2">
              <span style={{ color: PAPER_DIM, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm tabular-nums">
                Hold {s.setNumber}: {s.durationSeconds ? `${s.durationSeconds}s` : '—'}
              </span>
              <button onClick={() => onDeleteSet(s.id)} style={{ color: TEXT_SOFT }} className="p-2 -m-2">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={seconds}
          onChange={(e) => setSeconds(e.target.value)}
          placeholder="sec"
          style={{ background: INK_3, color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }}
          className="w-16 rounded-md px-2 py-2 text-sm outline-none text-center"
        />
        <button
          onClick={handleLog}
          disabled={seconds === ''}
          style={{ background: seconds === '' ? INK_3 : BRICK, color: seconds === '' ? TEXT_SOFT : PAPER }}
          className="flex-1 rounded-md py-2 text-sm font-medium flex items-center justify-center gap-1"
        >
          <Plus size={14} /> Log hold {nextSetNumber}
        </button>
      </div>
    </div>
  );
}
