import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, Check, Replace, ChevronDown, ChevronUp, Trash2, Link2, GripVertical } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Portal from '../../Portal';
import { useAuth } from '../../auth/AuthContext';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY, LIME, BRICK } from '../../theme';
import { MUSCLE_GROUPS, EXERCISE_LIBRARY, FLEXIBILITY_LIBRARY, FLEXIBILITY_ACTIVITIES, MOVEMENT_MODES, AEROBIC_ACTIVITIES_QUICK, LIFESTYLE_ACTIVITIES, TRAINING_STYLES, STYLE_CONFIG, WORKOUT_LOCATIONS, locationEmojis, filterByLocation, generateWorkout, generateFlexibilityPlan, suggestNextWeight } from './exerciseLibrary';
import { startOfWeek, weekDayLabels } from '../../lib/week';
import { MuscleGroupPicker, ActivityPicker } from './MovementTypePicker';
import { predictedMaxHR, computeHrZones } from '../../lib/heartRate';

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
    plan: row.plan || [],
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
    lightMinutes: row.light_minutes != null ? Number(row.light_minutes) : null,
    moderateMinutes: row.moderate_minutes != null ? Number(row.moderate_minutes) : null,
    vigorousMinutes: row.vigorous_minutes != null ? Number(row.vigorous_minutes) : null,
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

// A logged aerobic set's intensity breakdown, e.g. "20m moderate, 10m
// vigorous" — falls back to the old total-duration display for sets
// logged before the light/moderate/vigorous split existed.
function formatIntensityMinutes(s) {
  const parts = [];
  if (s.lightMinutes) parts.push(`${s.lightMinutes}m light`);
  if (s.moderateMinutes) parts.push(`${s.moderateMinutes}m moderate`);
  if (s.vigorousMinutes) parts.push(`${s.vigorousMinutes}m vigorous`);
  if (parts.length > 0) return parts.join(', ');
  return formatDuration(s.durationSeconds) || '—';
}

function LabeledMinutesInput({ label, value, onChange }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span style={{ color: TEXT_SOFT }} className="text-sm">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        style={{ background: INK_3, color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }}
        className="w-16 rounded-md px-2 py-2 text-sm outline-none text-center"
      />
    </div>
  );
}

// RPE + talk-test description for each intensity, plus this client's own
// HR range when we have enough data (resting + max) to compute one —
// same Karvonen math Birdseye's Science & Strategy card uses, so the
// numbers always agree with each other.
const INTENSITY_GUIDE = [
  { label: 'Light', rpe: '2–3', talk: 'Easy — you could sing.' },
  { label: 'Moderate', rpe: '4–6', talk: 'You can talk, but not sing.' },
  { label: 'Vigorous', rpe: '7–8', talk: 'Hard to say more than a few words at a time.' },
];

function IntensityGuideModal({ onClose, hrZones }) {
  return (
    <Portal>
      <div style={{ background: 'rgba(0,0,0,0.6)' }} className="fixed inset-0 flex items-end md:items-center justify-center z-50" onClick={onClose}>
        <div style={{ background: INK_2 }} className="w-full max-w-sm rounded-t-2xl md:rounded-2xl px-5 py-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ color: PAPER }} className="text-base font-medium">Which intensity was it?</h3>
            <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-2 -m-2"><X size={20} /></button>
          </div>
          <div className="space-y-4">
            {INTENSITY_GUIDE.map((tier) => {
              const zone = hrZones?.find((z) => z.label === tier.label);
              return (
                <div key={tier.label}>
                  <div style={{ color: SKY }} className="text-sm font-medium mb-0.5">{tier.label}</div>
                  <div style={{ color: PAPER_DIM }} className="text-sm">{tier.talk}</div>
                  <div style={{ color: TEXT_SOFT }} className="text-sm">
                    RPE {tier.rpe}/10{zone ? ` · ${zone.lowBpm}–${zone.highBpm} bpm` : ''}
                  </div>
                </div>
              );
            })}
          </div>
          {!hrZones && (
            <div style={{ color: TEXT_SOFT }} className="text-sm mt-4 pt-4 border-t border-white/10">
              Add your resting heart rate in Account to see your own personal bpm ranges here.
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}

// The Light/Moderate/Vigorous minute inputs shared by every aerobic
// logging form, plus a "Not sure?" link into the intensity guide —
// kept in one place so it's identical everywhere it appears.
function IntensityMinutesGroup({ light, setLight, moderate, setModerate, vigorous, setVigorous, hrZones }) {
  const [showGuide, setShowGuide] = useState(false);
  return (
    <>
      <div className="flex items-center justify-center gap-1.5 mb-1.5">
        <span style={{ color: TEXT_SOFT }} className="text-sm">Minutes spent at each intensity</span>
        <button onClick={() => setShowGuide(true)} style={{ color: SKY }} className="text-sm underline underline-offset-2">
          Not sure?
        </button>
      </div>
      <div className="flex items-center justify-center gap-2 flex-wrap mb-2">
        <LabeledMinutesInput label="Light" value={light} onChange={setLight} />
        <LabeledMinutesInput label="Moderate" value={moderate} onChange={setModerate} />
        <LabeledMinutesInput label="Vigorous" value={vigorous} onChange={setVigorous} />
      </div>
      {showGuide && <IntensityGuideModal onClose={() => setShowGuide(false)} hrZones={hrZones} />}
    </>
  );
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

// Local calendar date as YYYY-MM-DD — new Date().toISOString() gives the
// UTC date instead, which can silently land on the wrong day depending
// on time zone and time of day.
function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function MoveTab({ deepLinkWorkoutId, onConsumeDeepLink }) {
  const { user, profile, updateProfile } = useAuth();
  const hrZones = computeHrZones(
    profile?.resting_hr_bpm != null ? Number(profile.resting_hr_bpm) : null,
    profile?.max_hr_bpm != null ? Number(profile.max_hr_bpm) : predictedMaxHR(profile?.age != null ? Number(profile.age) : null)
  );
  const [workouts, setWorkouts] = useState([]);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayLocalISO);
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
  const [addingExerciseToId, setAddingExerciseToId] = useState(null);
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

  // Resume any workout left in progress (completed_at still null) after a
  // reload, app switch, or crash — otherwise its row and logged sets stay
  // in the database (still counted by Birdseye) with no way to reach it
  // from Move, since activeWorkoutId/planExercises are plain React state
  // that resets to empty on every mount.
  useEffect(() => {
    if (loading || activeWorkoutId) return;
    const inProgress = workouts.find((w) => !w.completedAt && !w.deletedAt);
    if (!inProgress) return;
    setActiveWorkoutId(inProgress.id);
    setPlanExercises(inProgress.plan || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, workouts]);

  const activeWorkout = workouts.find((w) => w.id === activeWorkoutId) || null;
  const completedWorkouts = workouts.filter((w) => w.completedAt && !w.deletedAt);

  // Keep the active workout's plan mirrored to the database as it's
  // edited (exercises added/removed/reordered, supersets formed) so the
  // resume effect above always has an up-to-date plan to rebuild from.
  useEffect(() => {
    if (!activeWorkoutId) return;
    const t = setTimeout(() => {
      supabase.from('workouts').update({ plan: planExercises }).eq('id', activeWorkoutId).then(({ error }) => {
        if (error) setLoadError(error.message);
      });
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkoutId, planExercises]);

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

    const isToday = selectedDate === todayLocalISO();
    // Noon avoids the date silently shifting by a day if this ever
    // crosses a UTC day boundary near midnight in the client's time zone.
    const startedAt = isToday ? new Date().toISOString() : new Date(`${selectedDate}T12:00:00`).toISOString();

    const { data, error } = await supabase
      .from('workouts')
      .insert({
        muscle_groups: usesResistance || usesFlexibility ? selectedGroups : [],
        activities: usesAerobic ? selectedActivities : usesFlexibility ? selectedFlexActivities : [],
        movement_mode: movementMode,
        style: usesResistance ? selectedStyle : null,
        location: selectedLocation,
        started_at: startedAt,
        plan,
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
    setSelectedDate(todayLocalISO());
  }

  // Lets a past resistance (or flexibility) movement pick up aerobic
  // work after the fact, bumping it to Combined so it counts toward
  // both goals — same idea as mid-session mixing, just for history.
  async function addAerobicToHistory(workoutId, name, { light, moderate, vigorous }, distance) {
    const durationSeconds = ((light || 0) + (moderate || 0) + (vigorous || 0)) * 60;
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
        light_minutes: light || null,
        moderate_minutes: moderate || null,
        vigorous_minutes: vigorous || null,
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

  // Drag-and-drop reorder: moves the group at fromIndex to sit at
  // toIndex (unlike moveGroup, not limited to swapping adjacent pairs).
  function reorderGroup(fromIndex, toIndex) {
    setPlanExercises((prev) => {
      const groups = groupPlan(prev).map((g) => g.map(({ index, ...rest }) => rest));
      if (toIndex < 0 || toIndex >= groups.length || fromIndex === toIndex) return prev;
      const next = [...groups];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
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
        light_minutes: payload.lightMinutes ?? null,
        moderate_minutes: payload.moderateMinutes ?? null,
        vigorous_minutes: payload.vigorousMinutes ?? null,
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

  // Adding a brand-new resistance exercise to a past (already-finished)
  // movement — same idea as addAerobicToHistory, since planExercises
  // (used for the active-workout flow) doesn't apply to history at all.
  async function addExerciseToHistory(workoutId, name, muscleGroup, weight, reps) {
    const { data, error } = await supabase
      .from('workout_sets')
      .insert({
        workout_id: workoutId,
        exercise_name: name,
        muscle_group: muscleGroup,
        set_number: 1,
        movement_type: 'resistance',
        weight: weight,
        reps: reps,
      })
      .select()
      .single();
    if (error) { setLoadError(error.message); return; }
    setSets((prev) => [...prev, mapSet(data)]);
    // If this muscle group wasn't already part of the workout's own
    // record, add it so Birdseye/History summaries reflect it too.
    const w = workouts.find((x) => x.id === workoutId);
    if (w && !w.muscleGroups.includes(muscleGroup)) {
      const nextGroups = [...w.muscleGroups, muscleGroup];
      const { data: wdata, error: werror } = await supabase.from('workouts').update({ muscle_groups: nextGroups }).eq('id', workoutId).select().single();
      if (!werror) setWorkouts((prev) => prev.map((x) => (x.id === workoutId ? mapWorkout(wdata) : x)));
    }
    setAddingExerciseToId(null);
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

      <WeeklyTracker completedWorkouts={completedWorkouts} weekStartDay={weekStartDay} />

      {activeWorkout ? (
        <ActiveWorkout
          workout={activeWorkout}
          exercises={planExercises}
          sets={sets.filter((s) => s.workoutId === activeWorkout.id)}
          lastPerformance={lastPerformance}
          bodyweight={bodyweight}
          hrZones={hrZones}
          onLogSet={logSet}
          onDeleteSet={deleteSet}
          onReplace={replaceExercise}
          onMoveGroup={moveGroup}
          onReorderGroup={reorderGroup}
          onAddExercise={addExercise}
          onAddSuperset={addSuperset}
          onAddAerobic={addAerobic}
          onRemoveExercise={removeExercise}
          onFinish={finishWorkout}
          onDiscard={discardWorkout}
        />
      ) : (
        <StartWorkout
          dataTour="move-start"
          gender={profile?.gender}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
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

      <div data-tour="move-history" className="mt-8">
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
                                        {formatIntensityMinutes(s)}{s.distance ? ` · ${s.distance}` : ''}
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
                                  ? exSets.map((s) => `${formatIntensityMinutes(s)}${s.distance ? ` · ${s.distance}` : ''}`).join(', ')
                                  : isFlexibility
                                  ? exSets.map((s) => (s.durationSeconds ? `${s.durationSeconds}s` : '—')).join(', ')
                                  : exSets.map((s) => `${s.weight ?? '—'}×${s.reps ?? '—'}`).join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {editing && (
                        addingExerciseToId === w.id ? (
                          <AddExerciseToHistoryForm
                            onAdd={(name, muscleGroup, weight, reps) => addExerciseToHistory(w.id, name, muscleGroup, weight, reps)}
                            onCancel={() => setAddingExerciseToId(null)}
                          />
                        ) : addingAerobicToId === w.id ? (
                          <AddAerobicToHistoryForm
                            onAdd={(name, minutesByZone, distance) => addAerobicToHistory(w.id, name, minutesByZone, distance)}
                            onCancel={() => setAddingAerobicToId(null)}
                            hrZones={hrZones}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setAddingExerciseToId(w.id)}
                              style={{ background: INK_3, color: SKY }}
                              className="flex-1 rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-1.5"
                            >
                              <Plus size={14} /> Add exercise
                            </button>
                            <button
                              onClick={() => setAddingAerobicToId(w.id)}
                              style={{ background: INK_3, color: SKY }}
                              className="flex-1 rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-1.5"
                            >
                              <Plus size={14} /> Add aerobic
                            </button>
                          </div>
                        )
                      )}
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() => { setEditingHistoryId(editing ? null : w.id); setAddingAerobicToId(null); setAddingExerciseToId(null); }}
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
  selectedDate, onSelectDate,
  selectedLocation, onSelectLocation,
  movementMode, onSelectMode,
  selectedGroups, onToggleGroup,
  selectedActivities, onToggleActivity,
  selectedFlexActivities, onToggleFlexActivity,
  customActivities, onAddCustomActivity, onRemoveCustomActivity,
  selectedStyle, onSelectStyle, onStart, canStart,
  assignedProgram, onStartAssignedProgram,
  dataTour,
}) {
  const startEmoji = gender === 'Female' ? ' 💃🏻' : gender === 'Male' ? ' 🕺' : '';
  const [skipProgram, setSkipProgram] = useState(false);
  const [pickingDate, setPickingDate] = useState(false);
  const showProgramOffer = assignedProgram && selectedLocation && !skipProgram;

  const needsGroups = movementMode === 'Resistance' || movementMode === 'Combined' || movementMode === 'Flexibility';
  const needsActivities = movementMode === 'Aerobic' || movementMode === 'Combined';
  const needsFlexActivities = movementMode === 'Flexibility';
  const needsStyle = movementMode === 'Resistance' || movementMode === 'Combined';

  const isToday = selectedDate === todayLocalISO();
  const friendlyDate = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div data-tour={dataTour} style={{ background: INK_2, borderTop: `2px solid ${SKY}` }} className="rounded-lg px-5 py-6 mb-2">
      <div className="flex items-center justify-center gap-2 mb-5">
        <button
          onClick={() => { onSelectDate(todayLocalISO()); setPickingDate(false); }}
          style={{ background: isToday ? SKY : INK_3, color: isToday ? INK : PAPER_DIM }}
          className="rounded-full px-3.5 py-1.5 text-sm font-medium"
        >
          Today
        </button>
        <button
          onClick={() => setPickingDate((v) => !v)}
          style={{ background: !isToday ? SKY : INK_3, color: !isToday ? INK : PAPER_DIM }}
          className="rounded-full px-3.5 py-1.5 text-sm font-medium"
        >
          {isToday ? 'Past Date' : friendlyDate}
        </button>
      </div>
      {pickingDate && (
        <div className="flex justify-center mb-5">
          <input
            type="date"
            value={selectedDate}
            max={todayLocalISO()}
            onChange={(e) => { if (e.target.value) { onSelectDate(e.target.value); setPickingDate(false); } }}
            style={{ background: INK_3, color: PAPER, colorScheme: 'dark' }}
            className="rounded-md px-3 py-2 text-sm outline-none"
          />
        </div>
      )}
      <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-3 text-center">
        {isToday ? 'Where are you getting your movement in today?' : 'Where did you get your movement in?'}
      </div>
      <div className="space-y-2 mb-5">
        {WORKOUT_LOCATIONS.map((loc) => {
          const selected = selectedLocation === loc;
          const [left, right] = locationEmojis(loc, gender);
          return (
            <button
              key={loc}
              onClick={() => onSelectLocation(selected ? '' : loc)}
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
  workout, exercises, sets, lastPerformance, bodyweight, hrZones,
  onLogSet, onDeleteSet, onReplace, onMoveGroup, onReorderGroup,
  onAddExercise, onAddSuperset, onAddAerobic, onRemoveExercise, onFinish, onDiscard,
}) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [addMode, setAddMode] = useState(null); // 'resistance' | 'superset' | 'aerobic'
  const [swapIndex, setSwapIndex] = useState(null);
  // Drag-to-reorder: groupRefs tracks each rendered group's DOM node so a
  // drag can find which group the pointer is currently over; dragStateRef
  // holds the in-progress drag (not state, since it needs to read/write
  // synchronously on every pointermove without waiting on a re-render).
  const groupRefs = useRef([]);
  const dragStateRef = useRef(null);
  const [draggingIndex, setDraggingIndex] = useState(null);

  function handleDragStart(e, gi) {
    e.preventDefault();
    dragStateRef.current = { fromIndex: gi, currentIndex: gi, pointerId: e.pointerId };
    setDraggingIndex(gi);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleDragMove(e) {
    const state = dragStateRef.current;
    if (!state) return;
    const y = e.clientY;
    let closestIndex = state.currentIndex;
    let closestDist = Infinity;
    groupRefs.current.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const dist = Math.abs(y - mid);
      if (dist < closestDist) { closestDist = dist; closestIndex = i; }
    });
    if (closestIndex !== state.currentIndex) {
      onReorderGroup(state.currentIndex, closestIndex);
      state.currentIndex = closestIndex;
      setDraggingIndex(closestIndex);
    }
  }

  function handleDragEnd(e) {
    const state = dragStateRef.current;
    if (state) {
      try { e.currentTarget.releasePointerCapture(state.pointerId); } catch { /* already released */ }
    }
    dragStateRef.current = null;
    setDraggingIndex(null);
  }
  // Counts UP from the moment a set is logged, rather than down from a
  // fixed target — a stalled count-up stays informative ("it's been a
  // while"), where a count-down that hits 0:00 and keeps running reads as
  // broken. Tracked by group index so the banner renders right under the
  // movement that's actually resting, not in one spot at the bottom.
  const [restStartedAt, setRestStartedAt] = useState(null);
  const [restGroupIndex, setRestGroupIndex] = useState(null);
  const [restElapsed, setRestElapsed] = useState(0);

  const groups = groupPlan(exercises);
  const total = Math.round(totalWeightLifted(sets));

  function closeAddForm() {
    setAddMenuOpen(false);
    setAddMode(null);
  }

  function startRest(groupIndex) {
    setRestStartedAt(Date.now());
    setRestGroupIndex(groupIndex);
    setRestElapsed(0);
  }

  useEffect(() => {
    if (restStartedAt == null) return;
    const t = setInterval(() => setRestElapsed(Math.round((Date.now() - restStartedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [restStartedAt]);

  function handleResistanceLog(payload, groupIndex) {
    onLogSet(payload);
    startRest(groupIndex);
  }

  const restTarget = STYLE_CONFIG[workout.style]?.restSeconds || 90;

  function RestBanner() {
    return (
      <div style={{ background: INK_2, borderLeft: `3px solid ${LIME}` }} className="rounded-md px-4 py-2.5 mb-3 flex items-center gap-3">
        <span style={{ color: LIME, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm font-medium tabular-nums">
          Rest {Math.floor(restElapsed / 60)}:{String(restElapsed % 60).padStart(2, '0')}
        </span>
        <div style={{ color: TEXT_SOFT }} className="text-sm flex-1">
          {restElapsed < restTarget ? `Target ${Math.floor(restTarget / 60)}:${String(restTarget % 60).padStart(2, '0')}` : 'Ready when you are'}
        </div>
        <button onClick={() => setRestStartedAt(null)} style={{ color: TEXT_SOFT }} className="p-1 -m-1">
          <X size={14} />
        </button>
      </div>
    );
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
          const showRest = restGroupIndex === gi;
          const groupKey = group.length === 2 ? `superset-${group[0].index}` : `${group[0].type || 'ex'}-${group[0].index}`;
          let card;

          if (group.length === 2) {
            card = (
              <SupersetCard
                members={group}
                style={workout.style}
                bodyweight={bodyweight}
                sets={sets}
                lastPerformance={lastPerformance}
                onLogSet={(payload) => handleResistanceLog(payload, gi)}
                onDeleteSet={onDeleteSet}
                onOpenSwap={setSwapIndex}
                onMoveUp={gi > 0 ? () => onMoveGroup(gi, -1) : null}
                onMoveDown={gi < groups.length - 1 ? () => onMoveGroup(gi, 1) : null}
                onRemove={(index, hasLoggedSets) => onRemoveExercise(index, hasLoggedSets)}
              />
            );
          } else {
            const ex = group[0];
            const loggedSets = sets.filter((s) => s.exerciseName === ex.name);
            if (ex.type === 'aerobic' || ex.type === 'flexibility-activity') {
              card = (
                <AerobicCard
                  exercise={ex}
                  movementType={ex.type === 'flexibility-activity' ? 'flexibility' : 'aerobic'}
                  loggedSets={loggedSets}
                  onLogSet={onLogSet}
                  onDeleteSet={onDeleteSet}
                  onMoveUp={gi > 0 ? () => onMoveGroup(gi, -1) : null}
                  onMoveDown={gi < groups.length - 1 ? () => onMoveGroup(gi, 1) : null}
                  onRemove={() => onRemoveExercise(ex.index, loggedSets.length > 0)}
                  hrZones={hrZones}
                />
              );
            } else if (ex.type === 'flexibility') {
              card = (
                <FlexibilityCard
                  exercise={ex}
                  loggedSets={loggedSets}
                  onLogSet={onLogSet}
                  onDeleteSet={onDeleteSet}
                  onMoveUp={gi > 0 ? () => onMoveGroup(gi, -1) : null}
                  onMoveDown={gi < groups.length - 1 ? () => onMoveGroup(gi, 1) : null}
                  onRemove={() => onRemoveExercise(ex.index, loggedSets.length > 0)}
                />
              );
            } else {
              card = (
                <ExerciseCard
                  exercise={ex}
                  style={workout.style}
                  bodyweight={bodyweight}
                  loggedSets={loggedSets}
                  last={lastPerformance(ex.name)}
                  onLogSet={(payload) => handleResistanceLog({ ...payload, exerciseName: ex.name, muscleGroup: ex.muscleGroup }, gi)}
                  onDeleteSet={onDeleteSet}
                  onOpenSwap={() => setSwapIndex(ex.index)}
                  onMoveUp={gi > 0 ? () => onMoveGroup(gi, -1) : null}
                  onMoveDown={gi < groups.length - 1 ? () => onMoveGroup(gi, 1) : null}
                  onRemove={() => onRemoveExercise(ex.index, loggedSets.length > 0)}
                />
              );
            }
          }

          return (
            <div
              key={groupKey}
              ref={(el) => (groupRefs.current[gi] = el)}
              style={{ opacity: draggingIndex === gi ? 0.6 : 1 }}
              className="flex items-stretch gap-1"
            >
              <button
                onPointerDown={(e) => handleDragStart(e, gi)}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onPointerCancel={handleDragEnd}
                style={{ color: TEXT_SOFT, touchAction: 'none' }}
                className="shrink-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing"
                title="Drag to reorder"
              >
                <GripVertical size={16} />
              </button>
              <div className="flex-1 min-w-0 space-y-3">
                {card}
                {showRest && <RestBanner />}
              </div>
            </div>
          );
        })}
      </div>

      {addMenuOpen ? (
        addMode === null ? (
          <div style={{ background: INK_2 }} className="rounded-md px-4 py-3 mb-4">
            <div style={{ color: TEXT_SOFT }} className="text-sm mb-2 text-center">Add what to your workout?</div>
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
          <Plus size={14} /> Add to Workout
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
          Add to Workout
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

function AddExerciseToHistoryForm({ onAdd, onCancel }) {
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState(MUSCLE_GROUPS[0]);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  function handleAdd() {
    onAdd(
      name.trim(),
      muscleGroup,
      weight.trim() === '' ? null : parseFloat(weight),
      reps.trim() === '' ? null : parseInt(reps, 10)
    );
  }

  return (
    <div style={{ background: INK_3 }} className="rounded-md px-3 py-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Exercise name"
        style={{ background: INK_2, color: PAPER }}
        className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center mb-2"
      />
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-1.5 text-center">Muscle group</div>
      <div className="flex flex-wrap justify-center gap-2 mb-2">
        {MUSCLE_GROUPS.map((g) => (
          <button
            key={g}
            onClick={() => setMuscleGroup(g)}
            style={{ background: muscleGroup === g ? SKY : INK_2, color: muscleGroup === g ? INK : PAPER_DIM }}
            className="px-3 py-1.5 rounded-full text-sm font-medium"
          >
            {g}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 mb-2">
        <input
          type="number"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="weight"
          style={{ background: INK_2, color: PAPER }}
          className="w-20 rounded-md px-2 py-2 text-sm outline-none text-center"
        />
        <span style={{ color: TEXT_SOFT }} className="text-sm">×</span>
        <input
          type="number"
          inputMode="numeric"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          placeholder="reps"
          style={{ background: INK_2, color: PAPER }}
          className="w-20 rounded-md px-2 py-2 text-sm outline-none text-center"
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

function AddAerobicToHistoryForm({ onAdd, onCancel, hrZones }) {
  const [name, setName] = useState('');
  const [light, setLight] = useState('');
  const [moderate, setModerate] = useState('');
  const [vigorous, setVigorous] = useState('');
  const [distance, setDistance] = useState('');

  function handleAdd() {
    onAdd(
      name.trim(),
      { light: parseInt(light, 10) || 0, moderate: parseInt(moderate, 10) || 0, vigorous: parseInt(vigorous, 10) || 0 },
      distance.trim() || null
    );
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
      <IntensityMinutesGroup light={light} setLight={setLight} moderate={moderate} setModerate={setModerate} vigorous={vigorous} setVigorous={setVigorous} hrZones={hrZones} />
      <input
        type="text"
        value={distance}
        onChange={(e) => setDistance(e.target.value)}
        placeholder="distance (optional)"
        style={{ background: INK_2, color: PAPER }}
        className="w-full rounded-md px-2 py-2 text-sm outline-none text-center mb-2"
      />
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
          Add to Workout
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

function CardHeader({ title, onMoveUp, onMoveDown, onOpenSwap, onRemove, onDone }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <div style={{ color: PAPER }} className="text-sm font-medium">{title}</div>
      <div className="flex items-center gap-0.5">
        {onDone && (
          <button onClick={onDone} style={{ color: TEXT_SOFT }} className="p-2 -m-1" title="Done — collapse this movement">
            <Check size={14} />
          </button>
        )}
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

// A horizontally-scrollable, snap-to-center chip list — replaces free-text
// number entry for weight/reps so logging a set during a workout is a
// thumb-scroll instead of summoning the keyboard. Scrolls its selected
// chip into view on mount/when the option list changes (e.g. a fresh
// weight window centered on a new suggestion).
function ScrollPicker({ options, value, onChange, unit }) {
  const selectedRef = useRef(null);
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);
  return (
    <div
      className="flex gap-1.5 overflow-x-auto py-1 px-8"
      style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
    >
      {options.map((opt) => {
        const selected = opt === value;
        return (
          <button
            key={opt}
            ref={selected ? selectedRef : null}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              background: selected ? SKY : INK_3,
              color: selected ? INK : PAPER_DIM,
              fontFamily: 'Space Grotesk, sans-serif',
              scrollSnapAlign: 'center',
            }}
            className="shrink-0 w-14 h-10 rounded-md text-sm font-medium flex items-center justify-center"
          >
            {opt}{unit || ''}
          </button>
        );
      })}
    </div>
  );
}

function roundToFive(n) {
  return Math.round(n / 5) * 5;
}

// A scrollable window of weight options in 5 lb increments, centered on
// the lifter's last/suggested weight for this exercise so the relevant
// values are already near the middle instead of off at one end.
function weightOptions(start) {
  const center = start != null ? roundToFive(start) : 0;
  const lo = Math.max(0, center - 50);
  const opts = [];
  for (let w = lo; w <= lo + 200; w += 5) opts.push(w);
  return opts;
}

const REP_PICKER_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1); // 1-20

// "Use bodyweight" only makes sense for movements where the lifter's own
// weight is the load — pull-ups, dips, chin-ups — not presses/push-ups
// where adding bodyweight to the logged number would be meaningless.
function isBodyweightEligible(name) {
  return /pull-up|dip|chin-up/i.test(name || '');
}

function WeightRepsInput({ exercise, style, bodyweight, last, onLog, nextSetNumber }) {
  const suggestion = suggestNextWeight(exercise, last, style, last?.daysSince);
  const bodyweightEligible = isBodyweightEligible(exercise?.name);
  const [useBodyweight, setUseBodyweight] = useState(false);
  // Starts from the last/suggested weight for this exercise (or 0 if
  // there's no history yet), and from 8 reps — the middle of a typical
  // working-set rep range — per how the picker is meant to default.
  const startWeight = suggestion?.weight ?? last?.weight ?? null;
  const [weight, setWeight] = useState(startWeight != null ? roundToFive(startWeight) : 0);
  const [reps, setReps] = useState(8);
  const weightOpts = weightOptions(startWeight);

  function handleLog() {
    if (useBodyweight) {
      onLog({ setNumber: nextSetNumber, weight: (bodyweight || 0) + weight, reps, isBodyweight: true });
    } else {
      onLog({ setNumber: nextSetNumber, weight, reps, isBodyweight: false });
    }
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
      {bodyweight != null && bodyweightEligible && (
        <button
          onClick={() => setUseBodyweight((v) => !v)}
          style={{ color: useBodyweight ? LIME : TEXT_SOFT }}
          className="text-sm mb-2 flex items-center gap-1 mx-auto"
        >
          <Check size={12} style={{ opacity: useBodyweight ? 1 : 0.25 }} /> Use bodyweight ({bodyweight} lb)
        </button>
      )}
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-1 text-center">
        {useBodyweight ? 'Added weight (lb)' : 'Weight (lb)'}
      </div>
      <ScrollPicker options={weightOpts} value={weight} onChange={setWeight} />
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-1 mt-2 text-center">Reps</div>
      <ScrollPicker options={REP_PICKER_OPTIONS} value={reps} onChange={setReps} />
      <button
        onClick={handleLog}
        style={{ background: SKY, color: INK }}
        className="w-full rounded-md py-2.5 mt-3 text-sm font-medium flex items-center justify-center gap-1"
      >
        <Plus size={14} /> Log set {nextSetNumber}
      </button>
    </>
  );
}

function ExerciseCard({ exercise, style, bodyweight, loggedSets, last, onLogSet, onDeleteSet, onOpenSwap, onMoveUp, onMoveDown, onRemove }) {
  const nextSetNumber = loggedSets.length + 1;
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{ background: INK_2, borderLeft: `3px solid ${LIME}` }}
        className="w-full rounded-md px-4 py-2.5 flex items-center justify-between text-left"
      >
        <span style={{ color: PAPER }} className="text-sm font-medium flex items-center gap-1.5">
          <Check size={14} color={LIME} /> {exercise.name}
        </span>
        <span style={{ color: TEXT_SOFT }} className="text-sm">
          {loggedSets.length} set{loggedSets.length === 1 ? '' : 's'} logged
        </span>
      </button>
    );
  }

  return (
    <div style={{ background: INK_2, borderLeft: `3px solid ${SKY}` }} className="rounded-md px-4 py-3">
      <CardHeader title={exercise.name} onMoveUp={onMoveUp} onMoveDown={onMoveDown} onOpenSwap={onOpenSwap} onRemove={onRemove} onDone={loggedSets.length > 0 ? () => setCollapsed(true) : null} />
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

function AerobicCard({ exercise, movementType = 'aerobic', loggedSets, onLogSet, onDeleteSet, onMoveUp, onMoveDown, onRemove, hrZones }) {
  const [light, setLight] = useState('');
  const [moderate, setModerate] = useState('');
  const [vigorous, setVigorous] = useState('');
  const [distance, setDistance] = useState('');

  function handleLog() {
    const l = parseInt(light, 10) || 0;
    const m = parseInt(moderate, 10) || 0;
    const v = parseInt(vigorous, 10) || 0;
    const durationSeconds = (l + m + v) * 60;
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
      lightMinutes: l || null,
      moderateMinutes: m || null,
      vigorousMinutes: v || null,
    });
    setLight('');
    setModerate('');
    setVigorous('');
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
                {formatIntensityMinutes(s)}{s.distance ? ` · ${s.distance}` : ''}
              </span>
              <button onClick={() => onDeleteSet(s.id)} style={{ color: TEXT_SOFT }} className="p-2 -m-2">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <IntensityMinutesGroup light={light} setLight={setLight} moderate={moderate} setModerate={setModerate} vigorous={vigorous} setVigorous={setVigorous} hrZones={hrZones} />
      <input
        type="text"
        value={distance}
        onChange={(e) => setDistance(e.target.value)}
        placeholder="distance (optional)"
        style={{ background: INK_3, color: PAPER }}
        className="w-full rounded-md px-2 py-2 text-sm outline-none text-center mb-2"
      />
      <button
        onClick={handleLog}
        style={{ background: SKY, color: INK }}
        className="w-full rounded-md py-2 text-sm font-medium flex items-center justify-center gap-1"
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
