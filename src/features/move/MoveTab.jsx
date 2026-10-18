import { estimateKcal } from '../../lib/calories';
import RevealPills from '../../lib/RevealPills';
import { useSingleOpenRow } from '../../lib/useSingleOpenRow';
import React, { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { revealSoon } from '../../lib/reveal';
import { useSwipeDown, GRAB_BAR_CLASS } from '../../lib/swipeDown';
import { useArmed } from '../../lib/useArmed';
import { Plus, X, Check, Replace, ChevronDown, ChevronUp, Trash2, Link2, GripVertical, SlidersHorizontal, Info, Activity, Dumbbell, PersonStanding, MoreHorizontal, RotateCcw, Play } from '../../lib/icons';
import { supabase } from '../../lib/supabaseClient';
import Portal from '../../Portal';
import SwipeHint from '../../SwipeHint';
import { titleCaseWords } from '../../lib/text';
import IntensityGuideModal from '../../IntensityGuideModal';
import { useAuth } from '../../auth/AuthContext';
import { getAutoStartRestTimer } from '../../restPreference';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY, LIME, BRICK, AMBER, VIOLET, MOSS, ON_AMBER } from '../../theme';
import { workoutTitle, shortWorkoutTitle, plural, modeLabel, MODE_EMOJI, STYLE_EMOJI, MUSCLE_GROUPS, EXERCISE_LIBRARY, FLEXIBILITY_LIBRARY, FLEXIBILITY_ACTIVITIES, MOVEMENT_MODES, AEROBIC_ACTIVITIES_QUICK, LIFESTYLE_ACTIVITIES, TRAINING_STYLES, STYLE_CONFIG, WORKOUT_LOCATIONS, locationEmojis, filterByLocation, generateWorkout, generateFlexibilityPlan, generateFoamRollPlan, variationFor, beginnerAvoid, STARTER_SESSION, generateCooldown, BALANCE_ACTIVITIES, generateDynamicWarmup, suggestNextWeight, BODY_AREAS, avoidForAreas } from './exerciseLibrary';
import CheckInSheet from './CheckInSheet';
import ReadinessSheet from './ReadinessSheet';
import { useInjuries, activeInjuries } from '../injury/injuries';
import StravaMark, { STRAVA_ORANGE } from '../strava/StravaMark';
import { notifyFeltOff } from '../../lib/push';
import { setOneRms, oneRmFor, targetLoad } from './oneRm';
import { recentlyTrained } from './muscles';
import { MuscleGroupPicker, ActivityPicker } from './MovementTypePicker';
import { DEFAULT_PLAN_MINUTES, PLAN_MINUTE_OPTIONS } from '../plan/plan';
import { predictedMaxHR, computeHrZones } from '../../lib/heartRate';
import { titleCaseLive } from '../../lib/titleCase';
import { dayLabel } from '../../lib/dayLabel';
import { useProgram, useProgramLifted } from '../program/useProgram';
import ProgramSheet from '../program/ProgramSheet';
import { guideFor } from './exerciseGuides';
import { flexSuggestion, flexSession } from '../program/flex';
import { startOfWeek } from '../../lib/week';
import { MoveProgramCard, MoveProgramLink, useProgramWeek } from '../program/ProgramCards';
import { programTitle } from '../program/programs';

// Whether a workout was started as a clean slate (remembered on this device).
function isCleanSlateWorkout(id) {
  try { return Boolean(id) && localStorage.getItem(`groove:cleanSlate:${id}`) === '1'; } catch { return false; }
}

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
    fromStrava: String(row.external_id || '').startsWith('strava:'),
    stravaTitle: ((row.plan || []).find((e) => e && e.kind === 'strava') || {}).title || '',
  };
}

function daysBetween(a, b) {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

const LIVE_BACKUP_KEY = 'groove:liveBackup';
// A checked-off exercise reads green (a soft tint of the Birdseye green).
const DONE_BG = `color-mix(in srgb, ${LIME} 28%, ${INK_2})`;
const BARBELL_MIN_LB = 45;

// The aerobic piece that opens a resistance session starts unnamed so the
// client picks their own activity (treadmill, bike, jump rope...) instead
// of every workout assuming a treadmill.
const WARMUP_AEROBIC_PLACEHOLDER = 'Aerobic Warm-up';
// Names that are flexibility work even when typed into the resistance form.
const FLEX_NAME_RE = /stretch|yoga|pilates|foam roll|mobility|tai chi|balance training/i;
// Same, minus yoga: yoga logged from an aerobic list keeps counting as aerobic too.
const FLEX_ONLY_RE = /stretch|pilates|foam roll|mobility|tai chi|balance training/i;

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

function isSameDay(iso) {
  return !iso || new Date(iso).toDateString() === new Date().toDateString();
}

// "3 exercises · 5 sets" for lifting; "30 min · 3 mi" for cardio-only
// sessions, where "1 set" means nothing to anyone.
function workoutSummary(allSets, allExerciseCount) {
  // The dynamic warm-up counts toward flexibility but isn't a lift or a set.
  const workoutSets = allSets.filter((s) => s.muscleGroup !== 'Warm-up');
  const exerciseCount = allSets.length === workoutSets.length ? allExerciseCount : new Set(workoutSets.map((s) => s.exerciseName)).size;
  if (workoutSets.length === 0 && allSets.length > 0) return 'Dynamic warm-up';
  const nonAerobic = workoutSets.filter((s) => s.movementType !== 'aerobic');
  if (workoutSets.length > 0 && nonAerobic.length === 0) {
    const minutes = workoutSets.reduce((m, s) => m + (s.lightMinutes || 0) + (s.moderateMinutes || 0) + (s.vigorousMinutes || 0), 0)
      || Math.round(workoutSets.reduce((m, s) => m + (s.durationSeconds || 0), 0) / 60);
    const distances = workoutSets.map((s) => s.distance).filter(Boolean);
    return [minutes > 0 && `${minutes} min`, ...distances].filter(Boolean).join(' · ') || (exerciseCount === 1 ? '1 activity' : `${exerciseCount} activities`);
  }
  return `${plural(exerciseCount, 'exercise')} · ${plural(workoutSets.length, 'set')}`;
}

function totalWeightLifted(workoutSets) {
  return workoutSets
    .filter((s) => s.movementType === 'resistance')
    .reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
}

// A short title for a history row: at most two items, then "+N" (the full title shows when opened).
// A flexibility session reads as what you did (Yoga), not every muscle stretched.
function historyTitle(w) {
  const base = w.movementMode === 'Flexibility' && (w.activities || []).length > 0
    ? workoutTitle([], w.activities)
    : workoutTitle(w.muscleGroups, w.activities);
  return shortWorkoutTitle(base);
}

// Which kinds of movement a history entry holds, for its "bullet" icons (like the Birdseye calendar).
function historyKinds(w, workoutSets) {
  const t = new Set(workoutSets.map((x) => x.movementType));
  const mode = w.movementMode;
  const resistance = mode === 'Resistance' || mode === 'Combined' || t.has('resistance');
  const aerobic = mode === 'Aerobic' || mode === 'Combined' || t.has('aerobic') || (mode !== 'Flexibility' && mode !== 'Resistance' && (w.activities || []).length > 0);
  const flexibility = mode === 'Flexibility' || t.has('flexibility');
  return [
    aerobic && { key: 'a', Icon: Activity, color: MOSS, label: 'Aerobic' },
    resistance && { key: 'r', Icon: Dumbbell, color: SKY, label: 'Resistance' },
    flexibility && { key: 'f', Icon: PersonStanding, color: BRICK, label: 'Flexibility' },
  ].filter(Boolean);
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
  // Stretching is just "how long" (no intensity), so it reads "10m", not "10m light".
  if (s.movementType === 'flexibility' && s.lightMinutes && !s.moderateMinutes && !s.vigorousMinutes && !/yoga/i.test(s.exerciseName || '')) return `${s.lightMinutes}m`;
  const parts = [];
  if (s.lightMinutes) parts.push(`${s.lightMinutes}m light`);
  if (s.moderateMinutes) parts.push(`${s.moderateMinutes}m moderate`);
  if (s.vigorousMinutes) parts.push(`${s.vigorousMinutes}m vigorous`);
  if (parts.length > 0) return parts.join(', ');
  return formatDuration(s.durationSeconds) || '—';
}

// A tap-to-step minute count instead of a text field that summons the
// keyboard — quicker for the common case of a short cardio burst
// between resistance sets (a couple of taps to "2 min", not typing).
// Plain typed number, not a stepper — feedback said the +/- arrows were
// annoying for something that's often a specific known number (a timer
// readout, a watch's screen) rather than a small count worth tapping up.
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
        style={{ background: INK_3, color: PAPER, fontFamily: 'Outfit, sans-serif' }}
        className="w-14 h-9 rounded-md text-center text-base font-semibold outline-none"
      />
    </div>
  );
}

// RPE + talk-test description for each intensity, plus this client's own
// The Light/Moderate/Vigorous minute inputs shared by every aerobic
// logging form, plus a "Not sure?" link into the intensity guide —
// kept in one place so it's identical everywhere it appears.
function IntensityMinutesGroup({ light, setLight, moderate, setModerate, vigorous, setVigorous, hrZones }) {
  const [showGuide, setShowGuide] = useState(false);
  return (
    <>
      <div className="flex items-center justify-center gap-1.5 mb-1.5">
        <span style={{ color: TEXT_SOFT }} className="text-sm">Minutes by intensity</span>
        <button onClick={() => setShowGuide(true)} style={{ color: SKY }} className="text-sm underline underline-offset-2 whitespace-nowrap">
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

// A group is "aerobic" if it's a single aerobic or flexibility-activity
// exercise — those already carry their own compact "+" to log another
// cardio burst right after them, so a standalone insertion row directly
// touching one is redundant.
function isAerobicGroup(group) {
  return group.length === 1 && (group[0].type === 'aerobic' || group[0].type === 'flexibility-activity');
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

// Starting, finishing, or discarding a workout swaps the whole view out
// from under wherever the page happened to be scrolled — without this
// it can land mid-scroll (e.g. still scrolled down from the exercise
// list you were just looking at), which reads as broken.
function scrollAppToTop() {
  requestAnimationFrame(() => {
    document.getElementById('app-scroll')?.scrollTo({ top: 0, behavior: 'auto' });
  });
}

// History starts short and reveals a few more workouts per "Show More".
const HISTORY_FIRST_PAGE = 3;
const HISTORY_PAGE = 5;

export default function MoveTab({ onJournalAfterWorkout, deepLinkWorkoutId, onConsumeDeepLink, logDate, onConsumeLogDate, planRequest, onConsumePlanRequest, onPlanSaved, onActiveWorkoutChange, programRequest, onConsumeProgramRequest }) {
  const { user, profile, updateProfile } = useAuth();
  const hrZones = computeHrZones(
    profile?.resting_hr_bpm != null ? Number(profile.resting_hr_bpm) : null,
    profile?.max_hr_bpm != null ? Number(profile.max_hr_bpm) : predictedMaxHR(profile?.age != null ? Number(profile.age) : null)
  );
  const [workouts, setWorkouts] = useState([]);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 }); // exercises complete, shown under the tabs
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayLocalISO);
  const [movementMode, setMovementMode] = useState('');
  const [combinedActivity, setCombinedActivity] = useState(''); // '' = choose each time
  const [combinedLayout, setCombinedLayout] = useState(''); // 'serial' | 'integrated-exercises' | 'integrated-sets'
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [selectedFlexActivities, setSelectedFlexActivities] = useState([]);
  const [foamRegion, setFoamRegion] = useState('Full Body'); // asked once Foam Rolling is picked
  const [selectedStyle, setSelectedStyle] = useState('');
  // Skips generateWorkout()'s suggested exercise picks in favor of an
  // empty plan the client builds themselves via "Add to Workout".
  const [cleanSlate, setCleanSlate] = useState(false);
  // Planning a future workout reuses this same start flow; the button saves
  // a plan instead of starting. startingPlan is a plan being carried out today.
  const [planning, setPlanning] = useState(null); // { id|null, date }
  const [startingPlan, setStartingPlan] = useState(null); // { id, title }
  const [planMinutes, setPlanMinutes] = useState(DEFAULT_PLAN_MINUTES); // planned aerobic minutes
  const [activeWorkoutId, setActiveWorkoutId] = useState(null);
  const [planExercises, setPlanExercises] = useState([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  // Opening a past workout scrolls it into view.
  useEffect(() => { if (expandedHistoryId) revealSoon(document.getElementById(`history-${expandedHistoryId}`)); }, [expandedHistoryId]);
  // Extra space under History while a workout opened from the calendar is
  // expanded, so the page can scroll far enough to put it at the very top.
  const [scrollPad, setScrollPad] = useState(false);
  useEffect(() => { if (expandedHistoryId == null) setScrollPad(false); }, [expandedHistoryId]);
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const setArm = useArmed();
  const [historyShown, setHistoryShown] = useState(HISTORY_FIRST_PAGE);
  const [addingAerobicToId, setAddingAerobicToId] = useState(null);
  const [addingExerciseToId, setAddingExerciseToId] = useState(null);
  const [checkInWorkoutId, setCheckInWorkoutId] = useState(null);
  const [bodyweight, setBodyweight] = useState(null);
  const [assignedProgram, setAssignedProgram] = useState(null); // { id, name, exercises: [...] }
  // Self-guided training program (goal + days a week), and the session being started from it.
  const { program, save: saveProgram } = useProgram(user?.id);
  const [showProgramSheet, setShowProgramSheet] = useState(false);
  const [programSession, setProgramSession] = useState(null);
  const [autoStart, setAutoStart] = useState(false);
  // "How's your body today?" asked before a suggested lifting workout; the answer shapes the picks.
  const { injuries: allInjuries } = useInjuries(user?.id);
  const injuries = activeInjuries(allInjuries);
  const [starterGone, setStarterGone] = useState(() => { try { return localStorage.getItem('groove:starterDismissed') === '1'; } catch { return false; } });
  const [readiness, setReadiness] = useState(null); // { areas: [...], tired }
  const [readinessOpen, setReadinessOpen] = useState(false);

  // Custom activities live in one list; flexibility ones carry a "flex:" prefix so they only show in the flexibility picker
  // (and everyday ones never show up there).
  const allCustom = profile?.custom_activities || [];
  const customActivities = allCustom.filter((a) => !a.startsWith('flex:'));
  const customFlexActivities = allCustom.filter((a) => a.startsWith('flex:')).map((a) => a.slice(5));

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
    if (user) {
      const rmRes = await supabase.from('estimated_1rms').select('exercise_name, estimated_1rm_lb').eq('user_id', user.id).order('created_at', { ascending: false });
      if (!rmRes.error) setOneRms(rmRes.data);
    }

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
  // Strava brought in new workouts: reload (not while a workout is open here).
  const activeIdRef = useRef(null);
  useEffect(() => {
    const f = () => { if (!activeIdRef.current) loadData(); };
    window.addEventListener('groove:workoutsChanged', f);
    return () => window.removeEventListener('groove:workoutsChanged', f);
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
  activeIdRef.current = activeWorkoutId;
  const completedWorkouts = workouts.filter((w) => w.completedAt && !w.deletedAt);
  const programLifted = useProgramLifted(user?.id, program, `${completedWorkouts.length}-${sets.length}`);
  const programWeek = useProgramWeek(user?.id, program, true, `${workouts.length}-${completedWorkouts.length}-${sets.length}`, profile?.week_start_day || 'sunday');

  // Safety net against a lost live workout: keep a local copy of the plan
  // while one is active. If the workout later vanishes from the database
  // (and wasn't finished or discarded on purpose), offer to restore it.
  const [lostBackup, setLostBackup] = useState(null);
  useEffect(() => {
    if (!activeWorkout) return;
    try {
      localStorage.setItem(LIVE_BACKUP_KEY, JSON.stringify({
        id: activeWorkout.id,
        savedAt: Date.now(),
        meta: {
          muscle_groups: activeWorkout.muscleGroups,
          activities: activeWorkout.activities,
          movement_mode: activeWorkout.movementMode,
          style: activeWorkout.style,
          location: activeWorkout.location,
          started_at: activeWorkout.startedAt,
        },
        plan: planExercises,
      }));
    } catch { /* storage blocked */ }
  }, [activeWorkout, planExercises]);
  useEffect(() => {
    if (loading || activeWorkoutId) { setLostBackup(null); return; }
    try {
      const raw = localStorage.getItem(LIVE_BACKUP_KEY);
      if (!raw) { setLostBackup(null); return; }
      const b = JSON.parse(raw);
      const tooOld = Date.now() - b.savedAt > 48 * 3600 * 1000;
      const stillThere = workouts.some((w) => w.id === b.id);
      setLostBackup(!tooOld && !stillThere && b.plan?.length ? b : null);
    } catch { setLostBackup(null); }
  }, [loading, workouts, activeWorkoutId]);

  async function restoreLostWorkout() {
    const b = lostBackup;
    if (!b) return;
    const { data, error } = await supabase.from('workouts').insert({ ...b.meta, plan: b.plan }).select().single();
    if (error) { setLoadError(error.message); return; }
    try { localStorage.removeItem(LIVE_BACKUP_KEY); } catch { /* */ }
    setLostBackup(null);
    setWorkouts((prev) => [mapWorkout(data), ...prev]);
    setPlanExercises(b.plan);
    setActiveWorkoutId(data.id);
  }
  function dismissLostWorkout() {
    try { localStorage.removeItem(LIVE_BACKUP_KEY); } catch { /* */ }
    setLostBackup(null);
  }

  // Reports up to ClientApp so the shared header (outside this tab's own
  // tree) can swap to "Moving" and show a running weight tally while a
  // workout is in progress here.
  useEffect(() => {
    if (!onActiveWorkoutChange) return;
    if (!activeWorkout) {
      onActiveWorkoutChange(null);
      return;
    }
    const totalWeight = Math.round(totalWeightLifted(sets.filter((s) => s.workoutId === activeWorkout.id)));
    const kcal = estimateKcal(sets.filter((s) => s.workoutId === activeWorkout.id), bodyweight);
    // A clean slate has no plan to measure against (you add movements as you go), so no progress bar.
    onActiveWorkoutChange({ totalWeight, kcal, done: progress.done, total: isCleanSlateWorkout(activeWorkout?.id) ? 0 : progress.total });
  }, [activeWorkout, sets, onActiveWorkoutChange, bodyweight, progress]);

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

  // Planning (or starting) a planned workout from Birdseye's calendar.
  useEffect(() => {
    if (!planRequest) return;
    const { mode, plan, date } = planRequest;
    const d = plan?.details;
    setSelectedLocation(d?.location || '');
    setMovementMode(d?.mode || '');
    setSelectedGroups(d?.groups || []);
    setSelectedActivities(d?.activities || []);
    setSelectedFlexActivities(d?.flexActivities || []);
    setFoamRegion(d?.foamRegion || 'Full Body');
    setSelectedStyle(d?.style || '');
    setCombinedLayout(d?.combinedLayout || '');
    setCombinedActivity(d?.combinedActivity || '');
    setPlanMinutes(Number(d?.minutes) || DEFAULT_PLAN_MINUTES);
    setCleanSlate(false);
    if (mode === 'plan') {
      setStartingPlan(null);
      setPlanning({ id: plan?.id || null, date });
      setSelectedDate(date);
    } else {
      setPlanning(null);
      setStartingPlan({ id: plan.id, title: plan.title });
      // A missed plan is logged on the day it was planned for.
      setSelectedDate(date && date < todayLocalISO() ? date : todayLocalISO());
    }
    scrollAppToTop();
    onConsumePlanRequest && onConsumePlanRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planRequest]);

  // Starting a session from a program (here in Move or from Birdseye): fill in
  // the choices, and for a lifting session begin right away.
  // "New to lifting? Start here": a gentle full-body session (simple moves, 2 light sets of 10-12), built in one tap.
  function beginStarter(location) {
    setPlanning(null);
    setStartingPlan(null);
    setSelectedDate(todayLocalISO());
    setCleanSlate(false);
    setSelectedLocation(location);
    setMovementMode('Resistance');
    setSelectedGroups(STARTER_SESSION.groups);
    setSelectedStyle(STARTER_SESSION.style);
    setProgramSession({ ...STARTER_SESSION });
    setAutoStart(true);
    scrollAppToTop();
  }
  function dismissStarter() {
    try { localStorage.setItem('groove:starterDismissed', '1'); } catch { /* storage blocked */ }
    setStarterGone(true);
  }

  function beginProgramSession(sess) {
    setPlanning(null);
    setStartingPlan(null);
    setSelectedDate(todayLocalISO());
    setCleanSlate(false);
    if (sess.kind === 'aerobic') {
      // Cardio day: set up an easy walk to swap or confirm, then tap Log Workout.
      setSelectedLocation(completedWorkouts[0]?.location || 'The Great Outdoors');
      setMovementMode('Aerobic');
      setSelectedActivities((prev) => (prev.length ? prev : ['Walking']));
      setSelectedGroups([]);
      setSelectedStyle('');
      setProgramSession(null);
    } else {
      setSelectedLocation(completedWorkouts[0]?.location || 'At the Gym');
      setMovementMode('Resistance');
      setSelectedGroups(sess.groups);
      setSelectedStyle(sess.style);
      setProgramSession(sess);
      setAutoStart(true);
    }
    scrollAppToTop();
  }
  useEffect(() => {
    if (!programRequest) return;
    beginProgramSession(programRequest.session);
    onConsumeProgramRequest && onConsumeProgramRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programRequest]);
  useEffect(() => {
    if (!autoStart || loading || activeWorkoutId) return;
    if (movementMode === 'Resistance' && selectedStyle && selectedGroups.length > 0 && selectedLocation && programSession) {
      setAutoStart(false);
      startWorkout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, loading, movementMode, selectedStyle, selectedGroups, selectedLocation, programSession]);

  // A day picked on Birdseye's calendar: land on Move's first question
  // with that date already chosen, ready to walk through logging.
  useEffect(() => {
    if (!logDate) return;
    setSelectedDate(logDate);
    scrollAppToTop();
    onConsumeLogDate && onConsumeLogDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logDate]);

  useEffect(() => {
    if (!deepLinkWorkoutId || loading) return;
    const idx = completedWorkouts.findIndex((w) => w.id === deepLinkWorkoutId);
    if (idx === -1) return;
    // The linked workout may sit past the "Show More" cutoff; reveal up
    // to it, then scroll once it has rendered.
    if (idx >= historyShown) { setHistoryShown(idx + 1); return; }
    setExpandedHistoryId(deepLinkWorkoutId);
    setScrollPad(true);
    // Wait a beat for the padding and the expanded card to render (and
    // the tab slide to settle) before scrolling it to the top.
    setTimeout(() => {
      document.getElementById(`history-${deepLinkWorkoutId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    onConsumeDeepLink && onConsumeDeepLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkWorkoutId, loading, historyShown]);

  // Most recent logged set for each exercise, across any past workout —
  // shown as "last time" so you can judge whether to push weight up.
  // Also reports days since that session, so the suggestion can account
  // for how much time has passed.
  // The last time this exercise was done (before this workout). With a variation (grip, bar...) it prefers the
  // last set done that same way; `matchedVariant` says whether it found one (otherwise it is the overall last).
  function lastPerformance(exerciseName, variant = null) {
    const all = sets
      .filter((s) => s.exerciseName === exerciseName && s.workoutId !== activeWorkoutId && s.movementType === 'resistance');
    const same = variant ? all.filter((s) => s.distance === variant) : [];
    const matches = (same.length ? same : all)
      .map((s) => {
        const w = workouts.find((wk) => wk.id === s.workoutId);
        return { ...s, startedAt: w?.startedAt || null };
      })
      .filter((s) => s.startedAt)
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    const last = matches[0];
    if (!last) return null;
    return { ...last, daysSince: daysBetween(new Date(), new Date(last.startedAt)), matchedVariant: Boolean(variant && same.length) };
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
    const trimmed = titleCaseWords(name);
    const flex = movementMode === 'Flexibility';
    if (!trimmed || (flex ? customFlexActivities : customActivities).includes(trimmed) || LIFESTYLE_ACTIVITIES.includes(trimmed) || FLEXIBILITY_ACTIVITIES.includes(trimmed)) return;
    await updateProfile({ custom_activities: [...allCustom, flex ? `flex:${trimmed}` : trimmed] });
    if (flex) setSelectedFlexActivities((prev) => [...prev, trimmed]);
    else setSelectedActivities((prev) => [...prev, trimmed]);
  }

  async function removeCustomActivity(name) {
    const flex = movementMode === 'Flexibility';
    await updateProfile({ custom_activities: allCustom.filter((a) => a !== (flex ? `flex:${name}` : name)) });
    if (flex) setSelectedFlexActivities((prev) => prev.filter((a) => a !== name));
    else setSelectedActivities((prev) => prev.filter((a) => a !== name));
  }

  function selectMode(mode) {
    setCombinedLayout('');
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
    if (movementMode === 'Combined') return selectedGroups.length > 0 && Boolean(selectedStyle) && Boolean(combinedLayout);
    if (movementMode === 'Flexibility') return selectedGroups.length > 0 || selectedFlexActivities.length > 0; // stretches, a timed activity, or both
    return false;
  }

  // "Repeat last workout": fills every start choice from the last session and starts it.
  const [quickStart, setQuickStart] = useState(false);
  useEffect(() => { if (quickStart) { setQuickStart(false); startWorkout(); } }); // eslint-disable-line react-hooks/exhaustive-deps
  function readLastStart() {
    try { return JSON.parse(localStorage.getItem('groove:lastStart') || 'null'); } catch { return null; }
  }
  function repeatLastWorkout(l) {
    setSelectedLocation(l.location || '');
    setMovementMode(l.mode || '');
    setSelectedGroups(l.groups || []);
    setSelectedActivities(l.activities || []);
    setSelectedFlexActivities(l.flexActivities || []);
    setFoamRegion(l.foamRegion || 'Full Body');
    setSelectedStyle(l.style || '');
    setCleanSlate(Boolean(l.cleanSlate));
    setCombinedLayout(l.combinedLayout || '');
    setCombinedActivity(l.combinedActivity || '');
    setSelectedDate(todayLocalISO());
    setQuickStart(true);
  }

  function resetStartChoices() {
    setSelectedGroups([]);
    setSelectedActivities([]);
    setSelectedFlexActivities([]);
    setSelectedStyle('');
    setSelectedLocation('');
    setMovementMode('');
    setCombinedLayout('');
    setCombinedActivity('');
    setCleanSlate(false);
    setPlanMinutes(DEFAULT_PLAN_MINUTES);
    setSelectedDate(todayLocalISO());
  }

  async function savePlan() {
    if (!canStartMode() || !planning) return;
    const flexNamesOut = selectedFlexActivities.map((a) => (a === 'Foam Rolling' && !cleanSlate ? `Foam Rolling (${foamRegion})` : a));
    const details = {
      location: selectedLocation,
      mode: movementMode,
      groups: movementMode === 'Aerobic' ? [] : selectedGroups,
      activities: selectedActivities,
      flexActivities: selectedFlexActivities,
      ...(selectedFlexActivities.includes('Foam Rolling') ? { foamRegion } : {}),
      style: movementMode === 'Resistance' || movementMode === 'Combined' ? selectedStyle : '',
      combinedLayout,
      combinedActivity,
      // Aerobic minutes (assumed moderate) count tentatively toward the weekly goal.
      ...(movementMode === 'Aerobic' || movementMode === 'Combined' ? { minutes: planMinutes } : {}),
    };
    const title = workoutTitle(details.groups, movementMode === 'Aerobic' || movementMode === 'Combined' ? selectedActivities : movementMode === 'Flexibility' ? flexNamesOut : []);
    // Editing keeps whatever title/notes were written; a new plan gets an auto title.
    const { error } = planning.id
      ? await supabase.from('planned_workouts').update({ planned_for: planning.date, details }).eq('id', planning.id)
      : await supabase.from('planned_workouts').insert({ planned_for: planning.date, title, details });
    if (error) { setLoadError(`Couldn't save your plan: ${error.message}`); return; }
    setPlanning(null);
    resetStartChoices();
    scrollAppToTop();
    onPlanSaved && onPlanSaved();
  }

  function cancelPlanning() {
    setPlanning(null);
    resetStartChoices();
  }

  async function startWorkout() {
    if (!canStartMode()) return;
    // A suggested lifting workout first asks how the body feels (then comes straight back here).
    if ((movementMode === 'Resistance' || movementMode === 'Combined') && !cleanSlate && !readiness) { setReadinessOpen(true); return; }
    const usesResistance = movementMode === 'Resistance' || movementMode === 'Combined';
    const usesAerobic = movementMode === 'Aerobic' || movementMode === 'Combined';
    const usesFlexibility = movementMode === 'Flexibility';
    const flexNamesOut = selectedFlexActivities.map((a) => (a === 'Foam Rolling' && !cleanSlate ? `Foam Rolling (${foamRegion})` : a));

    let plan = [];
    if (usesResistance && !cleanSlate) {
      // Strength repeats its main lifts on purpose; every other goal avoids anything done in the last 7 days,
      // so the same movement doesn't come around twice in a week (most recent first).
      const weekAgo = Date.now() - 7 * 864e5;
      const lastWorkout = completedWorkouts[0];
      const recentWorkouts = selectedStyle === 'Strength' && programSession && !programSession.flex
        ? (lastWorkout ? [lastWorkout] : [])
        : workouts.filter((w) => !w.deletedAt && new Date(w.startedAt).getTime() >= weekAgo).sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
      const recentNames = recentWorkouts.flatMap((w) => [
        ...sets.filter((x) => x.workoutId === w.id && x.movementType !== 'aerobic' && x.movementType !== 'flexibility').map((x) => x.exerciseName),
        ...(w.plan || []).filter((e) => e && e.type === 'resistance').map((e) => e.name),
      ]);
      let hidden = [];
      try { hidden = JSON.parse(localStorage.getItem('groove:hiddenExercises') || '[]'); } catch { /* */ }
      // A one-muscle program day (chest day, arm day) needs more picks per muscle.
      const perGroup = programSession?.starter ? 1 : programSession ? Math.max(2, Math.ceil(programSession.exercises / Math.max(1, selectedGroups.length))) : 2;
      plan = generateWorkout(selectedGroups, selectedStyle, [...new Set(recentNames)], selectedLocation, perGroup, profile?.gender, [...hidden, ...(programSession?.starter ? beginnerAvoid() : []), ...avoidForAreas([...(readiness?.areas || []), ...injuries.map((i) => i.area)])])
        .map((ex) => ({ ...ex, type: 'resistance', supersetId: null }));
      // Run down: a shorter session with one fewer set per exercise.
      if (readiness?.tired) plan = plan.slice(0, 4).map((ex) => ({ ...ex, sets: Math.max(2, (ex.sets || 3) - 1) }));
    }
    if (usesResistance) {
      // Every resistance session opens with an easy aerobic piece (the
      // client chooses the activity) and a dynamic warm-up (clean slate
      // included) — both removable.
      const warmupDrills = generateDynamicWarmup(selectedGroups);
      plan = [
        { name: WARMUP_AEROBIC_PLACEHOLDER, muscleGroup: 'Cardio', type: 'aerobic', supersetId: null, targetNote: '' },
        ...(warmupDrills.length ? [{ name: 'Dynamic Warm-up', muscleGroup: 'Warm-up', type: 'warmup', supersetId: null, drills: warmupDrills }] : []),
        ...plan,
        // 1-2 stretch/balance drills at the end, color-coded to their goals.
        ...(cleanSlate ? [] : generateCooldown(selectedGroups, {
          flexibility: profile?.track_flexibility_goal !== false,
          balance: profile?.track_balance_goal === true || Number(profile?.age) >= 65,
        })),
      ];
    }
    if (usesFlexibility) {
      // Foam rolling goes first (roll, then stretch). With Clean slate it stays a plain timed activity.
      const usedRolls = new Set();
      const rolls = cleanSlate || !selectedFlexActivities.includes('Foam Rolling') ? [] : generateFoamRollPlan(`Foam Roll: ${foamRegion}`, usedRolls);
      plan = cleanSlate ? [] : [...rolls, ...generateFlexibilityPlan(selectedGroups)];
      const flexActivityEntries = selectedFlexActivities.filter((n) => cleanSlate || n !== 'Foam Rolling').map((name) => ({
        name, muscleGroup: 'Flexibility', type: 'flexibility-activity', supersetId: null, targetNote: '',
      }));
      plan = [...plan, ...flexActivityEntries];
    }
    if (usesAerobic) {
      // Stretching-type names picked here are flexibility work, not cardio.
      const activityEntries = selectedActivities.map((name) => (FLEX_ONLY_RE.test(name)
        ? { name, muscleGroup: 'Flexibility', type: 'flexibility-activity', supersetId: null, targetNote: '' }
        : { name, muscleGroup: 'Cardio', type: 'aerobic', supersetId: null, targetNote: '' }));
      plan = [...plan, ...activityEntries];
    }

    // A session from a program sets the number of exercises, sets and reps.
    const sameGroups = programSession && selectedGroups.length === programSession.groups.length && programSession.groups.every((g) => selectedGroups.includes(g));
    const appliedSession = programSession && !cleanSlate && movementMode === 'Resistance' && selectedStyle === programSession.style && sameGroups ? programSession : null;
    if (appliedSession) {
      let j = 0;
      plan = plan.flatMap((ex) => {
        if (ex.type !== 'resistance') return [ex];
        const idx = j++;
        if (idx >= appliedSession.exercises) return [];
        const rxn = idx < appliedSession.mainCount || !appliedSession.acc ? appliedSession.presc : appliedSession.acc;
        return [{ ...ex, sets: rxn.sets, reps: rxn.reps }];
      });
    }

    const isToday = selectedDate === todayLocalISO();
    // Noon avoids the date silently shifting by a day if this ever
    // crosses a UTC day boundary near midnight in the client's time zone.
    const startedAt = isToday ? new Date().toISOString() : new Date(`${selectedDate}T12:00:00`).toISOString();

    const { data, error } = await supabase
      .from('workouts')
      .insert({
        muscle_groups: usesResistance || usesFlexibility ? selectedGroups : [],
        activities: usesAerobic ? selectedActivities : usesFlexibility ? flexNamesOut : [],
        movement_mode: movementMode,
        style: usesResistance ? selectedStyle : null,
        location: selectedLocation,
        started_at: startedAt,
        plan,
      })
      .select()
      .single();
    if (error) { setLoadError(error.message); return; }
    if ((readiness && (readiness.areas.length > 0 || readiness.tired)) || injuries.length > 0) { try { localStorage.setItem(`groove:readiness:${data.id}`, JSON.stringify({ areas: readiness?.areas || [], tired: Boolean(readiness?.tired), injuries: injuries.map((i) => i.label) })); } catch { /* storage blocked */ } }
    setReadiness(null);
    // Remembered so "Repeat last workout" can start the same kind of session in one tap.
    if (!programSession) {
      try {
        localStorage.setItem('groove:lastStart', JSON.stringify({
          title: workoutTitle(selectedGroups, usesAerobic ? selectedActivities : usesFlexibility ? flexNamesOut : []),
          foamRegion,
          location: selectedLocation, mode: movementMode, groups: selectedGroups, activities: selectedActivities,
          flexActivities: selectedFlexActivities, style: selectedStyle, cleanSlate, combinedLayout, combinedActivity,
        }));
      } catch { /* storage blocked */ }
    }
    // Carrying out a planned workout uses it up.
    if (startingPlan) {
      await supabase.from('planned_workouts').delete().eq('id', startingPlan.id);
      setStartingPlan(null);
    }
    if (cleanSlate) { try { localStorage.setItem(`groove:cleanSlate:${data.id}`, '1'); } catch { /* storage blocked */ } }
    if (appliedSession) {
      try { localStorage.setItem(`groove:programSession:${data.id}`, JSON.stringify({ program: program ? programTitle(program) : 'Starter', name: appliedSession.name, main: appliedSession.presc, acc: appliedSession.acc, exercises: appliedSession.exercises, mainCount: appliedSession.mainCount, phase: appliedSession.phase })); } catch { /* storage blocked */ }
    }
    setProgramSession(null);
    if (movementMode === 'Combined' && combinedLayout) {
      try { localStorage.setItem(`groove:combinedLayout:${data.id}`, combinedLayout); } catch { /* storage blocked */ }
    }
    if (movementMode === 'Combined' && combinedActivity) {
      try { localStorage.setItem(`groove:combinedActivity:${data.id}`, combinedActivity); } catch { /* storage blocked */ }
    }
    setCombinedLayout('');
    setCombinedActivity('');
    setWorkouts((prev) => [mapWorkout(data), ...prev]);
    setActiveWorkoutId(data.id);
    setPlanExercises(plan);
    setSelectedGroups([]);
    setSelectedActivities([]);
    setSelectedFlexActivities([]);
    setSelectedStyle('');
    setSelectedLocation('');
    setMovementMode('');
    setCleanSlate(false);
    setSelectedDate(todayLocalISO());
    scrollAppToTop();
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
      prev.map((e, i) => (i === index
        ? { ...e, name: next.name, ...(next.muscleGroup ? { muscleGroup: next.muscleGroup } : {}), sets: ex.type === 'flexibility' ? (next.sets ?? ex.sets) : ex.sets, reps: ex.type === 'flexibility' ? (next.reps ?? ex.reps) : ex.reps }
        : e))
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

  // Turn a standing exercise into a superset after the workout has started.
  function pairExisting(i) {
    setPlanExercises((prev) => {
      const a = prev[i]; const b = prev[i + 1];
      if (!a || !b || a.supersetId || b.supersetId || a.type !== 'resistance' || b.type !== 'resistance') return prev;
      const id = uid();
      const n = [...prev];
      n[i] = { ...a, supersetId: id }; n[i + 1] = { ...b, supersetId: id };
      return n;
    });
  }
  function pairNew(i, pick) {
    setPlanExercises((prev) => {
      const a = prev[i];
      if (!a || a.supersetId) return prev;
      const id = uid();
      const partner = { name: pick.name, muscleGroup: pick.muscleGroup || a.muscleGroup, type: 'resistance', supersetId: id, sets: a.sets, reps: a.reps };
      const n = [...prev];
      n[i] = { ...a, supersetId: id };
      n.splice(i + 1, 0, partner);
      return n;
    });
  }
  function pairCardio(i, name) {
    setPlanExercises((prev) => {
      const a = prev[i];
      if (!a || a.supersetId) return prev;
      const id = uid();
      const partner = { name, muscleGroup: 'Cardio', type: 'aerobic', supersetId: id, targetNote: '' };
      const n = [...prev];
      n[i] = { ...a, supersetId: id };
      n.splice(i + 1, 0, partner);
      return n;
    });
    upgradeToCombinedIfNeeded('aerobic');
  }
  function unpair(i) {
    setPlanExercises((prev) => {
      const id = prev[i]?.supersetId;
      return id ? prev.map((e) => (e.supersetId === id ? { ...e, supersetId: null } : e)) : prev;
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

  function addAerobic(name, targetNote, insertAt = null) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const flex = FLEX_ONLY_RE.test(trimmed);
    const newEx = { name: trimmed, muscleGroup: flex ? 'Flexibility' : 'Cardio', type: flex ? 'flexibility-activity' : 'aerobic', supersetId: null, targetNote: targetNote.trim() };
    setPlanExercises((prev) => {
      if (insertAt == null || insertAt >= prev.length) return [...prev, newEx];
      return [...prev.slice(0, insertAt), newEx, ...prev.slice(insertAt)];
    });
    if (!flex) upgradeToCombinedIfNeeded('aerobic');
  }

  // A single stretch (holds, like the suggested ones in a flexibility workout).
  function addStretch(name, muscleGroup, lib) {
    setPlanExercises((prev) => [...prev, { name, muscleGroup: muscleGroup || 'Flexibility', type: 'flexibility', supersetId: null, sets: lib?.sets ?? 2, reps: lib?.reps ?? '20-30s' }]);
  }

  function addFlexibility(name, targetNote = '') {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPlanExercises((prev) => [...prev, { name: trimmed, muscleGroup: 'Flexibility', type: 'flexibility-activity', supersetId: null, targetNote: targetNote.trim() }]);
  }

  function addWarmup(muscleGroups) {
    const drills = generateDynamicWarmup(muscleGroups);
    if (drills.length === 0) return;
    const newEx = { name: 'Dynamic Warm-up', muscleGroup: 'Warm-up', type: 'warmup', supersetId: null, drills };
    // Aerobic work done as part of the warm-up stays above the dynamic
    // drills — so slot the drills in after any leading aerobic entries.
    setPlanExercises((prev) => {
      if (prev.some((e) => e.type === 'warmup')) return prev;
      let at = 0;
      while (at < prev.length && (prev[at].type === 'aerobic' || prev[at].type === 'flexibility-activity')) at++;
      return [...prev.slice(0, at), newEx, ...prev.slice(at)];
    });
  }

  function updateWarmupDrills(updater) {
    setPlanExercises((prev) => prev.map((e) => (e.type === 'warmup' ? { ...e, drills: updater(e.drills) } : e)));
  }
  function addWarmupDrill(name) {
    const trimmed = titleCaseWords(name);
    if (!trimmed) return;
    updateWarmupDrills((drills) => [...drills, trimmed]);
  }
  function renameWarmupDrill(index, name) {
    const trimmed = titleCaseWords(name);
    if (!trimmed) return;
    updateWarmupDrills((drills) => drills.map((d, i) => (i === index ? trimmed : d)));
  }
  function removeWarmupDrill(index) {
    updateWarmupDrills((drills) => drills.filter((_, i) => i !== index));
  }
  function reorderWarmupDrill(fromIndex, toIndex) {
    updateWarmupDrills((drills) => {
      if (toIndex < 0 || toIndex >= drills.length || fromIndex === toIndex) return drills;
      const next = [...drills];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function removeExercise(index, hasLoggedSets) {
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
    // A workout with nothing logged would just clutter History as "0 exercises".
    if (!sets.some((s) => s.workoutId === activeWorkoutId)) {
      if (window.confirm("Nothing's logged yet. Cancel this workout instead?")) discardWorkout(true);
      return;
    }
    const { data, error } = await supabase
      .from('workouts')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', activeWorkoutId)
      .select()
      .single();
    if (error) { setLoadError(error.message); return; }
    setWorkouts((prev) => prev.map((w) => (w.id === activeWorkoutId ? mapWorkout(data) : w)));
    try { localStorage.removeItem(LIVE_BACKUP_KEY); } catch { /* */ }
    setCheckInWorkoutId(activeWorkoutId);
    setActiveWorkoutId(null);
    setPlanExercises([]);
    scrollAppToTop();
  }

  // Effort + "anything hurt?" after a workout. If those columns haven't been
  // added in Supabase yet the save quietly does nothing.
  async function saveCheckIn(fields, reflect = false) {
    const id = checkInWorkoutId;
    setCheckInWorkoutId(null);
    // One sheet now: the reflection is offered inside it, so there's no second pop-up after.
    if (reflect && onJournalAfterWorkout) onJournalAfterWorkout(id);
    if (fields) {
      await supabase.from('workouts').update(fields).eq('id', id);
      if (fields.felt_off) notifyFeltOff();
    }
  }

  // Reopens a finished workout as the live one, so a session that was
  // ended early (or lost mid-session) picks up exactly where it left off
  // with the full logging UI, instead of being limited to history editing.
  async function resumeWorkout(w) {
    // A brand-new workout with nothing logged (e.g. one the app started on its
    // own) shouldn't block going back to the real one: clear it first.
    if (activeWorkoutId && activeWorkoutId !== w.id) {
      if (sets.some((x) => x.workoutId === activeWorkoutId)) return;
      const emptyId = activeWorkoutId;
      const { error: delError } = await supabase.from('workouts').delete().eq('id', emptyId);
      if (delError) { setLoadError(delError.message); return; }
      setWorkouts((prev) => prev.filter((x) => x.id !== emptyId));
      try { localStorage.removeItem(LIVE_BACKUP_KEY); } catch { /* */ }
    }
    const { data, error } = await supabase
      .from('workouts')
      .update({ completed_at: null })
      .eq('id', w.id)
      .select()
      .single();
    if (error) { setLoadError(error.message); return; }
    const mapped = mapWorkout(data);
    let plan = (mapped.plan || []).filter((e) => !(e && e.kind === 'strava'));
    if (plan.length === 0) {
      const seen = new Set();
      const wSets = sets.filter((x) => x.workoutId === w.id);
      wSets.forEach((x) => {
        if (seen.has(x.exerciseName)) return;
        seen.add(x.exerciseName);
        const type = x.movementType === 'aerobic' ? 'aerobic' : x.movementType === 'flexibility' ? 'flexibility' : 'resistance';
        plan.push(type === 'resistance'
          ? { name: x.exerciseName, muscleGroup: x.muscleGroup, type, supersetId: null, sets: 3, reps: '8-12' }
          : { name: x.exerciseName, muscleGroup: x.muscleGroup || 'Cardio', type, supersetId: null, targetNote: '' });
      });
    }
    setWorkouts((prev) => prev.map((x) => (x.id === w.id ? mapped : x)));
    setEditingHistoryId(null);
    setPlanExercises(plan);
    setActiveWorkoutId(w.id);
    scrollAppToTop();
  }

  // Fix a mis-tapped location after the workout has started.
  async function changeLocation(loc) {
    if (!activeWorkoutId || !loc) return;
    const { data, error } = await supabase.from('workouts').update({ location: loc }).eq('id', activeWorkoutId).select().single();
    if (error) { setLoadError(error.message); return; }
    setWorkouts((prev) => prev.map((w) => (w.id === activeWorkoutId ? mapWorkout(data) : w)));
  }

  async function discardWorkout(skipConfirm = false) {
    if (skipConfirm !== true && !window.confirm('Cancel this workout? Anything you logged in it will be cleared.')) return;
    const { error } = await supabase.from('workouts').delete().eq('id', activeWorkoutId);
    if (error) { setLoadError(error.message); return; }
    setWorkouts((prev) => prev.filter((w) => w.id !== activeWorkoutId));
    setSets((prev) => prev.filter((s) => s.workoutId !== activeWorkoutId));
    try { localStorage.removeItem(LIVE_BACKUP_KEY); } catch { /* */ }
    setActiveWorkoutId(null);
    setPlanExercises([]);
    scrollAppToTop();
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-32" aria-busy="true" />
    );
  }

  // Muscle groups worked recently, for the 48-hour recovery note on the start screen.
  const workoutStart = new Map(workouts.map((w) => [w.id, w.startedAt]));
  const recentTrained = sets
    .filter((s) => s.movementType !== 'aerobic' && s.movementType !== 'flexibility' && s.muscleGroup && s.muscleGroup !== 'Warm-up' && workoutStart.has(s.workoutId))
    .map((s) => ({ group: s.muscleGroup, at: workoutStart.get(s.workoutId) }));

  // A flex day (after the plan's sessions are done) and a "suggest for me" muscle pick both come from what this week has covered.
  const weekStart = startOfWeek(new Date(), profile?.week_start_day || 'sunday');
  const flexSug = flexSuggestion(recentTrained, weekStart, Date.now(), true);
  const flexForCard = flexSug ? { label: flexSug.label, session: flexSession(flexSug) } : null;
  const pickSug = flexSuggestion(recentTrained, weekStart);

  return (
    <div
      style={activeWorkout ? { border: `2px solid ${SKY}`, borderRadius: 16 } : undefined}
      className={`max-w-md mx-auto px-4 pb-12 ${activeWorkout ? 'pt-3' : ''}`}
    >
      {loadError && (
        <button onClick={() => setLoadError('')} style={{ background: INK_2, color: BRICK }} className="w-full rounded-md px-4 py-3 mb-4 text-sm text-center">
          {/load failed|failed to fetch|networkerror/i.test(loadError) ? "Couldn't reach the server for a moment. Check that your last set saved. Tap to dismiss." : `${loadError} (tap to dismiss)`}
        </button>
      )}

      {readinessOpen && <ReadinessSheet injuries={injuries} onCancel={() => setReadinessOpen(false)} onConfirm={(r) => { setReadiness(r); setReadinessOpen(false); setQuickStart(true); }} />}
      {checkInWorkoutId && <CheckInSheet onSave={(f) => saveCheckIn(f)} onReflect={onJournalAfterWorkout ? (f) => saveCheckIn(f, true) : null} onSkip={() => setCheckInWorkoutId(null)} />}
      {showProgramSheet && user && (
        <ProgramSheet userId={user.id} program={program} onSave={saveProgram} onClose={() => setShowProgramSheet(false)} weekStartDay={profile?.week_start_day || 'sunday'} />
      )}

      {!activeWorkout && lostBackup && (
        <div style={{ background: INK_2, borderLeft: `3px solid ${AMBER}` }} className="rounded-md px-4 py-3 mb-4 text-center">
          <div style={{ color: PAPER }} className="text-sm font-medium mb-1">Looks like a workout was lost</div>
          <div style={{ color: TEXT_SOFT }} className="text-sm mb-3">
            We kept a copy of your last session's exercises ({new Date(lostBackup.savedAt).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}). Restore it to keep going — logged sets may need re-entering.
          </div>
          <div className="flex gap-2">
            <button onClick={restoreLostWorkout} style={{ background: AMBER, color: ON_AMBER }} className="flex-1 rounded-md py-2 text-sm font-medium">Restore workout</button>
            <button onClick={dismissLostWorkout} style={{ color: TEXT_SOFT }} className="px-3 text-sm">Dismiss</button>
          </div>
        </div>
      )}

      {activeWorkout ? (
        <ActiveWorkout
          onProgress={(p) => setProgress((prev) => (prev.done === p.done && prev.total === p.total ? prev : p))}
          guide={workoutGuide(activeWorkout)}
          onChangeLocation={changeLocation}
          combinedActivity={(() => {
            try { return localStorage.getItem(`groove:combinedActivity:${activeWorkout.id}`) || ''; } catch { return ''; }
          })()}
          combinedLayout={(() => {
            if (activeWorkout.movementMode !== 'Combined') return null;
            try { return localStorage.getItem(`groove:combinedLayout:${activeWorkout.id}`) || 'serial'; } catch { return 'serial'; }
          })()}
          workout={activeWorkout}
          exercises={planExercises}
          sets={sets.filter((s) => s.workoutId === activeWorkout.id)}
          lastPerformance={lastPerformance}
          bodyweight={bodyweight}
          hrZones={hrZones}
          onLogSet={logSet}
          onDeleteSet={deleteSet}
          onUpdateSet={updateSet}
          onReplace={replaceExercise}
          onMoveGroup={moveGroup}
          onReorderGroup={reorderGroup}
          onPairExisting={pairExisting}
          onPairNew={pairNew}
          onPairCardio={pairCardio}
          onUnpair={unpair}
          onAddExercise={addExercise}
          onAddSuperset={addSuperset}
          onAddAerobic={addAerobic}
          onAddFlexibility={addFlexibility}
          onAddStretch={addStretch}
          onAddWarmup={() => addWarmup(activeWorkout.muscleGroups)}
          onAddWarmupDrill={addWarmupDrill}
          onRenameWarmupDrill={renameWarmupDrill}
          onRemoveWarmupDrill={removeWarmupDrill}
          onReorderWarmupDrill={reorderWarmupDrill}
          onRemoveExercise={removeExercise}
          onFinish={finishWorkout}
          onDiscard={() => discardWorkout(true)}
        />
      ) : (
        <>
        {planning && (
          <div style={{ background: INK_2, borderTop: `2px solid ${SKY}` }} className="rounded-lg px-4 py-3 mb-2 text-center">
            <div style={{ color: SKY }} className="text-base uppercase tracking-wide font-bold">Planning a workout</div>
            <button onClick={cancelPlanning} style={{ color: TEXT_SOFT }} className="text-sm underline mt-0.5">Cancel</button>
          </div>
        )}
        {startingPlan && !planning && (
          <div style={{ background: INK_2, borderTop: `2px solid ${SKY}` }} className="rounded-lg px-4 py-3 mb-2 text-center">
            <div style={{ color: SKY }} className="text-base uppercase tracking-wide font-bold">{selectedDate < todayLocalISO() ? 'Missed plan' : "Today's plan"}</div>
            <div style={{ color: PAPER }} className="text-sm font-medium">{startingPlan.title}</div>
            <button onClick={() => { setStartingPlan(null); resetStartChoices(); }} style={{ color: TEXT_SOFT }} className="text-sm underline mt-0.5">Dismiss</button>
          </div>
        )}
        {!planning && program && (
          <MoveProgramCard program={program} week={programWeek} lifted={programLifted} flex={flexForCard} onStart={beginProgramSession} onManage={() => setShowProgramSheet(true)} />
        )}
        {!planning && !program && !starterGone && !startingPlan && !selectedLocation && !movementMode && !completedWorkouts.some((w) => w.movementMode === 'Resistance' || w.movementMode === 'Combined') && (
          <div style={{ background: INK_2, borderTop: `2px solid ${SKY}` }} className="rounded-lg px-4 py-3 mb-2 text-center">
            <div style={{ color: PAPER }} className="text-base font-medium">New to lifting? Start here</div>
            <div style={{ color: TEXT_SOFT }} className="text-sm mt-0.5 mb-2.5">A gentle full-body workout: 5 simple moves, 2 light sets each. About 25 minutes.</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => beginStarter('At the Gym')} style={{ background: SKY, color: INK }} className="rounded-md py-2.5 text-sm font-medium">At the gym</button>
              <button onClick={() => beginStarter('In the Home')} style={{ background: INK_3, color: PAPER }} className="rounded-md py-2.5 text-sm font-medium">At home</button>
            </div>
            <button onClick={dismissStarter} style={{ color: TEXT_SOFT }} className="text-sm mt-2 py-1">No thanks, I know my way around</button>
          </div>
        )}
        {!planning && !startingPlan && !selectedLocation && !movementMode && (() => {
          const l = readLastStart();
          if (!l || !l.mode || !l.location) return null;
          return (
            <button
              onClick={() => repeatLastWorkout(l)}
              style={{ background: INK_2, borderLeft: `3px solid ${SKY}` }}
              className="w-full rounded-lg px-4 py-2.5 mb-2 flex items-center justify-between gap-3 text-left"
            >
              <span className="min-w-0">
                <span style={{ color: PAPER }} className="text-sm font-medium block truncate">Repeat last workout</span>
                <span style={{ color: TEXT_SOFT }} className="text-sm block truncate">{[l.title, l.style, l.location].filter(Boolean).join(' · ')}</span>
              </span>
              <span style={{ color: SKY }} className="shrink-0"><Play size={16} /></span>
            </button>
          );
        })()}
        <StartWorkout
          recentTrained={recentTrained}
          pickSuggestion={pickSug}
          onPickGroups={setSelectedGroups}
          planning={planning}
          dataTour="move-start"
          gender={profile?.gender}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
          movementMode={movementMode}
          onSelectMode={selectMode}
          combinedLayout={combinedLayout}
          onSelectCombinedLayout={setCombinedLayout}
          combinedActivity={combinedActivity}
          onSelectCombinedActivity={setCombinedActivity}
          selectedGroups={selectedGroups}
          onToggleGroup={toggleGroup}
          selectedActivities={selectedActivities}
          onToggleActivity={toggleActivity}
          selectedFlexActivities={selectedFlexActivities}
          foamRegion={foamRegion}
          onFoamRegion={setFoamRegion}
          onToggleFlexActivity={toggleFlexActivity}
          customActivities={customActivities}
          customFlexActivities={customFlexActivities}
          onAddCustomActivity={addCustomActivity}
          onRemoveCustomActivity={removeCustomActivity}
          selectedStyle={selectedStyle}
          onSelectStyle={setSelectedStyle}
          planMinutes={planMinutes}
          onPlanMinutes={setPlanMinutes}
          onStart={planning ? savePlan : startWorkout}
          canStart={canStartMode()}
          assignedProgram={planning ? null : assignedProgram}
          onStartAssignedProgram={startAssignedProgram}
          cleanSlate={cleanSlate}
          onToggleCleanSlate={setCleanSlate}
        />
        {!planning && !program && <MoveProgramLink onOpen={() => setShowProgramSheet(true)} />}
        </>
      )}

      <div data-tour="move-history" className="mt-8">
        <div style={{ color: TEXT_SOFT }} className="text-base uppercase tracking-wide mb-2 text-center">History</div>
        {completedWorkouts.length === 0 ? (
          <div style={{ background: INK_2, color: TEXT_SOFT }} className="rounded-md px-4 py-6 text-center text-sm">
            No workouts logged yet — finish one and it'll show up here.
          </div>
        ) : (
          <div className="space-y-2">
            {completedWorkouts.slice(0, historyShown).map((w) => {
              const workoutSets = sets.filter((s) => s.workoutId === w.id);
              const exerciseNames = [...new Set(workoutSets.map((s) => s.exerciseName))];
              const expanded = expandedHistoryId === w.id;
              const editing = editingHistoryId === w.id;
              const date = new Date(w.startedAt);
              const total = totalWeightLifted(workoutSets);
              const kcal = estimateKcal(workoutSets, bodyweight);
              return (
                <div id={`history-${w.id}`} key={w.id} style={{ background: INK_2, borderLeft: `3px solid ${w.fromStrava ? STRAVA_ORANGE : SKY}` }} className="rounded-md px-4 py-3">
                  <button
                    onClick={() => { setExpandedHistoryId(expanded ? null : w.id); if (expanded) setEditingHistoryId(null); }}
                    className="w-full flex items-center justify-between gap-3"
                  >
                    <span className="flex flex-col items-center justify-center gap-1 w-5 shrink-0" aria-label={historyKinds(w, workoutSets).map((k) => k.label).join(' and ')}>
                      {historyKinds(w, workoutSets).map(({ key, Icon, color }) => <Icon key={key} size={16} color={color} />)}
                    </span>
                    <div className="text-left flex-1 min-w-0">
                      <div style={{ color: PAPER }} className="text-sm font-medium flex items-center gap-1.5 min-w-0">
                        {w.fromStrava && <StravaMark size={14} title="From Strava" />}
                        <span className="truncate">
                          {historyTitle(w)}
                          {w.stravaTitle && w.stravaTitle.toLowerCase() !== historyTitle(w).toLowerCase() && (
                            <> - <em style={{ color: PAPER_DIM }} className="font-normal">{w.stravaTitle}</em></>
                          )}
                        </span>
                      </div>
                      <div style={{ color: TEXT_SOFT }} className="text-[13px] truncate">
                        {dayLabel(date)} · {workoutSummary(workoutSets, exerciseNames.length).replace(/(\d+) exercises?/, '$1 ex')}
                        {total > 0 && ` · ${Math.round(total).toLocaleString()} lb`}
                        {kcal > 0 && ` · ${kcal} kcal`}
                      </div>
                    </div>
                    {expanded ? <ChevronUp size={16} color={TEXT_SOFT} /> : <ChevronDown size={16} color={TEXT_SOFT} />}
                  </button>
                  {expanded && (
                    <div style={{ borderTop: `1px dashed ${INK_3}` }} className="mt-3 pt-3 space-y-3">
                      <div style={{ color: TEXT_SOFT }} className="text-sm text-center">
                        {workoutTitle(w.muscleGroups, w.activities)}{w.location && ` · ${w.location}`}
                      </div>
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
                                  <div key={s.id} data-armed={setArm.armed === s.id} style={setArm.armed === s.id ? { background: BRICK, color: PAPER } : undefined} className="flex items-center gap-2 justify-center rounded-md py-0.5">
                                    {s.movementType === 'aerobic' ? (
                                      <span style={{ color: PAPER_DIM }} className="text-sm">
                                        {formatIntensityMinutes(s)}{s.distance ? ` · ${s.distance}` : ''}
                                      </span>
                                    ) : isFlexibility ? (
                                      <span style={{ color: PAPER_DIM }} className="text-sm">
                                        {s.lightMinutes || s.moderateMinutes || s.vigorousMinutes ? formatIntensityMinutes(s) : s.durationSeconds ? `${s.durationSeconds}s` : s.reps ? `${s.reps} ${s.muscleGroup === 'Warm-up' ? 'drills' : 'reps'}` : '—'}
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
                                    <button onClick={() => setArm.press(s.id, () => deleteSet(s.id))} data-armed={setArm.armed === s.id} style={{ color: setArm.armed === s.id ? PAPER : BRICK }} className="p-2 -m-1">
                                      <X size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ color: TEXT_SOFT }} className="text-sm text-center">
                                {exSets.map((s) => (
                                  s.movementType === 'aerobic'
                                    ? `${formatIntensityMinutes(s)}${s.distance ? ` · ${s.distance}` : ''}`
                                    : s.movementType === 'flexibility'
                                    ? (s.durationSeconds ? `${s.durationSeconds}s` : s.reps ? `${s.reps} drills` : '—')
                                    : `${s.distance ? `${s.distance} ` : ''}${s.weight ?? '—'}×${s.reps ?? '—'}`
                                )).join(', ')}
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
                          {editing ? 'Done editing' : 'Edit this workout'}
                        </button>
                        {(!activeWorkout || !sets.some((x) => x.workoutId === activeWorkout.id)) && !editing && (
                          <button
                            onClick={() => resumeWorkout(w)}
                            style={{ color: LIME }}
                            className="text-sm py-2 text-center underline"
                          >
                            Resume workout
                          </button>
                        )}
                        <button
                          onClick={() => setArm.press('w' + w.id, () => deleteWorkout(w.id))}
                          data-armed={setArm.armed === 'w' + w.id}
                          style={setArm.armed === 'w' + w.id ? { background: BRICK, color: PAPER } : { color: BRICK }}
                          className={`text-sm py-2 text-center ${setArm.armed === 'w' + w.id ? 'rounded-md' : 'underline'}`}
                        >
                          {setArm.armed === 'w' + w.id ? 'Tap again to delete' : 'Delete workout'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {completedWorkouts.length > historyShown && (
              <button
                onClick={() => setHistoryShown((n) => n + HISTORY_PAGE)}
                style={{ color: SKY }}
                className="w-full text-sm py-2 text-center underline"
              >
                Show More
              </button>
            )}
          </div>
        )}
        <div aria-hidden style={{ height: scrollPad ? '75vh' : 0 }} />
      </div>
    </div>
  );
}

function StartWorkout({
  gender,
  selectedDate, onSelectDate,
  selectedLocation, onSelectLocation,
  movementMode, onSelectMode, combinedLayout, onSelectCombinedLayout, combinedActivity, onSelectCombinedActivity,
  selectedGroups, onToggleGroup,
  selectedActivities, onToggleActivity,
  selectedFlexActivities, onToggleFlexActivity, foamRegion, onFoamRegion,
  customActivities, customFlexActivities = [], onAddCustomActivity, onRemoveCustomActivity,
  selectedStyle, onSelectStyle, onStart, canStart,
  assignedProgram, onStartAssignedProgram,
  cleanSlate, onToggleCleanSlate,
  planning, planMinutes, onPlanMinutes,
  recentTrained = [],
  pickSuggestion = null, onPickGroups,
  dataTour,
}) {
  const recoveryHits = recentlyTrained(selectedGroups, recentTrained);
  const startEmoji = gender === 'Female' ? ' 💃🏻' : gender === 'Male' ? ' 🕺' : '';
  const [skipProgram, setSkipProgram] = useState(false);
  const [askIntegrated, setAskIntegrated] = useState(false);
  const [pendingLayout, setPendingLayout] = useState(null);
  const [pendingActivity, setPendingActivity] = useState(null);
  const [pendingIntensity, setPendingIntensity] = useState('Moderate');
  const [pendingMinutes, setPendingMinutes] = useState(5);
  const closeIntegrated = () => { setAskIntegrated(false); setPendingLayout(null); setPendingActivity(null); };
  const [showCombinedInfo, setShowCombinedInfo] = useState(false);
  // Tapping Start while something's missing used to just silently do
  // nothing (the button was disabled, with no explanation) — which read
  // as the app freezing. Now the button always responds: if something's
  // missing, it flags which section needs attention instead of no-op'ing.
  const [attemptedStart, setAttemptedStart] = useState(false);
  const showProgramOffer = assignedProgram && selectedLocation && !skipProgram;

  // Each answered question auto-scrolls so its own heading sits at the
  // top of the screen — the newly-revealed next question lands right
  // below it, already in view, instead of being left off-screen below
  // the fold. Scrolling to the question just answered (rather than the
  // new one) keeps that one visible too, matching "previous question up
  // top, followed by the next one."
  const locationHeadingRef = useRef(null);
  const modeHeadingRef = useRef(null);
  const activitiesHeadingRef = useRef(null);
  const flexActivitiesHeadingRef = useRef(null);
  const groupsHeadingRef = useRef(null);
  // Once answered, the location and workout-type steps fold into one line of chips (tap a chip to change it).
  const [editLoc, setEditLoc] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const styleHeadingRef = useRef(null);
  function scrollHeadingToTop(ref) {
    requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  useEffect(() => { if (selectedLocation) scrollHeadingToTop(locationHeadingRef); }, [selectedLocation]);
  useEffect(() => { if (movementMode) scrollHeadingToTop(modeHeadingRef); }, [movementMode]);
  useEffect(() => { if (selectedActivities.length > 0) scrollHeadingToTop(activitiesHeadingRef); }, [selectedActivities.length]);
  useEffect(() => { if (selectedFlexActivities.length > 0) scrollHeadingToTop(flexActivitiesHeadingRef); }, [selectedFlexActivities.length]);
  useEffect(() => { if (selectedGroups.length > 0) scrollHeadingToTop(groupsHeadingRef); }, [selectedGroups.length]);
  useEffect(() => { if (selectedStyle) scrollHeadingToTop(styleHeadingRef); }, [selectedStyle]);

  const needsGroups = movementMode === 'Resistance' || movementMode === 'Combined' || movementMode === 'Flexibility';
  const needsActivities = movementMode === 'Aerobic';
  const needsFlexActivities = movementMode === 'Flexibility';
  const needsStyle = movementMode === 'Resistance' || movementMode === 'Combined';

  const styleMissing = attemptedStart && needsStyle && !selectedStyle;
  const groupsMissing = attemptedStart && needsGroups && selectedGroups.length === 0 && !(movementMode === 'Flexibility' && selectedFlexActivities.length > 0);
  const activitiesMissing = attemptedStart && needsActivities && selectedActivities.length === 0;
  const flexActivitiesMissing = attemptedStart && needsFlexActivities && selectedFlexActivities.length === 0 && selectedGroups.length === 0;
  const modeMissing = attemptedStart && selectedLocation && !movementMode;

  function handleStartClick() {
    if (canStart) { onStart(); return; }
    setAttemptedStart(true);
  }

  const isToday = selectedDate === todayLocalISO();
  const friendlyDate = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div data-tour={dataTour} style={{ background: INK_2, borderTop: `2px solid ${SKY}` }} className="rounded-lg px-4 py-3.5 mb-2">
      <div className="flex items-center justify-center gap-2 mb-2.5">
        {!planning && (
          <button
            onClick={() => onSelectDate(todayLocalISO())}
            style={{ background: isToday ? SKY : INK_3, color: isToday ? INK : PAPER_DIM }}
            className="rounded-full px-3.5 py-1 text-sm font-medium"
          >
            Today
          </button>
        )}
        <div className="relative">
          <button
            type="button"
            tabIndex={-1}
            style={{ background: !isToday || planning ? SKY : INK_3, color: !isToday || planning ? INK : PAPER_DIM }}
            className="rounded-full px-3.5 py-1.5 text-sm font-medium"
          >
            {planning ? friendlyDate : isToday ? 'Past Date' : friendlyDate}
          </button>
          {/* An invisible native date input sits directly on top of the
              button so tapping it opens the OS calendar picker in one
              tap, instead of first revealing this input and requiring a
              second tap on it. */}
          <input
            type="date"
            value={selectedDate}
            {...(planning ? { min: todayLocalISO() } : { max: todayLocalISO() })}
            onChange={(e) => { if (e.target.value) onSelectDate(e.target.value); }}
            style={{ colorScheme: 'dark' }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
      {(!selectedLocation || editLoc) && (<>
      <div ref={locationHeadingRef} style={{ color: PAPER }} className="text-base font-medium mb-2 text-center">
        {planning ? 'Where will you move?' : isToday ? 'Where are we moving today?' : 'Where did you move?'}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {WORKOUT_LOCATIONS.map((loc) => {
          const selected = selectedLocation === loc;
          const [left] = locationEmojis(loc, gender);
          return (
            <button
              key={loc}
              onClick={() => { onSelectLocation(selected ? '' : loc); setEditLoc(false); }}
              style={{ background: selected ? SKY : INK_3, color: selected ? INK : PAPER }}
              className="rounded-xl px-1.5 py-2 text-sm font-medium flex flex-col items-center justify-center gap-0.5 leading-tight"
            >
              <span className="text-lg leading-none">{left}</span>
              {/* Always two lines (last word on the second) so all three tiles match. */}
              <span>{loc.split(' ').slice(0, -1).join(' ')}<br />{loc.split(' ').slice(-1)[0]}</span>
            </button>
          );
        })}
      </div>
      </>)}

      {showProgramOffer && (
        <div style={{ background: INK_3, borderLeft: `3px solid ${LIME}` }} className="rounded-md px-4 py-3 mb-5 text-center">
          <div style={{ color: LIME }} className="text-sm uppercase tracking-wide mb-1">Greg assigned</div>
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
          {selectedLocation && !editLoc && (
            <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
              <button onClick={() => setEditLoc(true)} style={{ background: INK_3, color: PAPER }} className="rounded-full px-3.5 py-1.5 text-sm font-medium">
                {locationEmojis(selectedLocation, gender)[0]} {selectedLocation}
              </button>
              {movementMode && !editMode && (
                <button onClick={() => setEditMode(true)} style={{ background: INK_3, color: PAPER }} className="rounded-full px-3.5 py-1.5 text-sm font-medium">
                  {MODE_EMOJI[movementMode]} {modeLabel(movementMode)}
                </button>
              )}
            </div>
          )}
          {(!movementMode || editMode) && (<>
          <div ref={modeHeadingRef} style={{ color: modeMissing ? BRICK : PAPER }} className="text-base font-medium mb-2 text-center">
            What kind of workout?{modeMissing ? ' Pick one to continue' : ''}
          </div>
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {['Aerobic', 'Resistance', 'Flexibility', 'Combined'].map((mode) => {
              const selected = movementMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => { onSelectMode(mode); setEditMode(false); }}
                  style={{ background: selected ? SKY : INK_3, color: selected ? INK : PAPER }}
                  className="rounded-xl px-0.5 py-2.5 flex flex-col items-center gap-0.5"
                >
                  <span className="text-xl leading-none">{MODE_EMOJI[mode]}</span>
                  <span className="text-[13px] font-medium">{modeLabel(mode)}</span>
                </button>
              );
            })}
          </div>
          </>)}
          {movementMode === 'Combined' && (
            <div className="mb-5">
              <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-2 flex items-center justify-center gap-1.5">
                How should the aerobic work fit in?
                <button onClick={() => setShowCombinedInfo(true)} style={{ color: SKY }} className="p-1 -m-1" title="Serial vs. Integrated"><Info size={14} /></button>
              </div>
              <div className="flex gap-2 mb-1.5">
                {[
                  { key: 'serial', label: 'Serial' },
                  { key: 'integrated', label: 'Integrated' },
                ].map(({ key, label }) => {
                  const selected = key === 'serial' ? combinedLayout === 'serial' : combinedLayout.startsWith('integrated');
                  return (
                    <button
                      key={key}
                      onClick={() => (key === 'serial' ? onSelectCombinedLayout('serial') : setAskIntegrated(true))}
                      style={{ background: selected ? SKY : INK_3, color: selected ? INK : PAPER }}
                      className="flex-1 rounded-md py-2.5 text-sm font-medium"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div style={{ color: TEXT_SOFT }} className="text-sm text-center">
                {combinedLayout === 'serial' && 'Resistance and aerobic blocks, one after the other.'}
                {combinedLayout === 'integrated-exercises' && `${combinedActivity ? combinedActivity.split('|')[0] : 'Aerobic'} bursts woven in between exercises.`}
                {combinedLayout === 'integrated-sets' && `${combinedActivity ? combinedActivity.split('|')[0] : 'Aerobic'} bursts woven in between sets.`}
                {!combinedLayout && 'Serial: blocks back to back. Integrated: aerobic mixed into your lifting.'}
              </div>
            </div>
          )}
          {showCombinedInfo && (
            <Portal>
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCombinedInfo(false)}>
                <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" />
                <div style={{ background: INK_2 }} className="relative w-full max-w-sm rounded-xl p-5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-3">
                    <div style={{ color: SKY }} className="text-sm font-medium uppercase tracking-wide">Serial vs. Integrated</div>
                    <button onClick={() => setShowCombinedInfo(false)} style={{ color: TEXT_SOFT }} className="p-1 -m-1"><X size={18} /></button>
                  </div>
                  <div style={{ color: PAPER }} className="text-sm leading-relaxed space-y-3">
                    <p><strong>Serial:</strong> one type at a time, like a run and then your lifts.</p>
                    <p><strong>Integrated:</strong> cardio bursts mixed in between exercises or sets.</p>
                  </div>
                </div>
              </div>
            </Portal>
          )}
          {askIntegrated && (
            <Portal>
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeIntegrated}>
                <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" />
                <div style={{ background: INK_2 }} className="relative w-full max-w-sm rounded-xl p-5" onClick={(e) => e.stopPropagation()}>
                  {!pendingLayout ? (
                    <>
                      <div style={{ color: PAPER }} className="text-base font-medium mb-1">Where should the aerobic work go?</div>
                      <div style={{ color: TEXT_SOFT }} className="text-sm mb-4">You can always add or remove it as you go.</div>
                      <div className="space-y-2">
                        {[
                          { key: 'integrated-exercises', label: 'Between exercises' },
                          { key: 'integrated-sets', label: 'Between sets' },
                        ].map(({ key, label }) => (
                          <button
                            key={key}
                            onClick={() => setPendingLayout(key)}
                            style={{ background: INK_3, color: PAPER }}
                            className="w-full rounded-md py-3 text-sm font-medium"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : pendingActivity ? (
                    <>
                      <div style={{ color: PAPER }} className="text-base font-medium mb-1">{pendingActivity}: how hard, how long?</div>
                      <div style={{ color: TEXT_SOFT }} className="text-sm mb-4">Your usual burst — you'll log it with one tap.</div>
                      <div className="flex items-center gap-1.5 mb-3">
                        {['Light', 'Moderate', 'Vigorous'].map((lvl) => (
                          <button
                            key={lvl}
                            onClick={() => setPendingIntensity(lvl)}
                            style={{ background: pendingIntensity === lvl ? AMBER : INK_3, color: pendingIntensity === lvl ? ON_AMBER : PAPER_DIM }}
                            className="flex-1 py-2 rounded-md text-sm"
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                      <label className="flex items-center justify-center gap-2 mb-4">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={pendingMinutes}
                          onChange={(e) => setPendingMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                          style={{ background: INK_3, color: PAPER, fontFamily: 'Outfit, sans-serif' }}
                          className="w-16 rounded-md px-2 py-2 text-sm outline-none text-center"
                        />
                        <span style={{ color: TEXT_SOFT }} className="text-sm">minutes</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPendingActivity(null)} style={{ color: TEXT_SOFT }} className="text-sm py-2.5 px-3">Back</button>
                        <button
                          onClick={() => {
                            onSelectCombinedLayout(pendingLayout);
                            onSelectCombinedActivity(`${pendingActivity}|${pendingIntensity}|${Number(pendingMinutes) > 0 ? Number(pendingMinutes) : 5}`);
                            closeIntegrated();
                          }}
                          style={{ background: AMBER, color: ON_AMBER }}
                          className="flex-1 rounded-md py-2.5 text-sm font-medium"
                        >
                          Done
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ color: PAPER }} className="text-base font-medium mb-1">What will you do {pendingLayout === 'integrated-sets' ? 'between sets' : 'between exercises'}?</div>
                      <div style={{ color: TEXT_SOFT }} className="text-sm mb-4">Same thing every time? Pick it for a one-tap button.</div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {AEROBIC_ACTIVITIES_QUICK.slice(0, 6).map((a) => (
                          <button
                            key={a}
                            onClick={() => setPendingActivity(a)}
                            style={{ background: INK_3, color: PAPER }}
                            className="px-3 py-2 rounded-full text-sm"
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => { onSelectCombinedLayout(pendingLayout); onSelectCombinedActivity(''); closeIntegrated(); }}
                        style={{ background: INK_3, color: AMBER }}
                        className="w-full rounded-md py-3 text-sm font-medium"
                      >
                        I'll choose each time
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Portal>
          )}
        </>
      )}

      {selectedLocation && !showProgramOffer && needsActivities && (
        <>
          <div ref={activitiesHeadingRef} style={{ color: activitiesMissing ? BRICK : PAPER }} className="text-base font-medium mb-3 text-center">
            What are you doing?{activitiesMissing ? ' Pick at least one' : ''}
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
          <div ref={flexActivitiesHeadingRef} style={{ color: flexActivitiesMissing ? BRICK : PAPER }} className="text-base font-medium mb-3 text-center">
            What kind of flexibility work?{flexActivitiesMissing ? ' Pick at least one' : ''}
          </div>
          <ActivityPicker
            baseActivities={FLEXIBILITY_ACTIVITIES}
            selectedActivities={selectedFlexActivities}
            onToggleActivity={onToggleFlexActivity}
            customActivities={customFlexActivities}
            onAddCustomActivity={onAddCustomActivity}
            onRemoveCustomActivity={onRemoveCustomActivity}
          />
          {selectedFlexActivities.includes('Foam Rolling') && (
            <div className="mt-3">
              <div style={{ color: PAPER }} className="text-base font-medium mb-2 text-center">What are we rolling?</div>
              <div className="grid grid-cols-3 gap-2">
                {['Upper Body', 'Lower Body', 'Full Body'].map((r) => (
                  <button
                    key={r}
                    onClick={() => onFoamRegion(r)}
                    style={{ background: foamRegion === r ? SKY : INK_3, color: foamRegion === r ? INK : PAPER }}
                    className="rounded-xl py-2.5 text-sm font-medium"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {selectedLocation && !showProgramOffer && needsGroups && (
        <>
          <div ref={groupsHeadingRef} style={{ color: groupsMissing ? BRICK : PAPER }} className="text-base font-medium mb-3 text-center mt-2">
            Which muscles?{groupsMissing ? ' Pick at least one' : ''}
          </div>
          <MuscleGroupPicker selectedGroups={selectedGroups} onToggleGroup={onToggleGroup} />
          {pickSuggestion && onPickGroups && selectedGroups.length === 0 && (
            <button onClick={() => onPickGroups(pickSuggestion.groups)} style={{ background: INK_3, color: SKY }} className="w-full rounded-md px-4 py-2.5 mt-3 text-sm text-center">
              Fill in my week: {pickSuggestion.label}
            </button>
          )}
          {recoveryHits.size > 0 && (
            <div style={{ background: INK_3, color: PAPER_DIM }} className="rounded-md px-4 py-2.5 mt-3 text-sm text-center">
              {[...recoveryHits.entries()].slice(0, 3).map(([g, h]) => `${g} ${h < 24 ? 'today' : 'yesterday'}`).join(', ')}. Muscles recover best with about 48 hours between sessions. Your call!
            </div>
          )}
        </>
      )}

      {selectedLocation && needsStyle && (
        <>
          <div ref={styleHeadingRef} style={{ color: styleMissing ? BRICK : PAPER }} className="text-base font-medium text-center mb-2 mt-2">
            What's the goal?{styleMissing ? ' Pick one to continue' : ''}
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {TRAINING_STYLES.map((style) => {
              const selected = selectedStyle === style;
              return (
                <button
                  key={style}
                  onClick={() => onSelectStyle(style)}
                  style={{
                    background: selected ? SKY : INK_3,
                    outline: styleMissing ? `1.5px solid ${BRICK}` : 'none',
                  }}
                  className="text-center rounded-xl px-1 py-2.5 flex flex-col items-center gap-0.5"
                >
                  <span className="text-lg leading-none">{STYLE_EMOJI[style]}</span>
                  <span style={{ color: selected ? INK : PAPER }} className="text-sm font-medium">{style}</span>
                  <span style={{ color: selected ? INK : TEXT_SOFT }} className="text-xs">{STYLE_CONFIG[style].reps.replace('-', '–')} reps</span>
                </button>
              );
            })}
          </div>
          {selectedStyle && (
            <div style={{ color: TEXT_SOFT }} className="text-[13px] text-center mb-3">
              {STYLE_CONFIG[selectedStyle].blurb} {STYLE_CONFIG[selectedStyle].nsca}.
            </div>
          )}
        </>
      )}

      {((needsStyle && selectedLocation && selectedStyle) || (movementMode === 'Flexibility' && (selectedGroups.length > 0 || selectedFlexActivities.includes('Foam Rolling')))) && !showProgramOffer && (
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => onToggleCleanSlate(false)}
            style={{ background: !cleanSlate ? SKY : INK_3, color: !cleanSlate ? INK : PAPER_DIM }}
            className="flex-1 rounded-md py-2 text-sm font-medium"
          >
            Suggested workout
          </button>
          <button
            onClick={() => onToggleCleanSlate(true)}
            style={{ background: cleanSlate ? SKY : INK_3, color: cleanSlate ? INK : PAPER_DIM }}
            className="flex-1 rounded-md py-2 text-sm font-medium"
          >
            Clean slate
          </button>
        </div>
      )}

      {planning && (movementMode === 'Aerobic' || movementMode === 'Combined') && (
        <div className="mb-4">
          <div style={{ color: PAPER }} className="text-base font-medium mb-2 text-center">
            How long{movementMode === 'Combined' ? ' is the aerobic part' : ''}?
          </div>
          <div className="flex justify-center gap-1.5">
            {PLAN_MINUTE_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => onPlanMinutes(m)}
                style={{ background: planMinutes === m ? SKY : INK_3, color: planMinutes === m ? INK : PAPER_DIM }}
                className="flex-1 rounded-full py-2 text-sm font-medium"
              >
                {m}
              </button>
            ))}
          </div>
          <div style={{ color: TEXT_SOFT }} className="text-xs text-center mt-1">minutes</div>
        </div>
      )}

      {!showProgramOffer && (
        <button
          onClick={handleStartClick}
          style={{ background: canStart ? SKY : INK_3, color: canStart ? INK : TEXT_SOFT }}
          className="w-full rounded-xl py-3 text-base font-medium mt-1"
        >
          {planning ? '📅 Save Plan' : <>🪩 Log Workout{startEmoji}</>}
        </button>
      )}
    </div>
  );
}

// Plain-words suggestions shown at the top of a lifting workout: from the
// program session it came from, or the general guide for its training style.
function workoutGuide(workout) {
  if (!workout) return null;
  const dash = (x) => String(x).replace('-', '–');
  try {
    const raw = localStorage.getItem(`groove:programSession:${workout.id}`);
    if (raw) {
      const m = JSON.parse(raw);
      const lines = [`${m.exercises} exercises · ${m.main.sets} × ${dash(m.main.reps)} · RPE ${dash(m.main.rpe)} · rest ${dash(m.main.rest)}`];
      if (m.acc) lines.push(`Accessories ${m.acc.sets} × ${dash(m.acc.reps)} · RPE ${dash(m.acc.rpe)}`);
      return { title: `${m.program} · ${m.name}`, lines };
    }
  } catch { /* ignore */ }
  // Foam rolling sessions: one line on how to roll, and where the how-to lives.
  if (workout.movementMode === 'Flexibility' && (workout.plan || []).some((e) => e && /^Foam Roll:/.test(e.name || '') && e.type === 'flexibility')) {
    return { title: null, lines: ['Roll slowly and pause 20–30 sec on tender spots. Open a roll and tap ⓘ for how.'] };
  }
  const cfg = STYLE_CONFIG[workout.style];
  if ((workout.movementMode === 'Resistance' || workout.movementMode === 'Combined') && cfg?.suggest) {
    const lines = [`Suggested: ${cfg.suggest}`];
    try {
      const r = JSON.parse(localStorage.getItem(`groove:readiness:${workout.id}`) || 'null');
      if (r) {
        const names = (r.areas || []).map((id) => (BODY_AREAS.find((a) => a.id === id) || {}).label).filter(Boolean).map((l) => l.toLowerCase());
        const inj = (r.injuries || []).map((l) => l.toLowerCase());
        const bits = [names.length ? `built around ${names.join(', ')}` : '', inj.length ? `working around ${inj.join(', ')}` : '', r.tired ? 'a lighter session' : ''].filter(Boolean);
        if (bits.length) lines.push(`Adjusted: ${bits.join(' · ')}`);
      }
    } catch { /* ignore */ }
    return { title: null, lines };
  }
  return null;
}

function ActiveWorkout({
  guide, onChangeLocation,
  combinedLayout,
  combinedActivity: combinedActivityRaw,
  workout, exercises, sets, lastPerformance, bodyweight, hrZones,
  onLogSet, onDeleteSet, onUpdateSet, onReplace, onMoveGroup, onReorderGroup, onPairExisting, onPairNew, onPairCardio, onUnpair,
  onAddExercise, onAddSuperset, onAddAerobic, onAddFlexibility, onAddStretch, onAddWarmup,
  onAddWarmupDrill, onRenameWarmupDrill, onRemoveWarmupDrill, onReorderWarmupDrill,
  onRemoveExercise, onFinish, onDiscard, onProgress,
}) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [addMode, setAddMode] = useState(null); // 'resistance' | 'superset' | 'aerobic' | 'flexibility'
  // The "Add Resistance Exercise" button splits in place into "Single
  // Exercise" / "Superset" instead of navigating to a separate chooser
  // card — tapping anywhere outside it collapses it back.
  const [splitAddOpen, setSplitAddOpen] = useState(false);
  const [serialAeroOpen, setSerialAeroOpen] = useState(false);
  const splitAddRef = useRef(null);
  useEffect(() => {
    if (!splitAddOpen) return;
    function onDocPointerDown(e) {
      if (splitAddRef.current && !splitAddRef.current.contains(e.target)) setSplitAddOpen(false);
    }
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [splitAddOpen]);
  const [swapIndex, setSwapIndex] = useState(null);
  const [pairIndex, setPairIndex] = useState(null); // an exercise being turned into a superset
  const [pairPicking, setPairPicking] = useState(false);
  // The one exercise currently expanded for logging — the rest stay
  // collapsed to a single numbered row. Starts on the first exercise so
  // there's an obvious place to begin instead of an all-collapsed list.
  const discardArm = useArmed();
  // Remember which exercise was open, so reopening the app lands right back on it.
  const groupMemoryKey = `groove:activeGroup:${workout.id}`;
  const [activeGroupKey, setActiveGroupKey] = useState(() => {
    try { return localStorage.getItem(groupMemoryKey) || null; } catch { return null; }
  });
  // Exercises ticked off with the check button (stay green after reopening).
  const doneMemoryKey = `groove:doneGroups:${workout.id}`;
  const [doneKeys, setDoneKeys] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(doneMemoryKey) || '[]')); } catch { return new Set(); }
  });
  useEffect(() => {
    try { localStorage.setItem(doneMemoryKey, JSON.stringify([...doneKeys])); } catch { /* storage blocked */ }
  }, [doneKeys, doneMemoryKey]);
  // Un-checked on purpose (even though its sets were all logged): stays not-done until ticked again.
  const undoneMemoryKey = `groove:undoneGroups:${workout.id}`;
  const [undoneKeys, setUndoneKeys] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(undoneMemoryKey) || '[]')); } catch { return new Set(); }
  });
  useEffect(() => {
    try { localStorage.setItem(undoneMemoryKey, JSON.stringify([...undoneKeys])); } catch { /* storage blocked */ }
  }, [undoneKeys, undoneMemoryKey]);
  const markDone = (k) => {
    setDoneKeys((prev) => (prev.has(k) ? prev : new Set(prev).add(k)));
    setUndoneKeys((prev) => { if (!prev.has(k)) return prev; const n = new Set(prev); n.delete(k); return n; });
  };
  // After ticking an exercise off, the next unfinished one opens and scrolls into view.
  const advanceFrom = (gi) => {
    const next = groupInfoRef.current.slice(gi + 1).find((g) => !g.complete && g.type !== 'warmup' && g.key !== undefined);
    if (next) { setActiveGroupKey(next.key); setPendingScrollKey(next.key); }
  };
  const unmarkDone = (k) => {
    setDoneKeys((prev) => { if (!prev.has(k)) return prev; const n = new Set(prev); n.delete(k); return n; });
    setUndoneKeys((prev) => (prev.has(k) ? prev : new Set(prev).add(k)));
  };
  // Filled in while the cards render: each exercise's key and whether it's complete.
  const groupInfoRef = useRef([]);
  // On reopening a workout already underway with nothing left open, open the
  // first exercise that isn't complete yet.
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpened.current) return;
    autoOpened.current = true;
    if (activeGroupKey || sets.length === 0) return;
    // Prefer the first unfinished exercise after the last finished one, so
    // a skipped warm-up above doesn't pull you back up the list.
    const info = groupInfoRef.current.filter((g) => g.type !== 'warmup');
    const lastDone = info.map((g) => g.complete).lastIndexOf(true);
    const next = info.slice(lastDone + 1).find((g) => !g.complete) || info.find((g) => !g.complete);
    if (next) setActiveGroupKey(next.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      if (activeGroupKey) localStorage.setItem(groupMemoryKey, activeGroupKey);
      else localStorage.removeItem(groupMemoryKey);
    } catch { /* storage blocked */ }
  }, [activeGroupKey, groupMemoryKey]);
  // Drag-to-reorder: the dragged card follows the finger via a live
  // translateY (dragOffsetY) rather than snapping the list around mid-
  // drag — the actual reorder only happens once, on release, based on
  // where the card ended up. groupRefs tracks each rendered group's DOM
  // node so drop-time can measure which slot the pointer is over.
  const groupRefs = useRef([]);
  const dragStateRef = useRef(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  // React attaches its synthetic touchstart/touchmove listeners as
  // passive by default, so e.preventDefault() inside an onTouchMove prop
  // silently does nothing — touch-action:none was carrying the entire
  // burden of blocking native scroll, with no fallback if the browser's
  // gesture-arbitration timing didn't cooperate. Registering the
  // move/end listeners on window directly (passive:false, same pattern
  // as native drag-and-drop libraries) makes preventDefault actually work
  // and decouples the gesture from any particular DOM node staying
  // mounted/unchanged for its whole duration — both plausible sources of
  // the drag working only "some of the time."
  function handleDragStart(e, gi) {
    const t = e.touches[0];
    const scroller = document.getElementById('app-scroll');
    const state = { fromIndex: gi, startY: t.clientY, startScroll: scroller ? scroller.scrollTop : 0, lastY: t.clientY, touchId: t.identifier };
    dragStateRef.current = state;
    setDraggingIndex(gi);
    setDragOffsetY(0);

    function findTouch(ev, list) {
      return [...list].find((x) => x.identifier === state.touchId) || list[0];
    }
    const offset = () => state.lastY - state.startY + (scroller ? scroller.scrollTop - state.startScroll : 0);

    // Holding the item near the top or bottom of the screen scrolls the page, so it can be dragged anywhere
    // (the card keeps following the finger because the scroll distance is added to its offset).
    let raf = 0;
    function autoScroll() {
      if (dragStateRef.current !== state || !scroller) return;
      const box = scroller.getBoundingClientRect();
      const zone = 110;
      let v = 0;
      if (state.lastY < box.top + zone + 90) v = -Math.ceil(((box.top + zone + 90 - state.lastY) / zone) * 14);
      else if (state.lastY > box.bottom - zone) v = Math.ceil(((state.lastY - (box.bottom - zone)) / zone) * 14);
      if (v) { scroller.scrollTop += v; setDragOffsetY(offset()); }
      raf = requestAnimationFrame(autoScroll);
    }
    raf = requestAnimationFrame(autoScroll);

    function onMove(ev) {
      if (dragStateRef.current !== state) return;
      if (ev.touches.length === 0) return;
      ev.preventDefault();
      const touch = findTouch(ev, ev.touches);
      state.lastY = touch.clientY;
      setDragOffsetY(offset());
    }

    function onEnd(ev) {
      if (dragStateRef.current === state) {
        const touch = ev.changedTouches.length ? findTouch(ev, ev.changedTouches) : null;
        if (touch) {
          const y = touch.clientY;
          let closestIndex = state.fromIndex;
          let closestDist = Infinity;
          groupRefs.current.forEach((el, i) => {
            // The dragged row's own rect is still carrying the live
            // translateY(dragOffsetY) at this instant — it moves in
            // lockstep with the touch, so it always reads as "closest to
            // itself" and the drop position never resolves to anywhere
            // else. Only compare against the OTHER (static) rows.
            if (!el || i === state.fromIndex) return;
            const rect = el.getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            const dist = Math.abs(y - mid);
            if (dist < closestDist) { closestDist = dist; closestIndex = i; }
          });
          if (closestIndex !== state.fromIndex) onReorderGroup(state.fromIndex, closestIndex);
        }
        dragStateRef.current = null;
        setDraggingIndex(null);
        setDragOffsetY(0);
      }
      cancelAnimationFrame(raf);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    }

    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: false });
    window.addEventListener('touchcancel', onEnd, { passive: false });
  }
  // Counts UP from the moment a set is logged, rather than down from a
  // fixed target — a stalled count-up stays informative ("it's been a
  // while"), where a count-down that hits 0:00 and keeps running reads as
  // broken. Tracked by group index so the banner renders right under the
  // movement that's actually resting, not in one spot at the bottom.
  const [restStartedAt, setRestStartedAt] = useState(null);
  const [restGroupIndex, setRestGroupIndex] = useState(null);
  const [restElapsed, setRestElapsed] = useState(0);
  const [warmupOpen, setWarmupOpen] = useState(false);
  const finishArm = useArmed();

  const groups = groupPlan(exercises);
  // The warm-up parts (aerobic + dynamic drills) fold into one row; they open on tap, or when one is the active card.
  const warmupEndGi = groups.findIndex((g) => g[0].type === 'warmup');
  const warmupKeys = warmupEndGi >= 0 ? groups.slice(0, warmupEndGi + 1).map((g) => `${g[0].type || 'ex'}-${g[0].name}`) : [];
  const warmupShown = warmupOpen || warmupKeys.some((k) => activeGroupKey && String(activeGroupKey).startsWith(k));
  // An exercise counts as complete once it's ticked, or its target sets are logged
  // (cardio: anything logged). Same key rule as the cards below.
  function isGroupDone(group, groupKey) {
    if (undoneKeys.has(groupKey)) return false;
    if (doneKeys.has(groupKey)) return true;
    return group.every((m) => {
      const n = sets.filter((x) => x.exerciseName === m.name).length;
      return n > 0 && (m.type === 'aerobic' || m.type === 'flexibility-activity' || n >= (m.sets || 1));
    });
  }
  const progressCounts = new Map();
  const doneFlags = groups.map((group) => {
    const base = group.length === 2 ? `superset-${group[0].name}-${group[1].name}` : `${group[0].type || 'ex'}-${group[0].name}`;
    const n = progressCounts.get(base) || 0;
    progressCounts.set(base, n + 1);
    return isGroupDone(group, n === 0 ? base : `${base}#${n}`);
  });
  const doneCount = doneFlags.filter(Boolean).length;
  useEffect(() => { onProgress && onProgress({ done: doneCount, total: groups.length }); }, [doneCount, groups.length]); // eslint-disable-line react-hooks/exhaustive-deps
  // Recomputed fresh every render — see the dupeCount disambiguation below.
  const groupKeyCounts = new Map();
  groupInfoRef.current = [];

  // Nothing is expanded by default — a suggested workout starts fully
  // collapsed, and clients tap in when they're ready to log or edit.


  // Newly added exercises scroll to the top of their own card, instead
  // of leaving the page parked at the bottom where the add form was.
  const [pendingScrollKey, setPendingScrollKey] = useState(null);
  useEffect(() => {
    if (!pendingScrollKey) return;
    const id = requestAnimationFrame(() => {
      const el = [...document.querySelectorAll('[data-group-key]')].find((n) => n.dataset.groupKey === pendingScrollKey);
      if (el) { el.style.scrollMarginTop = '64px'; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setPendingScrollKey(null); }
    });
    return () => cancelAnimationFrame(id);
  }, [pendingScrollKey, exercises]);
  // Opening any exercise brings its card to the top (below the pinned title).
  useEffect(() => { if (activeGroupKey) setPendingScrollKey(activeGroupKey); }, [activeGroupKey]);

  function closeAddForm() {
    setAddMenuOpen(false);
    setAddMode(null);
  }

  // Aerobic bursts between exercises exist only for Combined workouts;
  // plain Resistance stays resistance-only (apart from the opening
  // warm-up block). Integrated-between-sets moves the quick-add into
  // each exercise card instead of the gaps.
  const [presetName, presetIntensity, presetMinutes] = (combinedActivityRaw || '').split('|');
  const combinedActivity = presetName || '';
  const preset = presetName && presetMinutes ? { intensity: presetIntensity, minutes: Number(presetMinutes) } : null;
  const isCombined = workout.movementMode === 'Combined';
  const lifts = workout.movementMode === 'Resistance' || isCombined;
  const betweenSets = isCombined && combinedLayout === 'integrated-sets';
  // Cardio buttons between exercises belong to the Integrated layout.
  // Serial keeps blocks back to back: one "Add Aerobic" at the end instead.
  const canQuickAddAerobic = isCombined && combinedLayout === 'integrated-exercises';
  const serialBlock = isCombined && combinedLayout === 'serial';
  // insertAt is the flat planExercises index to splice the new aerobic
  // entry into — null (or past the end) just appends, so the same
  // handler covers "before the first exercise", "between two exercises",
  // and "after the last one".
  function submitQuickAerobic(name, intensity, minutes, insertAt) {
    onAddAerobic(name, '', insertAt);
    const flex = FLEX_ONLY_RE.test(name);
    onLogSet({
      exerciseName: name,
      muscleGroup: flex ? 'Flexibility' : 'Cardio',
      setNumber: 1,
      movementType: flex ? 'flexibility' : 'aerobic',
      weight: null,
      reps: null,
      durationSeconds: minutes * 60,
      lightMinutes: intensity === 'Light' ? minutes : null,
      moderateMinutes: intensity === 'Moderate' ? minutes : null,
      vigorousMinutes: intensity === 'Vigorous' ? minutes : null,
    });
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
    if (payload.movementType !== 'aerobic' && getAutoStartRestTimer()) startRest(groupIndex);
  }

  const restTarget = STYLE_CONFIG[workout.style]?.restSeconds || 90;

  function RestBanner() {
    return (
      <div style={{ background: INK_2, borderLeft: `3px solid ${LIME}` }} className="rounded-md px-4 py-2.5 mb-3 flex items-center gap-3">
        <span style={{ color: LIME, fontFamily: 'Outfit, sans-serif' }} className="text-sm font-medium tabular-nums">
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
      <div style={{ background: INK, zIndex: 5 }} className="sticky top-0 py-1 -mt-1.5 mb-2 text-center">
       <div>
        <div style={{ color: PAPER }} className="text-xl font-extrabold leading-tight truncate px-2">
          {workoutTitle(workout.muscleGroups, workout.activities)}
        </div>
        <div style={{ color: SKY }} className="text-sm">
          {[!isSameDay(workout.startedAt) && dayLabel(workout.startedAt), workout.style].filter(Boolean).map((t) => <span key={t}>{t} · </span>)}
          <button onClick={() => setEditingLocation((v) => !v)} className="underline decoration-dotted underline-offset-2" aria-label="Change location">
            {workout.location || 'Add location'}
          </button>
        </div>
        {editingLocation && (
          <div className="flex justify-center gap-1.5 mt-1.5">
            {WORKOUT_LOCATIONS.map((loc) => (
              <button
                key={loc}
                onClick={() => { onChangeLocation && onChangeLocation(loc); setEditingLocation(false); }}
                style={{ background: workout.location === loc ? SKY : INK_3, color: workout.location === loc ? INK : PAPER_DIM }}
                className="rounded-full px-3 py-1 text-sm"
              >
                {loc}
              </button>
            ))}
          </div>
        )}
       </div>
      </div>
      {guide && (
        <div className="mb-3 text-center">
          {guide.title && <div style={{ color: PAPER_DIM }} className="text-sm font-medium">{guide.title}</div>}
          {guide.lines.map((l) => <div key={l} style={{ color: TEXT_SOFT }} className="text-sm">{l}</div>)}
        </div>
      )}

      <SwipeHint id="exercises">Tip: tap the ⋯ on an exercise to swap, move, or remove it — or drag the dots to reorder.</SwipeHint>
      <div className="space-y-3 mb-4">
        {canQuickAddAerobic && !addMenuOpen && groups.length > 0 && !isAerobicGroup(groups[0]) && (
          <QuickAerobicButton
            fixedName={combinedActivity} preset={preset}
            onSubmit={(name, intensity, minutes) => submitQuickAerobic(name, intensity, minutes, groups[0][0].index)}
          />
        )}
        {lifts && !addMenuOpen && groups.length > 0 && !exercises.some((e) => e.type === 'warmup') && (
          <button
            onClick={() => { onAddWarmup(); setActiveGroupKey('warmup-Dynamic Warm-up'); }}
            style={{ background: INK_2, color: VIOLET, borderLeft: `3px solid ${VIOLET}` }}
            className="w-full rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-1.5"
          >
            <Plus size={14} /> Add Dynamic Warm-up
          </button>
        )}
        {warmupEndGi >= 0 && (
          <button
            onClick={() => setWarmupOpen((v) => !(v || warmupShown))}
            style={{ background: INK_2, borderLeft: `3px solid ${VIOLET}` }}
            className="w-full rounded-md px-4 py-2.5 flex items-center justify-between text-left"
          >
            <span style={{ color: PAPER }} className="text-base font-bold">Warm-up</span>
            <span style={{ color: TEXT_SOFT }} className="text-sm flex items-center gap-1.5">
              {warmupEndGi + 1} {warmupEndGi === 0 ? 'part' : 'parts'} {warmupShown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>
        )}
        {groups.map((group, gi) => {
          const showRest = restGroupIndex === gi;
          // Keyed by name (already the app's implicit unique identifier for
          // an exercise within one workout — loggedSets/lastPerformance are
          // both looked up by name too), not by array position: `index`
          // above is reassigned by groupPlan on every render, so keying on
          // it would remount each card's local state (like the collapsed
          // "Done" toggle) whenever reordering shifted its position.
          const baseGroupKey = group.length === 2 ? `superset-${group[0].name}-${group[1].name}` : `${group[0].type || 'ex'}-${group[0].name}`;
          // generateWorkout no longer lets two groups share a name, but a
          // manually-added exercise still can — two same-key cards used to
          // make React confuse which DOM node is which, visibly corrupting
          // both drag-reorder and swipe-to-edit. Disambiguate by how many
          // times this base key has already shown up earlier in the list.
          const dupeCount = groupKeyCounts.get(baseGroupKey) || 0;
          groupKeyCounts.set(baseGroupKey, dupeCount + 1);
          const groupKey = dupeCount === 0 ? baseGroupKey : `${baseGroupKey}#${dupeCount}`;
          // Warm-up parts read a, b; the working exercises then count from 1.
          const displayIndex = warmupEndGi >= 0 ? (gi <= warmupEndGi ? String.fromCharCode(97 + gi) : gi - warmupEndGi) : gi + 1;
          const lead = group[0];
          const isDone = isGroupDone(group, groupKey);
          groupInfoRef.current.push({ key: groupKey, complete: isDone, type: lead.type });
          let card;

          if (group.length === 2) {
            card = (
              <SupersetCard
                index={displayIndex}
                members={group}
                style={workout.style}
                bodyweight={bodyweight}
                sets={sets}
                lastPerformance={lastPerformance}
                onLogSet={(payload) => handleResistanceLog(payload, gi)}
                onDeleteSet={onDeleteSet}
                onOpenSwap={setSwapIndex}
                onRemove={(index, hasLoggedSets) => onRemoveExercise(index, hasLoggedSets)}
                onSplit={() => onUnpair(group[0].index)}
                isDone={isDone}
                onDone={() => { markDone(groupKey); advanceFrom(gi); }}
                onUndo={isDone ? () => unmarkDone(groupKey) : null}
                isActive={activeGroupKey === groupKey}
                onActivate={() => setActiveGroupKey(groupKey)}
                onCollapse={() => setActiveGroupKey((k) => (k === groupKey ? null : k))}
              />
            );
          } else {
            const ex = group[0];
            const loggedSets = sets.filter((s) => s.exerciseName === ex.name);
            if (ex.type === 'warmup') {
              card = (
                <WarmupCard
                  index={displayIndex}
                  onMoveUp={gi > 0 ? () => onMoveGroup(gi, -1) : null}
                  onMoveDown={gi < groups.length - 1 ? () => onMoveGroup(gi, 1) : null}
                  exercise={ex}
                  loggedSets={loggedSets}
                  onLogSet={(payload) => onLogSet(payload)}
                  onDeleteSet={onDeleteSet}
                  onRemove={() => onRemoveExercise(ex.index, loggedSets.length > 0)}
                  onAddDrill={onAddWarmupDrill}
                  onRenameDrill={onRenameWarmupDrill}
                  onRemoveDrill={onRemoveWarmupDrill}
                  onReorderDrill={onReorderWarmupDrill}
                  isActive={activeGroupKey === groupKey}
                  onActivate={() => setActiveGroupKey(groupKey)}
                  onCollapse={() => setActiveGroupKey((k) => (k === groupKey ? null : k))}
                />
              );
            } else if (ex.type === 'aerobic' || ex.type === 'flexibility-activity') {
              card = (
                <AerobicCard
                  index={displayIndex}
                  onMoveUp={gi > 0 ? () => onMoveGroup(gi, -1) : null}
                  onMoveDown={gi < groups.length - 1 ? () => onMoveGroup(gi, 1) : null}
                  exercise={ex}
                  movementType={ex.type === 'flexibility-activity' ? 'flexibility' : 'aerobic'}
                  loggedSets={loggedSets}
                  onLogSet={onLogSet}
                  onDeleteSet={onDeleteSet}
                  onRemove={() => onRemoveExercise(ex.index, loggedSets.length > 0)}
                  onOpenSwap={ex.type === 'aerobic' ? () => setSwapIndex(ex.index) : undefined}
                  onChooseActivity={ex.type === 'aerobic' && ex.name === WARMUP_AEROBIC_PLACEHOLDER ? (name) => { onReplace(ex.index, { name }); setActiveGroupKey(`aerobic-${name}`); } : undefined}
                  hrZones={hrZones}
                  isActive={activeGroupKey === groupKey}
                  onActivate={() => setActiveGroupKey(groupKey)}
                  onCollapse={() => setActiveGroupKey((k) => (k === groupKey ? null : k))}
                  isDone={isDone}
                  onDone={() => { markDone(groupKey); advanceFrom(gi); }}
                  onUndo={isDone ? () => unmarkDone(groupKey) : null}
                  onQuickAdd={canQuickAddAerobic ? (name, intensity, minutes) => submitQuickAerobic(name, intensity, minutes, (groups[gi + 1]?.[0].index) ?? exercises.length) : null}
                />
              );
            } else if (ex.type === 'flexibility') {
              card = (
                <FlexibilityCard
                  index={displayIndex}
                  onMoveUp={gi > 0 ? () => onMoveGroup(gi, -1) : null}
                  onMoveDown={gi < groups.length - 1 ? () => onMoveGroup(gi, 1) : null}
                  exercise={ex}
                  loggedSets={loggedSets}
                  onLogSet={onLogSet}
                  onDeleteSet={onDeleteSet}
                  onOpenSwap={() => setSwapIndex(ex.index)}
                  onRemove={() => onRemoveExercise(ex.index, loggedSets.length > 0)}
                  isActive={activeGroupKey === groupKey}
                  onActivate={() => setActiveGroupKey(groupKey)}
                  onCollapse={() => setActiveGroupKey((k) => (k === groupKey ? null : k))}
                  onDone={() => { markDone(groupKey); advanceFrom(gi); }}
                  onUndo={isDone ? () => unmarkDone(groupKey) : null}
                />
              );
            } else {
              card = (
                <ExerciseCard
                  index={displayIndex}
                  onNever={() => { try { const h = JSON.parse(localStorage.getItem('groove:hiddenExercises') || '[]'); if (!h.includes(ex.name)) localStorage.setItem('groove:hiddenExercises', JSON.stringify([...h, ex.name])); } catch { /* */ } setSwapIndex(ex.index); }}
                  onMoveUp={gi > 0 ? () => onMoveGroup(gi, -1) : null}
                  onMoveDown={gi < groups.length - 1 ? () => onMoveGroup(gi, 1) : null}
                  exercise={ex}
                  style={workout.style}
                  bodyweight={bodyweight}
                  loggedSets={loggedSets}
                  last={lastPerformance(ex.name)}
                  lastFor={(v) => lastPerformance(ex.name, v)}
                  onLogSet={(payload) => handleResistanceLog({ ...payload, exerciseName: ex.name, muscleGroup: ex.muscleGroup }, gi)}
                  onDeleteSet={onDeleteSet}
                  onUpdateSet={onUpdateSet}
                  onOpenSwap={() => setSwapIndex(ex.index)}
                  onSuperset={() => setPairIndex(ex.index)}
                  onRemove={() => onRemoveExercise(ex.index, loggedSets.length > 0)}
                  isActive={activeGroupKey === groupKey}
                  onActivate={() => setActiveGroupKey(groupKey)}
                  onCollapse={() => setActiveGroupKey((k) => (k === groupKey ? null : k))}
                  isDone={isDone}
                  onDone={() => { markDone(groupKey); advanceFrom(gi); }}
                  onUndo={isDone ? () => unmarkDone(groupKey) : null}
                  combinedActivity={combinedActivity}
                  preset={preset}
                  onQuickAerobic={betweenSets ? (name, intensity, minutes) => onLogSet({
                    exerciseName: ex.name,
                    muscleGroup: ex.muscleGroup,
                    setNumber: loggedSets.length + 1,
                    movementType: 'aerobic',
                    weight: null,
                    reps: null,
                    durationSeconds: minutes * 60,
                    distance: name,
                    lightMinutes: intensity === 'Light' ? minutes : null,
                    moderateMinutes: intensity === 'Moderate' ? minutes : null,
                    vigorousMinutes: intensity === 'Vigorous' ? minutes : null,
                  }) : null}
                />
              );
            }
          }

          const isDragging = draggingIndex === gi;
          const nextGroup = groups[gi + 1];
          const insertAfter = nextGroup ? nextGroup[0].index : exercises.length;
          return (
            <div key={groupKey} className={warmupEndGi >= 0 && gi <= warmupEndGi && !warmupShown ? 'hidden' : 'space-y-3'}>
              <div
                data-group-key={groupKey}
                ref={(el) => (groupRefs.current[gi] = el)}
                style={{
                  opacity: isDragging ? 0.9 : 1,
                  transform: isDragging ? `translateY(${dragOffsetY}px)` : 'none',
                  position: isDragging ? 'relative' : 'static',
                  zIndex: isDragging ? 20 : 'auto',
                  boxShadow: isDragging ? '0 8px 20px rgba(0,0,0,0.25)' : 'none',
                  transition: isDragging ? 'none' : 'transform 0.15s ease',
                }}
                className="flex items-stretch gap-1"
              >
                <button
                  data-no-swipe
                  onTouchStart={(e) => handleDragStart(e, gi)}
                  style={{
                    color: TEXT_SOFT,
                    touchAction: 'none',
                    // Narrower than Apple's 44pt tap-target guidance by
                    // request (it was eating real screen width, and kept
                    // catching an upward-scrolling thumb) — viable now
                    // that the actual drag-drop bug is fixed; size was
                    // never really the cause of the old reliability
                    // issue. Still suppress iOS's long-press
                    // callout/selection on it either way.
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  className="shrink-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing"
                  title="Drag to reorder"
                >
                  <GripVertical size={14} />
                </button>
                <div className="flex-1 min-w-0 space-y-3">
                  {card}
                  {showRest && <RestBanner />}
                </div>
              </div>
              {canQuickAddAerobic && !addMenuOpen && group[0].type !== 'warmup' && !isAerobicGroup(group) && !(nextGroup && isAerobicGroup(nextGroup)) && (
                <QuickAerobicButton
                  fixedName={combinedActivity} preset={preset}
                  onSubmit={(name, intensity, minutes) => submitQuickAerobic(name, intensity, minutes, insertAfter)}
                />
              )}
              {group[0].type === 'warmup' && (
                <div className="pl-6 pt-1">
                  <div style={{ borderTop: `2px dashed ${VIOLET}`, opacity: 0.4 }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {addMenuOpen ? (
        addMode === null ? (
          <div style={{ background: INK_2 }} className="rounded-md px-4 py-3 mb-4 groove-ease-in">
            <div style={{ color: TEXT_SOFT }} className="text-sm mb-2 text-center">Add what to your workout?</div>
            <div className="space-y-2">
              <button onClick={() => setAddMode('aerobic')} style={{ background: INK_3, color: AMBER }} className="w-full rounded-md py-2.5 text-sm font-medium">
                Aerobic
              </button>
              <button onClick={() => setAddMode('resistance-choice')} style={{ background: INK_3, color: SKY }} className="w-full rounded-md py-2.5 text-sm font-medium">
                Resistance
              </button>
              <button onClick={() => setAddMode('flexibility')} style={{ background: INK_3, color: BRICK }} className="w-full rounded-md py-2.5 text-sm font-medium">
                Flexibility
              </button>
              <button onClick={closeAddForm} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2">
                Cancel
              </button>
            </div>
          </div>
        ) : addMode === 'resistance-choice' ? (
          <div style={{ background: INK_2 }} className="rounded-md px-4 py-3 mb-4">
            <div style={{ color: TEXT_SOFT }} className="text-sm mb-2 text-center">Resistance</div>
            <div className="flex gap-2 mb-1">
              <button onClick={() => setAddMode('resistance')} style={{ background: INK_3, color: SKY }} className="flex-1 rounded-md py-2.5 text-sm font-medium">
                Single Exercise
              </button>
              <button onClick={() => setAddMode('superset')} style={{ background: INK_3, color: LIME }} className="flex-1 rounded-md py-2.5 text-sm font-medium">
                Superset
              </button>
            </div>
            <button onClick={() => setAddMode(null)} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2">
              Back
            </button>
          </div>
        ) : addMode === 'resistance' ? (
          <AddExerciseForm
            muscleGroups={workout.muscleGroups}
            location={workout.location}
            onAdd={(name, group) => {
              const typed = titleCaseWords(name);
              // Stretching typed into the resistance form is still flexibility work.
              const stretch = Object.entries(FLEXIBILITY_LIBRARY).flatMap(([g, list]) => list.map((e) => ({ ...e, group: g }))).find((e) => e.name.toLowerCase() === typed.toLowerCase());
              if (stretch) {
                onAddStretch(stretch.name, stretch.group, stretch);
                setActiveGroupKey(`flexibility-${stretch.name}`);
                closeAddForm();
                return;
              }
              if (FLEX_NAME_RE.test(typed)) {
                onAddFlexibility(typed);
                setActiveGroupKey(`flexibility-activity-${typed}`);
                closeAddForm();
                return;
              }
              const lib = (EXERCISE_LIBRARY[group] || []).find((e) => e.name.toLowerCase() === typed.toLowerCase());
              const finalName = lib?.name || typed;
              onAddExercise(finalName, group);
              setActiveGroupKey(`resistance-${finalName}`);
              setPendingScrollKey(`resistance-${finalName}`);
              closeAddForm();
            }}
            onCancel={closeAddForm}
          />
        ) : addMode === 'superset' ? (
          <AddSupersetForm
            muscleGroups={workout.muscleGroups}
            location={workout.location}
            onAdd={(a, b) => {
              const A = { ...a, name: titleCaseWords(a.name) };
              const B = { ...b, name: titleCaseWords(b.name) };
              onAddSuperset(A, B);
              setActiveGroupKey(`superset-${A.name.trim()}-${B.name.trim()}`);
              setPendingScrollKey(`superset-${A.name.trim()}-${B.name.trim()}`);
              closeAddForm();
            }}
            onCancel={closeAddForm}
          />
        ) : addMode === 'flexibility' ? (
          <AddStretchForm
            muscleGroups={workout.muscleGroups}
            usedNames={exercises.map((e) => e.name)}
            onAddStretch={(name, group, lib) => { onAddStretch(name, group, lib); setActiveGroupKey(`flexibility-${name}`); setPendingScrollKey(`flexibility-${name}`); }}
            onAddActivity={(name) => { onAddFlexibility(name, ''); setActiveGroupKey(`flexibility-activity-${name}`); setPendingScrollKey(`flexibility-activity-${name}`); }}
            onDone={closeAddForm}
          />
        ) : (
          <AddAerobicForm
            onAdd={(name, note) => { onAddAerobic(name, note); setActiveGroupKey(`aerobic-${name.trim()}`); closeAddForm(); }}
            onCancel={closeAddForm}
          />
        )
      ) : serialAeroOpen ? (
        <QuickAerobicForm
          onCancel={() => setSerialAeroOpen(false)}
          onSubmit={(name, intensity, minutes) => { submitQuickAerobic(name, intensity, minutes, exercises.length); setSerialAeroOpen(false); }}
        />
      ) : lifts && splitAddOpen ? (
        <div ref={splitAddRef} className="flex gap-2 mb-4">
          <button
            onClick={() => { setAddMode('resistance'); setAddMenuOpen(true); setSplitAddOpen(false); }}
            style={{ background: INK_2, color: SKY, borderLeft: `3px solid ${SKY}` }}
            className="flex-1 rounded-md py-2.5 text-sm font-medium"
          >
            Single Exercise
          </button>
          <button
            onClick={() => { setAddMode('superset'); setAddMenuOpen(true); setSplitAddOpen(false); }}
            style={{ background: INK_2, color: LIME, borderLeft: `3px solid ${LIME}` }}
            className="flex-1 rounded-md py-2.5 text-sm font-medium"
          >
            Superset
          </button>
        </div>
      ) : (
        // One row of add buttons side by side instead of a stack.
        <div className="flex gap-2 mb-4">
          {(serialBlock || workout.movementMode === 'Resistance') && (
            <button
              onClick={() => setSerialAeroOpen(true)}
              style={{ background: INK_2, color: AMBER, borderLeft: `3px solid ${AMBER}` }}
              className="flex-1 min-w-0 rounded-md py-2.5 px-1 text-sm font-medium flex items-center justify-center gap-1"
            >
              <Plus size={13} /> Aerobic
            </button>
          )}
          <button
            onClick={() => (lifts ? setSplitAddOpen(true) : setAddMenuOpen(true))}
            style={{ background: INK_2, color: SKY, borderLeft: `3px solid ${SKY}` }}
            className="flex-1 min-w-0 rounded-md py-2.5 px-1 text-sm font-medium flex items-center justify-center gap-1"
          >
            <Plus size={13} /> {lifts ? 'Resistance' : 'Add to Workout'}
          </button>
          {(lifts || workout.movementMode === 'Flexibility') && (
          <button
            onClick={() => { setAddMode('flexibility'); setAddMenuOpen(true); setSplitAddOpen(false); }}
            style={{ background: INK_2, color: BRICK, borderLeft: `3px solid ${BRICK}` }}
            className={`${workout.movementMode === 'Flexibility' ? 'order-first ' : ''}flex-1 min-w-0 rounded-md py-2.5 px-1 text-sm font-medium flex items-center justify-center gap-1`}
          >
            <Plus size={13} /> Stretch
          </button>
          )}
        </div>
      )}

      <button
        onClick={() => finishArm.press('f', onFinish)}
        data-armed={finishArm.armed === 'f'}
        style={finishArm.armed === 'f' ? { background: INK_2, color: SKY, outline: `2px solid ${SKY}`, outlineOffset: -2 } : { background: SKY, color: INK }}
        className="w-full rounded-md py-3.5 text-sm font-medium flex items-center justify-center gap-1.5 mt-6 mb-3"
      >
        <Check size={16} /> {finishArm.armed === 'f' ? 'Tap again to finish' : 'Finish Workout'}
      </button>

      <button
        onClick={() => (sets.length === 0 ? onDiscard() : discardArm.press('d', onDiscard))}
        data-armed={discardArm.armed === 'd'}
        style={discardArm.armed === 'd' ? { background: BRICK, color: PAPER } : { color: BRICK }}
        className={`w-full text-sm py-2 text-center ${discardArm.armed === 'd' ? 'rounded-md' : 'underline'}`}
      >
        {discardArm.armed === 'd' ? 'Tap again to cancel (what you logged here is cleared)' : 'Cancel workout'}
      </button>

      {pairIndex !== null && !pairPicking && (
        <PairChooser
          exercise={exercises[pairIndex]}
          next={exercises[pairIndex + 1] && exercises[pairIndex + 1].type === 'resistance' && !exercises[pairIndex + 1].supersetId ? exercises[pairIndex + 1] : null}
          onNext={() => { onPairExisting(pairIndex); setActiveGroupKey(null); setPairIndex(null); }}
          onOther={() => setPairPicking(true)}
          onCardio={(name) => { onPairCardio(pairIndex, name); setActiveGroupKey(null); setPairIndex(null); }}
          onClose={() => setPairIndex(null)}
        />
      )}
      {pairIndex !== null && pairPicking && (
        <SwapPicker
          exercise={exercises[pairIndex]}
          usedNames={exercises.map((e) => e.name)}
          location={workout.location}
          onPick={(next) => { onPairNew(pairIndex, next); setActiveGroupKey(null); setPairIndex(null); setPairPicking(false); }}
          onClose={() => { setPairIndex(null); setPairPicking(false); }}
        />
      )}
      {swapIndex !== null && (
        <SwapPicker
          exercise={exercises[swapIndex]}
          usedNames={exercises.map((e) => e.name)}
          location={workout.location}
          onPick={(next) => {
            const wasOpenAerobic = exercises[swapIndex]?.type === 'aerobic';
            onReplace(swapIndex, next);
            // Renaming changes the card's key; keep an aerobic card open
            // so the client can log right after choosing their activity.
            if (wasOpenAerobic) setActiveGroupKey(`aerobic-${next.name}`);
            setSwapIndex(null);
          }}
          onClose={() => setSwapIndex(null)}
        />
      )}
    </div>
  );
}

// A one-tap way to log a burst of cardio between resistance sets
// (jump rope, a quick jog, etc.) without going through Add to Workout's
// multi-step flow — one small form (activity, intensity, minutes) logs
// it immediately instead of just adding an exercise card to fill in later.
// The actual cardio-burst mini-form, shared by the full-row
// QuickAerobicButton (used between two non-aerobic exercises) and the
// compact "+" trigger built into an AerobicCard's own collapsed row
// (used right next to an aerobic exercise, where a whole separate
// insertion row would just be redundant real estate).
function QuickAerobicForm({ onSubmit, onCancel, fixedName }) {
  const [name, setName] = useState(fixedName || AEROBIC_ACTIVITIES_QUICK[0]);
  const [intensity, setIntensity] = useState('Moderate');
  const [minutes, setMinutes] = useState(5);

  function submit() {
    onSubmit(name, intensity, minutes);
  }

  return (
    <div style={{ background: INK_2, borderLeft: `3px solid ${AMBER}` }} className="rounded-md px-3 py-3 mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <span style={{ color: PAPER }} className="text-sm font-medium">{fixedName || 'Cardio burst'}</span>
        <button onClick={onCancel} style={{ color: TEXT_SOFT }} className="p-1 -m-1" aria-label="Cancel"><X size={16} /></button>
      </div>
      {!fixedName && (
        <div className="flex flex-wrap gap-1.5">
          {[...new Set([...AEROBIC_ACTIVITIES_QUICK, ...LIFESTYLE_ACTIVITIES])].slice(0, 8).map((a) => (
            <button
              key={a}
              onClick={() => setName(a)}
              style={{ background: name === a ? AMBER : INK_3, color: name === a ? ON_AMBER : PAPER_DIM }}
              className="px-2.5 py-1 rounded-full text-sm"
            >
              {a}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        {['Light', 'Moderate', 'Vigorous'].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setIntensity(lvl)}
            style={{ background: intensity === lvl ? AMBER : INK_3, color: intensity === lvl ? ON_AMBER : PAPER_DIM }}
            className="flex-1 py-1.5 rounded-md text-sm"
          >
            {lvl}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value === '' ? '' : Number(e.target.value))}
          onFocus={(e) => e.target.select()}
          aria-label="Minutes"
          style={{ background: INK_3, color: PAPER, fontFamily: 'Outfit, sans-serif' }}
          className="w-14 rounded-md px-2 py-2 text-sm outline-none text-center"
        />
        <span style={{ color: TEXT_SOFT }} className="text-sm">min</span>
        <button onClick={submit} style={{ background: AMBER, color: ON_AMBER }} className="flex-1 rounded-md py-2 text-sm font-medium">Log it</button>
      </div>
    </div>
  );
}

function QuickAerobicButton({ onSubmit, fixedName, preset }) {
  const [open, setOpen] = useState(false);
  const [other, setOther] = useState(false); // log something different from the one-tap preset
  const [justLogged, setJustLogged] = useState(false);
  const hasPreset = Boolean(fixedName && preset);

  if (!open) {
    return (
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            if (hasPreset) {
              onSubmit(fixedName, preset.intensity, preset.minutes);
              setJustLogged(true);
              setTimeout(() => setJustLogged(false), 1200);
            } else setOpen(true);
          }}
          style={{ background: INK_2, color: AMBER, borderLeft: `3px solid ${AMBER}` }}
          className="flex-1 min-w-0 rounded-md py-1.5 text-sm font-medium flex items-center justify-center gap-1.5"
        >
          {justLogged ? <Check size={14} /> : <Plus size={14} />} {justLogged ? 'Logged' : fixedName ? `${fixedName}${preset ? ` · ${preset.minutes} min` : ''}` : 'Add Aerobic'}
        </button>
        {hasPreset && (
          <button
            onClick={() => { setOther(true); setOpen(true); }}
            style={{ background: INK_2, color: TEXT_SOFT }}
            className="shrink-0 rounded-md px-3 py-1.5 text-sm"
          >
            Other
          </button>
        )}
      </div>
    );
  }

  return (
    <QuickAerobicForm
      fixedName={other ? undefined : fixedName}
      onCancel={() => { setOpen(false); setOther(false); }}
      onSubmit={(name, intensity, minutes) => { onSubmit(name, intensity, minutes); setOpen(false); setOther(false); }}
    />
  );
}

// Tap a logged between-sets cardio burst to change its activity,
// intensity, or minutes — or remove it.
function EditBurstModal({ set, onSave, onRemove, onClose }) {
  const startIntensity = set.vigorousMinutes ? 'Vigorous' : set.lightMinutes ? 'Light' : 'Moderate';
  const [name, setName] = useState(set.distance || '');
  const [intensity, setIntensity] = useState(startIntensity);
  const [minutes, setMinutes] = useState((set.lightMinutes || 0) + (set.moderateMinutes || 0) + (set.vigorousMinutes || 0) || Math.round((set.durationSeconds || 0) / 60) || 5);

  function save() {
    const m = Number(minutes) > 0 ? Number(minutes) : 1;
    onSave({
      distance: name.trim() || null,
      duration_seconds: m * 60,
      light_minutes: intensity === 'Light' ? m : null,
      moderate_minutes: intensity === 'Moderate' ? m : null,
      vigorous_minutes: intensity === 'Vigorous' ? m : null,
    });
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
        <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" />
        <div style={{ background: INK_2 }} className="relative w-full max-w-md rounded-t-xl px-4 pt-4 pb-6 space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <div style={{ color: PAPER }} className="text-sm font-medium">Edit cardio burst</div>
            <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-2 -m-2" aria-label="Close"><X size={18} /></button>
          </div>
          <input
            value={name}
            onChange={(e) => setName(titleCaseLive(e.target.value))}
            placeholder="Activity"
            style={{ background: INK_3, color: PAPER }}
            className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center"
          />
          <div className="flex gap-1.5">
            {['Light', 'Moderate', 'Vigorous'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setIntensity(lvl)}
                style={{ background: intensity === lvl ? AMBER : INK_3, color: intensity === lvl ? ON_AMBER : PAPER_DIM }}
                className="flex-1 py-1.5 rounded-md text-sm"
              >
                {lvl}
              </button>
            ))}
          </div>
          <label className="flex items-center justify-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value === '' ? '' : Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              style={{ background: INK_3, color: PAPER, fontFamily: 'Outfit, sans-serif' }}
              className="w-16 rounded-md px-2 py-2 text-sm outline-none text-center"
            />
            <span style={{ color: TEXT_SOFT }} className="text-sm">min</span>
          </label>
          <div className="flex gap-2">
            <button onClick={onRemove} style={{ background: INK_3, color: BRICK }} className="rounded-md px-4 py-2.5 text-sm font-medium">Remove</button>
            <button onClick={save} style={{ background: AMBER, color: ON_AMBER }} className="flex-1 rounded-md py-2.5 text-sm font-medium">Save</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// "Make it a superset": pair this exercise with the next one in the list, or add another to go with it.
function PairChooser({ exercise, next, onNext, onOther, onCardio, onClose }) {
  const sheet = useSwipeDown(onClose);
  const [cardio, setCardio] = useState(false);
  const [custom, setCustom] = useState('');
  const btn = 'w-full rounded-md py-3 text-sm font-medium mb-2';
  return (
    <Portal>
      <div style={{ background: 'rgba(0,0,0,0.6)' }} className="fixed inset-0 flex items-end justify-center z-50" onClick={onClose}>
        <div ref={sheet.ref} {...sheet.handlers} style={{ background: INK_2, ...sheet.style }} className="w-full max-w-sm rounded-t-2xl px-5 py-5 text-center" onClick={(e) => e.stopPropagation()}>
          <div style={{ background: TEXT_SOFT, opacity: 0.45 }} className={GRAB_BAR_CLASS} />
          <div style={{ color: PAPER }} className="text-base font-bold">Superset {exercise.name} with...</div>
          <div style={{ color: TEXT_SOFT }} className="text-sm mt-1 mb-3">Back to back, no rest between them.</div>
          {cardio ? (
            <>
              <div style={{ color: TEXT_SOFT }} className="text-sm mb-2">Which cardio?</div>
              <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                {[...new Set([...AEROBIC_ACTIVITIES_QUICK, ...LIFESTYLE_ACTIVITIES])].slice(0, 8).map((a) => (
                  <button key={a} onClick={() => onCardio(a)} style={{ background: INK_3, color: PAPER }} className="px-3 py-1.5 rounded-full text-sm">{a}</button>
                ))}
              </div>
              <div className="flex gap-2 mb-2">
                <input value={custom} onChange={(e) => setCustom(titleCaseLive(e.target.value))} placeholder="Or type your own" style={{ background: INK_3, color: PAPER }} className="flex-1 min-w-0 rounded-md px-3 py-2.5 text-sm outline-none" />
                <button disabled={!custom.trim()} onClick={() => onCardio(titleCaseWords(custom))} style={{ background: custom.trim() ? AMBER : INK_3, color: custom.trim() ? ON_AMBER : TEXT_SOFT }} className="shrink-0 rounded-md px-4 py-2.5 text-sm font-medium">Use</button>
              </div>
            </>
          ) : (
          <>
          {next && <button onClick={onNext} style={{ background: INK_3, color: PAPER }} className={btn}>{next.name} (next in your list)</button>}
          <button onClick={onOther} style={{ background: INK_3, color: PAPER }} className={btn}>Another exercise</button>
          <button onClick={() => setCardio(true)} style={{ background: INK_3, color: PAPER }} className={btn}>A cardio burst (jump rope, bike...)</button>
          </>
          )}
          <button onClick={onClose} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2">Cancel</button>
        </div>
      </div>
    </Portal>
  );
}

function SwapPicker({ exercise, usedNames, location, onPick, onClose }) {
  const [custom, setCustom] = useState('');
  const isAerobic = exercise.type === 'aerobic';
  const isFlex = exercise.type === 'flexibility';
  const choosing = isAerobic && exercise.name === WARMUP_AEROBIC_PLACEHOLDER;
  // Swap within the same muscle, or tap another muscle to pick from its list.
  const [group, setGroup] = useState(exercise.muscleGroup);
  const allGroups = Object.keys(isFlex ? FLEXIBILITY_LIBRARY : EXERCISE_LIBRARY);
  const pool = (isAerobic
    ? [...new Set([...AEROBIC_ACTIVITIES_QUICK, ...LIFESTYLE_ACTIVITIES])].map((name) => ({ name }))
    : isFlex
      ? (FLEXIBILITY_LIBRARY[group] || [])
      : filterByLocation(EXERCISE_LIBRARY[group] || [], location)
  ).filter((e) => e.name !== exercise.name && !usedNames.includes(e.name));

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
          <div style={{ color: PAPER }} className="text-sm font-medium">{choosing ? 'Choose your activity' : `Swap "${exercise.name}" for…`}</div>
          <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-2 -m-2">
            <X size={18} />
          </button>
        </div>
        {!isAerobic && allGroups.length > 1 && (
          <div className="flex flex-wrap justify-center gap-1.5 mb-3">
            {allGroups.map((g) => (
              <button key={g} onClick={() => setGroup(g)} style={{ background: group === g ? SKY : INK_3, color: group === g ? INK : PAPER_DIM }} className="px-3 py-1.5 rounded-full text-sm">{g}</button>
            ))}
          </div>
        )}
        {pool.length === 0 ? (
          <div style={{ color: TEXT_SOFT }} className="text-sm py-4 text-center">
            No other {group.toLowerCase()} {isAerobic ? 'activities' : 'exercises'} left to pick from.
          </div>
        ) : (
          <div className="space-y-1">
            {pool.map((e) => (
              <button
                key={e.name}
                onClick={() => onPick(isAerobic ? e : { ...e, muscleGroup: group })}
                style={{ background: INK_3, color: PAPER }}
                className="w-full text-center rounded-md px-4 py-3 text-sm"
              >
                {e.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: `1px dashed ${INK_3}` }}>
          <input
            value={custom}
            onChange={(e) => setCustom(titleCaseLive(e.target.value))}
            placeholder="Or type your own"
            style={{ background: INK_3, color: PAPER }}
            className="flex-1 min-w-0 rounded-md px-3 py-2.5 text-sm outline-none"
          />
          <button
            disabled={!custom.trim()}
            onClick={() => onPick({ name: titleCaseWords(custom) })}
            style={{ background: custom.trim() ? SKY : INK_3, color: custom.trim() ? INK : TEXT_SOFT }}
            className="shrink-0 rounded-md px-4 py-2.5 text-sm font-medium"
          >
            {choosing ? 'Use' : 'Swap'}
          </button>
        </div>
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
        onChange={(e) => setName(titleCaseLive(e.target.value))}
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
        Paired exercises, done back-to-back with no rest between them.
      </div>
      <MovementPicker label="Exercise 1" group={groupA} setGroup={setGroupA} name={nameA} setName={setNameA} location={location} />
      <div style={{ borderTop: `1px dashed ${INK_3}` }} className="pt-3">
        <MovementPicker label="Exercise 2" group={groupB} setGroup={setGroupB} name={nameB} setName={setNameB} location={location} />
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
      titleCaseWords(name),
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
        onChange={(e) => setName(titleCaseLive(e.target.value))}
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
        onChange={(e) => setName(titleCaseLive(e.target.value))}
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

// "+ Stretch": pick a muscle, tap the stretches to add (they stay open so several can go in), or log a
// timed activity like Yoga, or type your own stretch.
function AddStretchForm({ muscleGroups, usedNames, onAddStretch, onAddActivity, onDone }) {
  const groups = [...new Set([...muscleGroups.filter((g) => FLEXIBILITY_LIBRARY[g]), ...Object.keys(FLEXIBILITY_LIBRARY)])];
  const [group, setGroup] = useState(groups[0]);
  const [custom, setCustom] = useState('');
  const [added, setAdded] = useState([]);
  const taken = (name) => usedNames.includes(name) || added.includes(name);
  const list = (FLEXIBILITY_LIBRARY[group] || []).filter((e) => !taken(e.name));
  function addLib(e) {
    onAddStretch(e.name, group, e);
    setAdded((a) => [...a, e.name]);
  }
  function addCustom() {
    const name = titleCaseWords(custom).trim();
    if (!name) return;
    onAddStretch(name, 'Flexibility', { sets: 2, reps: '20-30s' });
    setAdded((a) => [...a, name]);
    setCustom('');
  }
  return (
    <div style={{ background: INK_2, borderLeft: `3px solid ${BRICK}` }} className="rounded-md px-4 py-3 mb-4 groove-ease-in">
      <div style={{ color: PAPER }} className="text-base font-medium mb-2 text-center">Add a stretch</div>
      <div className="flex flex-wrap justify-center gap-1.5 mb-2.5">
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            style={{ background: group === g ? BRICK : INK_3, color: group === g ? PAPER : PAPER_DIM }}
            className="px-3 py-1.5 rounded-full text-sm"
          >
            {g}
          </button>
        ))}
      </div>
      <div className="space-y-1.5 mb-3">
        {list.length === 0 ? (
          <div style={{ color: TEXT_SOFT }} className="text-sm text-center py-1">All the {group.toLowerCase()} stretches are in your workout.</div>
        ) : list.map((e) => (
          <button
            key={e.name}
            onClick={() => addLib(e)}
            style={{ background: INK_3, color: PAPER }}
            className="w-full rounded-md px-3 py-2.5 text-sm flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-1.5 min-w-0"><Plus size={14} color={BRICK} /> <span className="truncate">{e.name}</span></span>
            <span style={{ color: TEXT_SOFT }} className="shrink-0">{e.sets}×{e.reps}</span>
          </button>
        ))}
      </div>
      <div style={{ borderTop: `1px dashed ${INK_3}` }} className="pt-2.5">
        <div style={{ color: TEXT_SOFT }} className="text-sm mb-1.5 text-center">Or log time doing</div>
        <div className="flex flex-wrap justify-center gap-1.5 mb-2.5">
          {FLEXIBILITY_ACTIVITIES.filter((a) => !taken(a)).map((a) => (
            <button
              key={a}
              onClick={() => { onAddActivity(a); setAdded((x) => [...x, a]); }}
              style={{ background: INK_3, color: PAPER_DIM }}
              className="px-3 py-1.5 rounded-full text-sm"
            >
              {a}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(titleCaseLive(e.target.value))}
            onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); }}
            placeholder="Or type your own stretch"
            style={{ background: INK_3, color: PAPER }}
            className="flex-1 min-w-0 rounded-md px-3 py-2.5 text-sm outline-none text-center"
          />
          <button
            onClick={addCustom}
            disabled={!custom.trim()}
            style={{ background: custom.trim() ? BRICK : INK_3, color: custom.trim() ? PAPER : TEXT_SOFT }}
            className="shrink-0 rounded-md px-4 py-2.5 text-sm font-medium"
          >
            Add
          </button>
        </div>
      </div>
      <button onClick={onDone} style={{ background: SKY, color: INK }} className="w-full rounded-md py-2.5 text-sm font-medium mt-3">
        {added.length > 0 ? `Done (${added.length} added)` : 'Cancel'}
      </button>
    </div>
  );
}

function AddAerobicForm({ onAdd, onCancel, activities = AEROBIC_ACTIVITIES_QUICK, targetPlaceholder = 'Target, optional (e.g. 10 min @ moderate pace)' }) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');

  return (
    <div style={{ background: INK_2 }} className="rounded-md px-4 py-3 mb-4">
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-2 text-center">Pick an activity, or type your own</div>
      <div className="flex flex-wrap justify-center gap-2 mb-3">
        {activities.map((a) => (
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
        onChange={(e) => setName(titleCaseLive(e.target.value))}
        placeholder="Activity name"
        style={{ background: INK_3, color: PAPER }}
        className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center mb-3"
      />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={targetPlaceholder}
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

function CardHeader({ title, index, onOpenSwap, onRemove, onDone, onTitleClick }) {
  return (
    <div className="relative flex items-center justify-center mb-1 min-h-[2rem]">
      <div onClick={onTitleClick || onDone} style={{ color: PAPER, paddingInline: `${((onDone ? 1 : 0) + (onOpenSwap ? 1 : 0) + 1) * 1.9}rem` }} className={`min-w-0 text-base font-bold text-center ${onDone ? 'cursor-pointer' : ''}`}>
        {index != null && <span style={{ color: TEXT_SOFT }} className="font-medium mr-1.5">{index}.</span>}{title}
      </div>
      <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
        {onDone && (
          <button onClick={onDone} style={{ color: TEXT_SOFT }} className="p-2 -m-1" title="Done — collapse this exercise">
            <Check size={14} />
          </button>
        )}
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

function roundToFive(n) {
  return Math.round(n / 5) * 5;
}

// Pull-ups, dips and chin-ups default to "use bodyweight" because the
// lifter's own weight is the load. Any other exercise (walking lunges,
// push-ups...) can still be switched to bodyweight from its edit panel.
// Bodyweight lifts show the real load (bodyweight plus whatever was added,
// e.g. 185 + 15 = 200), or "BW" when nothing was added.
function bwLabel(totalWeight, bodyweight) {
  const total = Math.round(Number(totalWeight) || 0);
  const added = total - Math.round(Number(bodyweight) || 0);
  return added > 0 ? String(total) : 'BW';
}

function isBodyweightEligible(name) {
  return /pull-up|dip|chin-up/i.test(name || '');
}

// byTime/useBodyweight are controlled from outside (ExerciseCard's swipe-
// to-edit settings panel) so those toggles live in one place instead of
// cluttering every card — callers that don't need that (SupersetCard)
// just own the same two bits of state locally and pass them through.
function WeightRepsInput({ exercise, style, bodyweight, last, onLog, nextSetNumber, onFinish, byTime, useBodyweight, loggedSets, variantKey = null, variantHasHistory = false }) {
  const suggestion = suggestNextWeight(exercise, last, style, last?.daysSince);
  // Reopening the app mid-workout remounts this component, wiping the
  // weight/reps the user had typed in for the next set — but any set
  // already logged THIS workout survived (it's persisted), so prefer
  // continuing from that over falling back to last time's suggestion.
  const liftSets = (loggedSets || []).filter((s) => s.movementType !== 'aerobic');
  const mostRecentLogged = liftSets.length > 0
    ? [...liftSets].sort((a, b) => (b.setNumber ?? 0) - (a.setNumber ?? 0))[0]
    : null;
  // Starts from the last/suggested weight for this exercise (or 0 if
  // there's no history yet), and from 8 reps — the middle of a typical
  // working-set rep range. Weight/reps then carry over set-to-set, so a
  // straight set of identical sets is just repeated taps of "Log set"
  // with no adjustment needed.
  const startWeight = useBodyweight
    ? (mostRecentLogged?.isBodyweight ? Math.max(0, (mostRecentLogged.weight ?? 0) - (bodyweight || 0)) : 0)
    : (mostRecentLogged?.weight ?? suggestion?.weight ?? last?.weight ?? null);
  // A barbell weighs 45 lb on its own, so a barbell lift is never lighter.
  const isBarbell = exercise.equipment === 'barbell' || /barbell/i.test(exercise.name || '');
  const barbellFloor = isBarbell && !useBodyweight ? BARBELL_MIN_LB : 0;
  const [weight, setWeight] = useState(Math.max(barbellFloor, startWeight != null ? roundToFive(startWeight) : 0));
  const belowBarbell = barbellFloor > 0 && Number(weight) < barbellFloor;
  // Switching to/from bodyweight changes what the number means (added
  // load vs. total), so start the field over instead of carrying it across.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setWeight(useBodyweight ? 0 : Math.max(isBarbell ? BARBELL_MIN_LB : 0, roundToFive(mostRecentLogged?.isBodyweight ? 0 : (mostRecentLogged?.weight ?? suggestion?.weight ?? last?.weight ?? 0))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useBodyweight]);
  // Choosing a grip / bar that has its own history moves the weight box to what that variation last used.
  const firstVariant = useRef(true);
  useEffect(() => {
    if (firstVariant.current) { firstVariant.current = false; return; }
    if (!variantHasHistory || !last) return;
    const w = suggestNextWeight(exercise, last, style, last?.daysSince)?.weight ?? last.weight;
    if (w == null) return;
    const base = useBodyweight ? (last.isBodyweight ? Math.max(0, last.weight - (bodyweight || 0)) : 0) : roundToFive(w);
    setWeight(Math.max(isBarbell && !useBodyweight ? BARBELL_MIN_LB : 0, base));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantKey]);
  const [reps, setReps] = useState(mostRecentLogged?.reps ?? 8);
  const repsRef = useRef(null);
  const jumpTimer = useRef(null);
  useEffect(() => () => clearTimeout(jumpTimer.current), []);
  // A weight ending in 0 or 5 is usually finished (135, 45, 22.5), so hop to reps after a short pause
  // (the pause lets 10 become 105 for anyone still typing).
  function weightTyped(v) {
    setWeight(v === '' ? '' : Number(v));
    clearTimeout(jumpTimer.current);
    if (!byTime && /[05]$/.test(String(v)) && Number(v) > 0) jumpTimer.current = setTimeout(() => { repsRef.current?.focus(); }, 650);
  }
  const [seconds, setSeconds] = useState(mostRecentLogged?.durationSeconds ?? 30);

  function handleLog() {
    if (belowBarbell) return;
    const countPayload = byTime ? { reps: null, durationSeconds: seconds } : { reps, durationSeconds: null };
    if (useBodyweight) {
      onLog({ setNumber: nextSetNumber, weight: (bodyweight || 0) + weight, isBodyweight: true, ...countPayload });
    } else {
      onLog({ setNumber: nextSetNumber, weight, isBodyweight: false, ...countPayload });
    }
  }

  // One-tap "Repeat": logs exactly the previous set again (this workout's last set, or last time's for the
  // first set), even after the boxes were changed. Hidden when Log would do the very same thing.
  const ref = mostRecentLogged || (last && last.weight != null ? last : null);
  const refCount = ref ? (ref.durationSeconds ? `${ref.durationSeconds}s` : ref.reps != null ? `${ref.reps}` : null) : null;
  const currentTotal = useBodyweight ? (bodyweight || 0) + (Number(weight) || 0) : Number(weight);
  const sameAsInputs = ref && Number(ref.weight) === currentTotal && (byTime ? ref.durationSeconds === Number(seconds) : ref.reps === Number(reps) && !ref.durationSeconds) && Boolean(ref.isBodyweight) === useBodyweight;
  const showRepeat = Boolean(ref) && refCount != null && !sameAsInputs && !(isBarbell && Number(ref.weight) < BARBELL_MIN_LB);
  function handleRepeat() {
    onLog({ setNumber: nextSetNumber, weight: ref.weight, isBodyweight: Boolean(ref.isBodyweight), reps: ref.reps ?? null, durationSeconds: ref.durationSeconds ?? null, ...(mostRecentLogged ? { distance: mostRecentLogged.distance || null } : {}) });
  }

  // One short line for target/last/suggested; units sit inside the boxes so
  // there is no label row above them.
  const rmTarget = targetLoad(style, oneRmFor(exercise.name));
  const contextBits = [
    `Target ${exercise.sets}×${exercise.reps}`,
    rmTarget && `Aim ${rmTarget.low}–${rmTarget.high} lb`,
    last && `Last ${last.isBodyweight ? bwLabel(last.weight, bodyweight) : (formatMoneyLikeWeight(last.weight) ?? '—')}×${last.durationSeconds ? `${last.durationSeconds}s` : (last.reps ?? '—')}`,
    suggestion && `Try ${formatMoneyLikeWeight(suggestion.weight)}`,
  ].filter(Boolean);

  const boxClass = 'w-full rounded-md pl-1.5 pr-7 py-2.5 text-base outline-none text-center';
  const boxStyle = { background: INK_3, color: PAPER, fontFamily: 'Outfit, sans-serif' };
  const unitClass = 'absolute right-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none';

  return (
    <>
      <div className="flex items-center justify-center gap-2">
        <label className="relative w-[4.3rem] shrink-0">
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => weightTyped(e.target.value)}
            onFocus={(e) => e.target.select()}
            style={boxStyle}
            className={boxClass}
            aria-label="Weight in pounds"
          />
          <span style={{ color: TEXT_SOFT }} className={unitClass}>{useBodyweight ? '+lb' : 'lb'}</span>
        </label>
        {byTime ? (
          <label className="relative w-[4.3rem] shrink-0">
            <input
              type="number"
              inputMode="numeric"
              value={seconds}
              onChange={(e) => setSeconds(e.target.value === '' ? '' : Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              style={boxStyle}
              className={boxClass}
              aria-label="Seconds"
            />
            <span style={{ color: TEXT_SOFT }} className={unitClass}>sec</span>
          </label>
        ) : (
          <label className="relative w-[4.3rem] shrink-0">
            <input
              type="number"
              inputMode="numeric"
              ref={repsRef}
              value={reps}
              onChange={(e) => setReps(e.target.value === '' ? '' : Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              style={boxStyle}
              className={boxClass}
              aria-label="Reps"
            />
            <span style={{ color: TEXT_SOFT }} className={unitClass}>reps</span>
          </label>
        )}
        <button
          // Without this, tapping Log while a weight/reps field is still
          // focused blurs it first — closing the mobile keyboard and
          // shrinking the viewport right as the tap lands, which reads as
          // the page itself jumping/scrolling. Blocking the default
          // mousedown keeps focus (and the keyboard) exactly where it was.
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleLog}
          disabled={belowBarbell}
          style={{ background: belowBarbell ? INK_3 : SKY, color: belowBarbell ? TEXT_SOFT : INK }}
          className="flex-1 rounded-md py-2.5 text-base font-medium flex items-center justify-center gap-1"
        >
          <Plus size={16} /> Log
        </button>
        {onFinish && nextSetNumber > 1 && (
          <button
            onClick={onFinish}
            style={{ background: INK_3, color: PAPER }}
            className="rounded-md py-3 px-3"
            title="Finish this exercise"
          >
            <Check size={14} />
          </button>
        )}
      </div>
      {showRepeat && (
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleRepeat}
          style={{ background: INK_3, color: PAPER_DIM }}
          className="w-full mt-1.5 rounded-md py-1.5 text-sm flex items-center justify-center gap-1.5"
        >
          <RotateCcw size={13} /> Repeat {mostRecentLogged ? 'last set' : 'last time'} · {ref.isBodyweight ? bwLabel(ref.weight, bodyweight) : ref.weight}×{refCount}
        </button>
      )}
      {contextBits.length > 0 && (
        <div style={{ color: TEXT_SOFT }} className="text-[13px] mt-1.5 text-center">
          {contextBits.join(' · ')}
        </div>
      )}
      {belowBarbell && <div style={{ color: TEXT_SOFT }} className="text-sm text-center mt-1 mb-2">The bar alone is {BARBELL_MIN_LB} lb.</div>}
    </>
  );
}

// Swipe left reveals Swap/Edit/Delete — same reveal-a-drawer pattern as
// Birdseye's goal rows (see GoalRow): the row's own content never moves,
// three buttons slide in from off-screen to overlay it.
// Options for an exercise row, behind a visible "..." button (it used to be a left swipe, which fought with
// swiping between tabs and was hard to discover): Swap, Move up / down, Edit, Remove.
// `menuSide` is where the button sits: right on a collapsed row, left on an open card.
function SwipeActions({ children, title, onSwap, onSuperset, supersetLabel = 'Make it a superset', onEdit, editLabel = 'Edit settings', onRemove, onUndo, onNever, onMoveUp, onMoveDown, menuSide = 'right', menuClass }) {
  const [open, setOpen] = useState(false);
  const arm = useArmed();
  const sheet = useSwipeDown(() => setOpen(false));
  const close = () => setOpen(false);
  const row = (key, label, Icon, color, onClick) => (
    <button key={key} onClick={onClick} style={{ background: INK_3, color: PAPER }} className="w-full flex items-center justify-center gap-2 rounded-md py-3 text-sm font-medium mb-2">
      <Icon size={16} color={color} /> {label}
    </button>
  );
  return (
    <div className="relative rounded-md">
      {children}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        style={{ color: TEXT_SOFT }}
        className={`absolute top-1/2 -translate-y-1/2 ${menuClass || (menuSide === 'left' ? 'left-0.5 top-5' : 'right-1')} z-[1] w-9 h-9 flex items-center justify-center rounded-full`}
        aria-label="Exercise options"
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <Portal>
          <div style={{ background: 'rgba(0,0,0,0.6)' }} className="fixed inset-0 flex items-end md:items-center justify-center z-50" onClick={close}>
            <div ref={sheet.ref} {...sheet.handlers} style={{ background: INK_2, ...sheet.style }} className="w-full max-w-sm rounded-t-2xl md:rounded-2xl px-5 py-5" onClick={(e) => e.stopPropagation()}>
              <div style={{ background: TEXT_SOFT, opacity: 0.45 }} className={GRAB_BAR_CLASS} />
              {title && <div style={{ color: PAPER }} className="text-base font-bold text-center mb-3">{title}</div>}
              {onUndo && row('undo', 'Not finished yet (un-check)', Check, LIME, () => { close(); onUndo(); })}
              {onSwap && row('swap', 'Swap for another', Replace, LIME, () => { close(); onSwap(); })}
              {onSuperset && row('superset', supersetLabel, Link2, LIME, () => { close(); onSuperset(); })}
              {onNever && row('never', 'Swap, and never suggest this again', Replace, TEXT_SOFT, () => { close(); onNever(); })}
              {onEdit && row('edit', editLabel, SlidersHorizontal, SKY, () => { close(); onEdit(); })}
              {(onMoveUp || onMoveDown) && (
                <div className="flex gap-2">
                  {onMoveUp ? <div className="flex-1">{row('up', 'Move up', ChevronUp, TEXT_SOFT, () => { close(); onMoveUp(); })}</div> : null}
                  {onMoveDown ? <div className="flex-1">{row('down', 'Move down', ChevronDown, TEXT_SOFT, () => { close(); onMoveDown(); })}</div> : null}
                </div>
              )}
              <button
                onClick={() => arm.press('remove', () => { close(); onRemove(); })}
                data-armed={arm.armed === 'remove'}
                style={{ background: BRICK, color: PAPER, outline: arm.armed === 'remove' ? `2px solid ${PAPER}` : 'none', outlineOffset: -4 }}
                className="w-full flex items-center justify-center gap-2 rounded-md py-3 text-sm font-medium mb-2"
              >
                <Trash2 size={16} /> {arm.armed === 'remove' ? 'Tap again to remove' : 'Remove'}
              </button>
              <button onClick={close} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2 text-center">Cancel</button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

function ExerciseCard({
  index, exercise, style, bodyweight, loggedSets, last, onLogSet, onDeleteSet, onOpenSwap, onRemove,
  isActive, onActivate, onCollapse, onQuickAerobic, onUpdateSet, combinedActivity, preset, isDone, onDone, onUndo, onNever, onSuperset, onMoveUp, onMoveDown, lastFor,
}) {
  const nextSetNumber = loggedSets.filter((s) => s.movementType !== 'aerobic').length + 1;
  const [showSettings, setShowSettings] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const guide = guideFor(exercise.name);
  // Grip / handle / bar: chosen per set for Pull-Ups, otherwise once and kept for this workout (never carried to the next one).
  const variation = variationFor(exercise.name);
  const lastLabel = [...loggedSets].reverse().find((x) => x.movementType !== 'aerobic' && x.distance)?.distance || null;
  const [variant, setVariant] = useState(variation && !variation.perSet && variation.options.includes(lastLabel) ? lastLabel : null);
  const logWithVariant = (p) => { onLogSet('distance' in p ? p : { ...p, distance: variant }); if (variation?.perSet) setVariant(null); };
  // Last / Try follow the chosen variation once there is history for it.
  const lastV = variant && lastFor ? lastFor(variant) : null;
  const lastShown = lastV && lastV.matchedVariant ? lastV : last;
  const [editingBurst, setEditingBurst] = useState(null);
  const [useBodyweight, setUseBodyweight] = useState(isBodyweightEligible(exercise?.name) && bodyweight != null);
  const [byTime, setByTime] = useState(false);
  const { armed, press } = useArmed();

  if (!isActive) {
    return (
      <SwipeActions title={exercise.name} onSwap={onOpenSwap} onSuperset={onSuperset} onEdit={() => { onActivate(); setShowSettings(true); }} onRemove={onRemove} onUndo={onUndo} onNever={onNever} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
        <button
          onClick={onActivate}
          style={{ background: isDone ? DONE_BG : INK_2, borderLeft: `3px solid ${isDone ? LIME : SKY}` }}
          className="w-full rounded-md pl-4 pr-11 py-3 flex items-center justify-between text-left"
        >
          <span className="min-w-0">
            <span style={{ color: PAPER }} className="text-base font-bold flex items-baseline gap-2">
              <span style={{ color: TEXT_SOFT }} className="font-medium">{index}.</span> <span>{exercise.name}{isDone && ' ✅'}</span>
            </span>
            <span style={{ color: TEXT_SOFT }} className="text-sm block pl-6">
              {loggedSets.length > 0 ? `${loggedSets.length} logged` : `${exercise.sets}×${exercise.reps}`}
            </span>
          </span>
        </button>
      </SwipeActions>
    );
  }

  return (
    <SwipeActions title={exercise.name} menuSide="left" onSwap={onOpenSwap} onSuperset={onSuperset} onEdit={() => setShowSettings((v) => !v)} onRemove={onRemove} onUndo={onUndo} onNever={onNever} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <div style={{ background: isDone ? DONE_BG : INK_2, borderLeft: `3px solid ${isDone ? LIME : SKY}` }} className="rounded-md px-4 py-2.5 groove-ease-in">
        <div className="flex items-center justify-between mb-1">
          <span className="w-6 shrink-0" aria-hidden="true" />
          <span onClick={onCollapse} style={{ color: PAPER }} className="flex-1 min-w-0 cursor-pointer text-base font-bold flex items-center justify-center gap-2 text-center">
            <span style={{ color: TEXT_SOFT }} className="font-medium">{index}.</span> {exercise.name}{isDone && ' ✅'}
          </span>
          <span className="flex items-center shrink-0">
            {guide && <button onClick={() => setGuideOpen(true)} style={{ color: SKY }} className="p-2 -m-1" aria-label={`How to: ${exercise.name}`}><Info size={16} /></button>}
            <button onClick={onCollapse} style={{ color: TEXT_SOFT }} className="p-2 -m-1 ml-1" title="Collapse">
              <ChevronUp size={16} />
            </button>
          </span>
        </div>
        {guideOpen && guide && <ExerciseGuideSheet name={exercise.name} guide={guide} accent={SKY} onClose={() => setGuideOpen(false)} />}

        {showSettings && (
          <div style={{ background: INK_3 }} className="rounded-md px-3 py-2.5 mb-2.5 flex items-center justify-center gap-4">
            <button onClick={() => setByTime((v) => !v)} style={{ color: TEXT_SOFT }} className="text-sm flex items-center gap-1.5">
              <Check size={12} style={{ opacity: byTime ? 1 : 0.25 }} /> Log by seconds
            </button>
            <button onClick={() => setUseBodyweight((v) => !v)} style={{ color: TEXT_SOFT }} className="text-sm flex items-center gap-1.5">
              <Check size={12} style={{ opacity: useBodyweight ? 1 : 0.25 }} /> Use bodyweight{bodyweight != null ? ` (${bodyweight})` : ''}
            </button>
          </div>
        )}

        {loggedSets.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 mb-1">
            {loggedSets.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  if (s.movementType === 'aerobic' && onUpdateSet) setEditingBurst(s);
                  else press(s.id, () => onDeleteSet(s.id));
                }}
                style={{ background: armed === s.id ? BRICK : INK_3, color: armed === s.id ? PAPER : PAPER_DIM, fontFamily: 'Outfit, sans-serif' }}
                data-armed={armed === s.id}
                className="rounded-full px-2.5 py-1 text-sm tabular-nums flex items-center gap-1"
              >
                {s.movementType === 'aerobic'
                  ? `${s.distance ? `${s.distance} · ` : ''}${formatIntensityMinutes(s)}`
                  : <>{s.distance ? <span style={{ color: TEXT_SOFT }} className="text-[13px] mr-1">{s.distance}</span> : null}{s.isBodyweight ? bwLabel(s.weight, bodyweight) : s.weight ?? '—'}×{s.durationSeconds ? `${s.durationSeconds}s` : (s.reps ?? '—')}</>}
              <span style={{ borderLeft: `1px solid ${TEXT_SOFT}`, opacity: 0.9 }} className="pl-1.5 ml-0.5 flex items-center"><X size={12} strokeWidth={3} /></span>
              </button>
            ))}
          </div>
        )}

        {variation && <VariationChips variation={variation} value={variant} onChange={setVariant} />}
        <WeightRepsInput
          exercise={exercise} style={style} bodyweight={bodyweight} last={lastShown} variantKey={variant} variantHasHistory={Boolean(lastV && lastV.matchedVariant)}
          onLog={logWithVariant} nextSetNumber={nextSetNumber} onFinish={loggedSets.length > 0 ? () => { onDone && onDone(); onCollapse(); } : null}
          byTime={byTime} useBodyweight={useBodyweight} loggedSets={loggedSets}
        />
        {onQuickAerobic && nextSetNumber > 1 && (
          <div className="mt-2"><QuickAerobicButton fixedName={combinedActivity} preset={preset} onSubmit={onQuickAerobic} /></div>
        )}
        {editingBurst && (
          <EditBurstModal
            set={editingBurst}
            onClose={() => setEditingBurst(null)}
            onSave={(fields) => { onUpdateSet(editingBurst.id, fields); setEditingBurst(null); }}
            onRemove={() => { onDeleteSet(editingBurst.id); setEditingBurst(null); }}
          />
        )}
      </div>
    </SwipeActions>
  );
}

// Grip / handle / bar choice for an exercise (tap again to clear).
function VariationChips({ variation, value, onChange }) {
  return (
    <div className="mb-2">
      <div style={{ color: TEXT_SOFT }} className="text-[13px] text-center mb-1">{variation.label}{variation.perSet ? ' for this set' : ''}</div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {variation.options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(value === o ? null : o)}
            style={{ background: value === o ? SKY : INK_3, color: value === o ? INK : PAPER_DIM }}
            className="rounded-full px-3 py-1 text-sm"
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

// Each superset member owns its own reps/seconds + bodyweight toggle —
// supersets are rare enough that these stay inline rather than behind
// a swipe-to-edit panel like the main list gets.
// One member of a superset pair — gets the same swipe-to-edit/delete
// treatment and collapsed-settings-behind-Edit pattern as a standalone
// ExerciseCard, so the gesture is consistent everywhere in a workout
// rather than supersets being the one place with permanent inline
// toggles and tap-target icon buttons instead.
function SupersetMember({ exercise, style, bodyweight, loggedSets, last, lastFor, onLogSet, onDeleteSet, onOpenSwap, onRemove, onSplit, onUndo, nextSetNumber }) {
  const { armed, press } = useArmed();
  const [showSettings, setShowSettings] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const guide = guideFor(exercise.name);
  const variation = variationFor(exercise.name);
  const lastLabel = [...loggedSets].reverse().find((x) => x.distance)?.distance || null;
  const [variant, setVariant] = useState(variation && !variation.perSet && variation.options.includes(lastLabel) ? lastLabel : null);
  const logWithVariant = (p) => { onLogSet('distance' in p ? p : { ...p, distance: variant }); if (variation?.perSet) setVariant(null); };
  const lastV = variant && lastFor ? lastFor(variant) : null;
  const lastShown = lastV && lastV.matchedVariant ? lastV : last;
  const [useBodyweight, setUseBodyweight] = useState(isBodyweightEligible(exercise?.name) && bodyweight != null);
  const [byTime, setByTime] = useState(false);

  return (
    <SwipeActions title={exercise.name} menuSide="left" onSwap={onOpenSwap} onSuperset={onSplit} supersetLabel="Split the superset" onUndo={onUndo} onEdit={() => setShowSettings((v) => !v)} onRemove={onRemove}>
      <div>
        <div style={{ color: PAPER }} className="text-base font-bold text-center mb-1 px-8">
          {exercise.name}
          {guide && <button onClick={() => setGuideOpen(true)} style={{ color: SKY }} className="inline-flex align-middle p-1.5 -my-1 ml-0.5" aria-label={`How to: ${exercise.name}`}><Info size={15} /></button>}
        </div>
        {guideOpen && guide && <ExerciseGuideSheet name={exercise.name} guide={guide} accent={SKY} onClose={() => setGuideOpen(false)} />}
        {showSettings && (
          <div className="flex items-center justify-center gap-2 mb-2">
            <button
              onClick={() => setByTime((v) => !v)}
              style={{ background: INK_3, color: PAPER }}
              className="text-sm rounded-md px-3 py-1.5"
            >
              {byTime ? 'Log by reps' : 'Log by seconds'}
            </button>
            <button
              onClick={() => setUseBodyweight((v) => !v)}
              style={{ background: INK_3, color: PAPER }}
              className="text-sm rounded-md px-3 py-1.5 flex items-center gap-1"
            >
              <Check size={12} style={{ opacity: useBodyweight ? 1 : 0.25 }} /> Use bodyweight{bodyweight != null ? ` (${bodyweight})` : ''}
            </button>
          </div>
        )}
        {loggedSets.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mb-2">
            {loggedSets.map((s) => (
              <button
                key={s.id}
                onClick={() => press(s.id, () => onDeleteSet(s.id))}
                style={{ background: armed === s.id ? BRICK : INK_3, color: armed === s.id ? PAPER : PAPER_DIM, fontFamily: 'Outfit, sans-serif' }}
                data-armed={armed === s.id}
                className="rounded-full px-2.5 py-1 text-sm tabular-nums flex items-center gap-1"
              >
                {s.distance ? <span style={{ color: TEXT_SOFT }} className="text-[13px] mr-1">{s.distance}</span> : null}{s.isBodyweight ? bwLabel(s.weight, bodyweight) : s.weight ?? '—'}×{s.durationSeconds ? `${s.durationSeconds}s` : (s.reps ?? '—')}
              <span style={{ borderLeft: `1px solid ${TEXT_SOFT}`, opacity: 0.9 }} className="pl-1.5 ml-0.5 flex items-center"><X size={12} strokeWidth={3} /></span>
              </button>
            ))}
          </div>
        )}
        {variation && <VariationChips variation={variation} value={variant} onChange={setVariant} />}
        <WeightRepsInput
          exercise={exercise}
          style={style}
          bodyweight={bodyweight}
          last={lastShown}
          variantKey={variant}
          variantHasHistory={Boolean(lastV && lastV.matchedVariant)}
          onLog={logWithVariant}
          nextSetNumber={nextSetNumber}
          byTime={byTime}
          useBodyweight={useBodyweight}
          loggedSets={loggedSets}
        />
      </div>
    </SwipeActions>
  );
}

// A cardio partner inside a superset (jump rope between squats, say): minutes + effort, logged as aerobic.
function SupersetCardio({ exercise, loggedSets, onLogSet, onDeleteSet, onOpenSwap, onRemove, onSplit, onUndo }) {
  const { armed, press } = useArmed();
  const lastMin = loggedSets.length ? Math.round((loggedSets[loggedSets.length - 1].durationSeconds || 120) / 60) : 2;
  const [minutes, setMinutes] = useState(lastMin);
  const [intensity, setIntensity] = useState('Moderate');
  function log() {
    const m = Number(minutes) || 0;
    if (m <= 0) return;
    onLogSet({
      setNumber: loggedSets.length + 1, movementType: 'aerobic', weight: null, reps: null, durationSeconds: m * 60,
      lightMinutes: intensity === 'Light' ? m : null, moderateMinutes: intensity === 'Moderate' ? m : null, vigorousMinutes: intensity === 'Vigorous' ? m : null,
    });
  }
  return (
    <SwipeActions title={exercise.name} menuSide="left" onSwap={onOpenSwap} onSuperset={onSplit} supersetLabel="Split the superset" onUndo={onUndo} onRemove={onRemove}>
      <div>
        <div style={{ color: PAPER }} className="text-base font-bold text-center mb-1 px-8">{exercise.name} <span style={{ color: AMBER }} className="text-sm font-medium">cardio</span></div>
        {loggedSets.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mb-2">
            {loggedSets.map((x) => (
              <button
                key={x.id}
                onClick={() => press(x.id, () => onDeleteSet(x.id))}
                data-armed={armed === x.id}
                style={{ background: armed === x.id ? BRICK : INK_3, color: armed === x.id ? PAPER : PAPER_DIM, fontFamily: 'Outfit, sans-serif' }}
                className="rounded-full px-2.5 py-1 text-sm tabular-nums flex items-center gap-1"
              >
                {Math.round((x.durationSeconds || 0) / 60)} min
                <span style={{ borderLeft: `1px solid ${TEXT_SOFT}`, opacity: 0.9 }} className="pl-1.5 ml-0.5 flex items-center"><X size={12} strokeWidth={3} /></span>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-1.5 mb-2">
          {['Light', 'Moderate', 'Vigorous'].map((lvl) => (
            <button key={lvl} onClick={() => setIntensity(lvl)} style={{ background: intensity === lvl ? AMBER : INK_3, color: intensity === lvl ? ON_AMBER : PAPER_DIM }} className="flex-1 py-1.5 rounded-md text-sm">{lvl}</button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2">
          <label className="relative w-[4.3rem] shrink-0">
            <input type="number" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value === '' ? '' : Number(e.target.value))} onFocus={(e) => e.target.select()} aria-label="Minutes" style={{ background: INK_3, color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="w-full rounded-md pl-1.5 pr-7 py-2.5 text-base outline-none text-center" />
            <span style={{ color: TEXT_SOFT }} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none">min</span>
          </label>
          <button onMouseDown={(e) => e.preventDefault()} onClick={log} style={{ background: AMBER, color: ON_AMBER }} className="flex-1 rounded-md py-2.5 text-base font-medium flex items-center justify-center gap-1"><Plus size={16} /> Log</button>
        </div>
      </div>
    </SwipeActions>
  );
}

function SupersetCard({ index, members, style, bodyweight, sets, lastPerformance, onLogSet, onDeleteSet, onOpenSwap, onRemove, onSplit, isDone, onDone, onUndo, isActive, onActivate, onCollapse }) {
  if (isActive === false) {
    const logged = members.reduce((n, ex) => n + sets.filter((s) => s.exerciseName === ex.name).length, 0);
    return (
      <button
        onClick={onActivate}
        style={{ background: isDone ? DONE_BG : INK_2, borderLeft: `3px solid ${LIME}` }}
        className="w-full rounded-md px-4 py-3 flex items-center justify-between text-left"
      >
        <span style={{ color: PAPER }} className="text-base font-bold flex items-center gap-2 min-w-0">
          <span style={{ color: TEXT_SOFT }} className="font-medium">{index}.</span>
          <Link2 size={12} color={LIME} className="shrink-0" />
          <span className="line-clamp-2 leading-tight">{members.map((m) => m.name).join(" + ")}{isDone && ' ✅'}</span>
        </span>
        <span style={{ color: TEXT_SOFT }} className="text-sm shrink-0 ml-2">{logged > 0 ? `${logged} logged` : 'superset'}</span>
      </button>
    );
  }
  return (
    <div style={{ background: isDone ? DONE_BG : INK_2, borderLeft: `3px solid ${LIME}` }} className="rounded-md px-4 py-3">
      <div onClick={onCollapse} className={`flex items-center justify-center gap-1.5 mb-3 ${onCollapse ? 'cursor-pointer' : ''}`}>
        {index != null && <span style={{ color: TEXT_SOFT }} className="text-sm font-medium">{index}.</span>}
        <Link2 size={12} color={LIME} />
        <span style={{ color: LIME }} className="text-sm uppercase tracking-wide">Superset</span>
        {onCollapse && (
          <button onClick={onCollapse} style={{ color: TEXT_SOFT }} className="p-1 ml-1" title="Collapse">
            <ChevronUp size={14} />
          </button>
        )}
      </div>
      <div className="space-y-3">
        {members.map((ex) => {
          const loggedSets = sets.filter((s) => s.exerciseName === ex.name);
          if (ex.type === 'aerobic') {
            return (
              <SupersetCardio
                key={ex.index}
                exercise={ex}
                loggedSets={loggedSets}
                onLogSet={(payload) => onLogSet({ ...payload, exerciseName: ex.name, muscleGroup: 'Cardio' })}
                onDeleteSet={onDeleteSet}
                onOpenSwap={() => onOpenSwap(ex.index)}
                onRemove={() => onRemove(ex.index, loggedSets.length > 0)}
                onSplit={onSplit}
                onUndo={onUndo}
              />
            );
          }
          return (
            <SupersetMember
              key={ex.index}
              exercise={ex}
              style={style}
              bodyweight={bodyweight}
              loggedSets={loggedSets}
              last={lastPerformance(ex.name)}
              lastFor={(v) => lastPerformance(ex.name, v)}
              onLogSet={(payload) => onLogSet({ ...payload, exerciseName: ex.name, muscleGroup: ex.muscleGroup })}
              onDeleteSet={onDeleteSet}
              onOpenSwap={() => onOpenSwap(ex.index)}
              onRemove={() => onRemove(ex.index, loggedSets.length > 0)}
              onSplit={onSplit}
              onUndo={onUndo}
              nextSetNumber={loggedSets.length + 1}
            />
          );
        })}
      </div>
      {onDone && (
        <button
          onClick={() => { onDone(); onCollapse && onCollapse(); }}
          style={{ background: INK_3, color: PAPER }}
          className="w-full mt-3 rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-1.5"
        >
          <Check size={14} /> {isDone ? 'Done' : 'Finish superset'}
        </button>
      )}
    </div>
  );
}

// Purely informational — a few drills to run through before the first
// working set, no sets/reps/logging. Just a checklist and a way to
// dismiss it once it's done (or if it's not wanted).
function WarmupInfoModal({ onClose }) {
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" />
        <div style={{ background: INK_2 }} className="relative w-full max-w-sm rounded-xl p-5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <div style={{ color: VIOLET }} className="text-sm font-medium uppercase tracking-wide">Why warm up?</div>
            <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-1 -m-1">
              <X size={18} />
            </button>
          </div>
          <div style={{ color: PAPER }} className="text-sm leading-relaxed">
            Easy moves that prep the muscles you're about to train.
          </div>
        </div>
      </div>
    </Portal>
  );
}

// Each drill gets the same swipe-to-edit/delete pattern as a regular
// exercise (edit here just means retyping the name) plus the same
// touch-drag reordering as the main exercise list — its own small-scale
// copy of that gesture, scoped to this card's drill rows.
function WarmupCard({ index, exercise, loggedSets = [], onLogSet, onDeleteSet, onRemove, onAddDrill, onRenameDrill, onRemoveDrill, onReorderDrill, isActive, onActivate, onCollapse, onMoveUp, onMoveDown }) {
  const isDone = loggedSets.length > 0; // the set is logged only once every drill is checked
  // Finishing every drill logs the warm-up as a flexibility set, so it
  // counts toward the weekly flexibility goal; unchecking one takes it back.
  const completedSet = loggedSets.find((s) => s.movementType === 'flexibility');
  const [checked, setChecked] = useState(() => new Set(completedSet ? exercise.drills : []));
  const [showInfo, setShowInfo] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [addingOther, setAddingOther] = useState(false);
  const [otherValue, setOtherValue] = useState('');

  const rowRefs = useRef([]);
  const dragStateRef = useRef(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  // Every hook above must run on every render regardless of isActive —
  // this early return has to come after all of them (React error #300:
  // conditionally skipping hook declarations desyncs hook count between
  // renders and crashes the whole page, not just this card).
  if (isActive === false) {
    const doneCount = exercise.drills.filter((d) => checked.has(d)).length;
    return (
      <SwipeActions title={exercise.name} onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
        <button
          onClick={onActivate}
          style={{ background: isDone ? DONE_BG : INK_2, borderLeft: `3px solid ${isDone ? LIME : VIOLET}` }}
          className="w-full rounded-md pl-4 pr-11 py-3 flex items-center justify-between text-left"
        >
          <span style={{ color: PAPER }} className="text-base font-bold flex items-center gap-2">
            <span style={{ color: TEXT_SOFT }} className="font-medium">{index}.</span> {exercise.name}{isDone && ' ✅'}
          </span>
          <span style={{ color: TEXT_SOFT }} className="text-sm shrink-0 ml-2">
            {doneCount > 0 ? `${doneCount}/${exercise.drills.length} done` : `${exercise.drills.length} drills`}
          </span>
        </button>
      </SwipeActions>
    );
  }

  function toggle(name) {
    const next = new Set(checked);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setChecked(next);
    const allDone = exercise.drills.length > 0 && exercise.drills.every((d) => next.has(d));
    if (allDone && !completedSet && onLogSet) {
      onLogSet({
        exerciseName: exercise.name,
        muscleGroup: 'Warm-up',
        setNumber: 1,
        movementType: 'flexibility',
        weight: null,
        reps: exercise.drills.length,
        durationSeconds: null,
      });
    } else if (!allDone && completedSet && onDeleteSet) {
      onDeleteSet(completedSet.id);
    }
  }

  function startEdit(i) {
    setEditingIndex(i);
    setEditValue(exercise.drills[i]);
  }
  function saveEdit() {
    if (editingIndex == null) return;
    onRenameDrill(editingIndex, editValue);
    setEditingIndex(null);
  }

  function handleDragStart(e, i) {
    const t = e.touches[0];
    const state = { fromIndex: i, startY: t.clientY, touchId: t.identifier };
    dragStateRef.current = state;
    setDraggingIndex(i);
    setDragOffsetY(0);

    function findTouch(list) {
      return [...list].find((x) => x.identifier === state.touchId) || list[0];
    }
    function onMove(ev) {
      if (dragStateRef.current !== state) return;
      if (ev.touches.length === 0) return;
      ev.preventDefault();
      const touch = findTouch(ev.touches);
      setDragOffsetY(touch.clientY - state.startY);
    }
    function onEnd(ev) {
      if (dragStateRef.current === state) {
        const touch = ev.changedTouches.length ? findTouch(ev.changedTouches) : null;
        if (touch) {
          const y = touch.clientY;
          let closestIndex = state.fromIndex;
          let closestDist = Infinity;
          rowRefs.current.forEach((el, idx) => {
            if (!el || idx === state.fromIndex) return;
            const rect = el.getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            const dist = Math.abs(y - mid);
            if (dist < closestDist) { closestDist = dist; closestIndex = idx; }
          });
          if (closestIndex !== state.fromIndex) onReorderDrill(state.fromIndex, closestIndex);
        }
        dragStateRef.current = null;
        setDraggingIndex(null);
        setDragOffsetY(0);
      }
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    }
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: false });
    window.addEventListener('touchcancel', onEnd, { passive: false });
  }

  return (
    <div style={{ background: isDone ? DONE_BG : INK_2, borderLeft: `3px solid ${isDone ? LIME : VIOLET}` }} className="rounded-md px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div onClick={onCollapse} style={{ color: PAPER }} className="flex-1 min-w-0 cursor-pointer text-base font-bold flex items-center gap-1.5">
          <span style={{ color: TEXT_SOFT }} className="font-medium">{index}.</span> {exercise.name}
          <button onClick={(e) => { e.stopPropagation(); setShowInfo(true); }} style={{ color: VIOLET }} className="p-1 -m-1" title="Why warm up?">
            <Info size={14} />
          </button>
        </div>
        <div className="flex items-center gap-0.5">
          {onCollapse && (
            <button onClick={onCollapse} style={{ color: TEXT_SOFT }} className="p-2 -m-1" title="Collapse">
              <ChevronUp size={14} />
            </button>
          )}
          <button onClick={onRemove} style={{ color: TEXT_SOFT }} className="p-2 -m-1">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        {exercise.drills.map((name, i) => {
          const done = checked.has(name);
          const isDragging = draggingIndex === i;
          if (editingIndex === i) {
            return (
              <div key={i} className="flex items-stretch gap-1">
                {/* Matches the drag-handle column every other row has
                    (now on the left), so the card's overall width/
                    alignment doesn't visibly shift while renaming. */}
                <div className="shrink-0 w-5" />
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(titleCaseLive(e.target.value))}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingIndex(null); }}
                    style={{ background: INK_3, color: PAPER }}
                    className="flex-1 min-w-0 rounded-md px-3 py-2 text-sm outline-none"
                  />
                  <button onClick={saveEdit} style={{ background: VIOLET, color: INK }} className="shrink-0 rounded-md p-2" title="Save">
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditingIndex(null)} style={{ color: TEXT_SOFT }} className="shrink-0 rounded-md p-2" title="Cancel">
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          }
          return (
            <div
              key={i}
              ref={(el) => (rowRefs.current[i] = el)}
              style={{
                opacity: isDragging ? 0.9 : 1,
                transform: isDragging ? `translateY(${dragOffsetY}px)` : 'none',
                position: isDragging ? 'relative' : 'static',
                zIndex: isDragging ? 20 : 'auto',
                transition: isDragging ? 'none' : 'transform 0.15s ease',
              }}
              className="flex items-stretch gap-1"
            >
              <button
                data-no-swipe
                onTouchStart={(e) => handleDragStart(e, i)}
                style={{
                  color: TEXT_SOFT,
                  touchAction: 'none',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
                className="shrink-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing"
                title="Drag to reorder"
              >
                <GripVertical size={12} />
              </button>
              <div className="flex-1 min-w-0">
                <SwipeActions title={name} editLabel="Rename" onEdit={() => startEdit(i)} onRemove={() => onRemoveDrill(i)}>
                  <button
                    onClick={() => toggle(name)}
                    style={{ background: INK_3, color: done ? TEXT_SOFT : PAPER }}
                    className="w-full rounded-md pl-3 pr-10 py-2 text-sm flex items-center gap-2 text-left"
                  >
                    <span
                      style={{ borderColor: done ? VIOLET : TEXT_SOFT, background: done ? VIOLET : 'transparent' }}
                      className="shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                    >
                      {done && <Check size={10} color={INK} />}
                    </span>
                    <span style={{ textDecoration: done ? 'line-through' : 'none' }}>{name}</span>
                  </button>
                </SwipeActions>
              </div>
            </div>
          );
        })}
      </div>
      {addingOther ? (
        <div className="flex items-center gap-1.5 mt-1.5">
          <input
            autoFocus
            value={otherValue}
            onChange={(e) => setOtherValue(titleCaseLive(e.target.value))}
            onKeyDown={(e) => { if (e.key === 'Enter') { onAddDrill(otherValue); setOtherValue(''); setAddingOther(false); } }}
            placeholder="Movement name"
            style={{ background: INK_3, color: PAPER }}
            className="flex-1 rounded-md px-3 py-2 text-sm outline-none"
          />
          <button
            onClick={() => { onAddDrill(otherValue); setOtherValue(''); setAddingOther(false); }}
            style={{ background: VIOLET, color: INK }}
            className="rounded-md px-3 py-2 text-sm font-medium"
          >
            Add
          </button>
          <button onClick={() => { setAddingOther(false); setOtherValue(''); }} style={{ color: TEXT_SOFT }} className="text-sm px-2">
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAddingOther(true)}
          style={{ color: VIOLET }}
          className="w-full text-sm py-2 mt-1 flex items-center justify-center gap-1"
        >
          <Plus size={12} /> Other
        </button>
      )}
      {showInfo && <WarmupInfoModal onClose={() => setShowInfo(false)} />}
    </div>
  );
}

function AerobicCard({ index, exercise, movementType = 'aerobic', loggedSets, onLogSet, onDeleteSet, onOpenSwap, onRemove, onChooseActivity, hrZones, isActive, onActivate, onCollapse, onQuickAdd, isDone, onDone, onUndo, onMoveUp, onMoveDown }) {
  const [light, setLight] = useState('');
  const [moderate, setModerate] = useState('');
  const [vigorous, setVigorous] = useState('');
  const [distance, setDistance] = useState('');
  // Stretching and the like is just "how long": no intensity split. (Yoga keeps it, since yoga also counts toward aerobic.)
  const simpleFlex = movementType === 'flexibility' && !/yoga/i.test(exercise.name);
  const [flexMinutes, setFlexMinutes] = useState('');
  // A standalone "+ Add Aerobic Activity" row right next to an aerobic
  // card is redundant real estate — this card can just offer its own
  // compact "+" to log another cardio burst right after it.
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const { armed, press } = useArmed();

  if (isActive === false) {
    return (
      <>
        <SwipeActions title={exercise.name} menuClass={onQuickAdd ? 'right-12' : 'right-1'} onSwap={onOpenSwap} onRemove={onRemove} onUndo={onUndo} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
        <div style={{ background: isDone ? DONE_BG : INK_2, borderLeft: `3px solid ${isDone ? LIME : movementType === 'flexibility' ? BRICK : AMBER}` }} className="rounded-md flex items-stretch overflow-hidden">
          <button
            onClick={onActivate}
            className={`flex-1 min-w-0 pl-4 ${onQuickAdd ? 'pr-11' : 'pr-11'} py-3 flex items-center justify-between text-left`}
          >
            <span style={{ color: PAPER }} className="text-base font-bold flex items-center gap-2">
              <span style={{ color: TEXT_SOFT }} className="font-medium">{index}.</span> {exercise.name}{isDone && ' ✅'}
            </span>
            <span style={{ color: TEXT_SOFT }} className="text-sm shrink-0 ml-2">
              {loggedSets.length > 0 ? `${loggedSets.length} logged` : ''}
            </span>
          </button>
          {onQuickAdd && (
            <button
              onClick={() => setShowQuickAdd((v) => !v)}
              style={{ color: AMBER, borderLeft: `1px dashed ${INK_3}` }}
              className="shrink-0 w-11 flex items-center justify-center"
              title="Add another aerobic activity"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
        </SwipeActions>
        {showQuickAdd && (
          <div className="mt-3">
            <QuickAerobicForm
              onCancel={() => setShowQuickAdd(false)}
              onSubmit={(name, intensity, minutes) => { onQuickAdd(name, intensity, minutes); setShowQuickAdd(false); }}
            />
          </div>
        )}
      </>
    );
  }

  const canLog = simpleFlex ? (parseInt(flexMinutes, 10) || 0) > 0 : (parseInt(light, 10) || 0) + (parseInt(moderate, 10) || 0) + (parseInt(vigorous, 10) || 0) > 0 || distance.trim() !== '';

  function handleLog() {
    const l = simpleFlex ? (parseInt(flexMinutes, 10) || 0) : (parseInt(light, 10) || 0);
    const m = simpleFlex ? 0 : (parseInt(moderate, 10) || 0);
    const v = simpleFlex ? 0 : (parseInt(vigorous, 10) || 0);
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
    setFlexMinutes('');
  }

  return (
    <SwipeActions title={exercise.name} menuSide="left" onSwap={onOpenSwap} onRemove={onRemove} onUndo={onUndo} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
    <div style={{ background: isDone ? DONE_BG : INK_2, borderLeft: `3px solid ${isDone ? LIME : movementType === 'flexibility' ? BRICK : AMBER}` }} className="rounded-md px-4 py-3 groove-ease-in">
      <div className="flex items-center justify-between mb-1">
        <span className="w-6 shrink-0" aria-hidden="true" />
        <span onClick={onCollapse} style={{ color: PAPER }} className="flex-1 min-w-0 cursor-pointer text-base font-bold flex items-center justify-center gap-2 text-center">
          {index != null && <span style={{ color: TEXT_SOFT }} className="font-medium">{index}.</span>} {exercise.name}{isDone && ' ✅'}
        </span>
        <button onClick={onCollapse} style={{ color: TEXT_SOFT }} className="p-2 -m-1 shrink-0" title="Collapse">
          <ChevronUp size={16} />
        </button>
      </div>
      {exercise.targetNote && (
        <div style={{ color: TEXT_SOFT }} className="text-sm mb-2 text-center">Target: {exercise.targetNote}</div>
      )}

      {onChooseActivity && loggedSets.length === 0 && (
        <div className="mb-3">
          <div style={{ color: TEXT_SOFT }} className="text-sm mb-1.5 text-center">What are you doing?</div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {AEROBIC_ACTIVITIES_QUICK.slice(0, 6).map((a) => (
              <button
                key={a}
                onClick={() => onChooseActivity(a)}
                style={{ background: INK_3, color: PAPER }}
                className="px-3 py-1.5 rounded-full text-sm"
              >
                {a}
              </button>
            ))}
            {onOpenSwap && (
              <button onClick={onOpenSwap} style={{ background: INK_3, color: AMBER }} className="px-3 py-1.5 rounded-full text-sm">
                More…
              </button>
            )}
          </div>
        </div>
      )}

      {loggedSets.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 mb-2">
          {loggedSets.map((s) => (
            <button
              key={s.id}
              onClick={() => press(s.id, () => onDeleteSet(s.id))}
              style={{ background: armed === s.id ? BRICK : INK_3, color: armed === s.id ? PAPER : PAPER_DIM, fontFamily: 'Outfit, sans-serif' }}
                data-armed={armed === s.id}
              className="rounded-full px-2.5 py-1 text-sm tabular-nums flex items-center gap-1"
            >
              {formatIntensityMinutes(s)}{s.distance ? ` · ${s.distance}` : ''}
            <span style={{ borderLeft: `1px solid ${TEXT_SOFT}`, opacity: 0.9 }} className="pl-1.5 ml-0.5 flex items-center"><X size={12} strokeWidth={3} /></span>
              </button>
          ))}
        </div>
      )}

      {simpleFlex ? (
        <div className="flex justify-center mb-2">
          <input
            type="number"
            inputMode="numeric"
            value={flexMinutes}
            onChange={(e) => setFlexMinutes(e.target.value)}
            placeholder="min"
            aria-label="Minutes"
            style={{ background: INK_3, color: PAPER, fontFamily: 'Outfit, sans-serif' }}
            className="w-20 rounded-md px-2 py-2 text-sm outline-none text-center"
          />
        </div>
      ) : (
        <IntensityMinutesGroup light={light} setLight={setLight} moderate={moderate} setModerate={setModerate} vigorous={vigorous} setVigorous={setVigorous} hrZones={hrZones} />
      )}
      <div className="flex gap-2">
        {movementType !== 'flexibility' && (
          <input
            type="text"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="Distance"
            style={{ background: INK_3, color: PAPER }}
            className="flex-1 min-w-0 rounded-md px-2 py-2 text-sm outline-none text-center"
          />
        )}
        <button
          onClick={handleLog}
          disabled={!canLog}
          style={{ background: canLog ? SKY : INK_3, color: canLog ? INK : TEXT_SOFT }}
          className={`${movementType === 'flexibility' ? 'flex-1' : 'w-24 shrink-0'} rounded-md py-2 text-sm font-medium flex items-center justify-center gap-1`}
        >
          <Plus size={14} /> Log
        </button>
        {loggedSets.length > 0 && onDone && (
          <button
            onClick={() => { onDone(); onCollapse && onCollapse(); }}
            style={{ background: INK_3, color: PAPER }}
            className="shrink-0 rounded-md py-2 px-2.5"
            title="Finish this activity"
          >
            <Check size={14} />
          </button>
        )}
      </div>
    </div>
    </SwipeActions>
  );
}

// How to do an exercise: set up, move, what to watch, plus a few basics for its kind (lift, stretch or roll).
function ExerciseGuideSheet({ name, guide, accent, onClose }) {
  const sheet = useSwipeDown(onClose);
  const row = (label, text) => (
    <div className="mb-3 text-left">
      <div style={{ color: accent }} className="text-[13px] uppercase tracking-wide font-bold mb-0.5">{label}</div>
      <div style={{ color: PAPER }} className="text-sm leading-snug">{text}</div>
    </div>
  );
  return (
    <Portal>
      <div style={{ background: 'rgba(0,0,0,0.6)' }} className="fixed inset-0 flex items-end md:items-center justify-center z-50" onClick={onClose}>
        <div ref={sheet.ref} {...sheet.handlers} style={{ background: INK_2, ...sheet.style }} className="w-full max-w-sm rounded-t-2xl md:rounded-2xl px-5 py-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div style={{ background: TEXT_SOFT, opacity: 0.45 }} className={GRAB_BAR_CLASS} />
          <div style={{ color: PAPER }} className="text-base font-bold text-center mb-3">{name.replace('Foam Roll: ', '')}</div>
          {row('Set up', guide.setup)}
          {row('Move', guide.move)}
          {row('Watch for', guide.watch)}
          <div style={{ borderTop: `1px dashed ${INK_3}` }} className="pt-3 mb-3 text-left">
            <div style={{ color: TEXT_SOFT }} className="text-[13px] uppercase tracking-wide font-bold mb-1">The basics</div>
            {(guide.rules || []).map((t) => <div key={t} style={{ color: PAPER_DIM }} className="text-[13px] leading-snug mb-1">{t}</div>)}
          </div>
          <button onClick={onClose} style={{ background: INK_3, color: PAPER }} className="w-full rounded-md py-3 text-sm font-medium">Got it</button>
        </div>
      </div>
    </Portal>
  );
}

function FlexibilityCard({ index, exercise, loggedSets, onLogSet, onDeleteSet, onOpenSwap, onRemove, isActive = true, onActivate, onCollapse, onDone, onUndo, onMoveUp, onMoveDown }) {
  // Prefill the hold time from the target ("20-30s per side" -> 20), so one tap logs a hold.
  // Some stretches (Cat-Cow) are counted in reps, not held for seconds.
  const isReps = /rep/i.test(String(exercise.reps || ''));
  const targetSeconds = isReps || /\ds/.test(String(exercise.reps || '')) ? String(exercise.reps).match(/\d+/)?.[0] || '' : '';
  const [seconds, setSeconds] = useState(targetSeconds);
  const { armed, press } = useArmed();
  const [guideOpen, setGuideOpen] = useState(false);
  // A simple hold timer: counts down the target seconds and buzzes at zero.
  const [timeLeft, setTimeLeft] = useState(null);
  useEffect(() => {
    if (timeLeft == null) return undefined;
    if (timeLeft <= 0) { try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch { /* not supported */ } setTimeLeft(null); return undefined; }
    const t = setTimeout(() => setTimeLeft((n) => (n == null ? null : n - 1)), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);
  const guide = guideFor(exercise.name);
  const nextSetNumber = loggedSets.length + 1;
  const isBalance = exercise.balance || BALANCE_ACTIVITIES.includes(exercise.name);
  const accent = isBalance ? VIOLET : BRICK;
  const isDone = loggedSets.length >= (exercise.sets || 1);

  function handleLog() {
    const amount = seconds === '' ? null : parseInt(seconds, 10) || null;
    onLogSet({
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      setNumber: nextSetNumber,
      movementType: 'flexibility',
      weight: null,
      reps: isReps ? amount : null,
      durationSeconds: isReps ? null : amount,
    });
    setSeconds(targetSeconds);
  }

  // Collapsed, like the lifts: one slim row.
  if (!isActive) {
    return (
      <SwipeActions title={exercise.name} onSwap={onOpenSwap} onRemove={onRemove} onUndo={onUndo} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
        <button
          onClick={onActivate}
          style={{ background: isDone ? DONE_BG : INK_2, borderLeft: `3px solid ${isDone ? LIME : accent}` }}
          className="w-full rounded-md pl-4 pr-11 py-3 flex items-center justify-between text-left"
        >
          <span className="min-w-0">
            <span style={{ color: PAPER }} className="text-base font-bold flex items-baseline gap-2">
              <span style={{ color: TEXT_SOFT }} className="font-medium">{index}.</span> <span>{exercise.name}{isDone && ' ✅'}</span>
            </span>
            <span style={{ color: TEXT_SOFT }} className="text-sm block pl-6">
              {loggedSets.length > 0 ? `${loggedSets.length} logged` : `${exercise.sets}×${exercise.reps}`}
            </span>
          </span>
        </button>
      </SwipeActions>
    );
  }

  return (
    <SwipeActions title={exercise.name} menuSide="left" onSwap={onOpenSwap} onRemove={onRemove} onUndo={onUndo} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
    <div style={{ background: isDone ? DONE_BG : INK_2, borderLeft: `3px solid ${isDone ? LIME : accent}` }} className="rounded-md px-4 py-2.5 groove-ease-in">
      <div className="flex items-center justify-between mb-1">
        <span className="w-6 shrink-0" aria-hidden="true" />
        <span onClick={onCollapse} style={{ color: PAPER }} className="flex-1 min-w-0 cursor-pointer text-base font-bold flex items-center justify-center gap-2 text-center">
          <span style={{ color: TEXT_SOFT }} className="font-medium">{index}.</span> {exercise.name}{isDone && ' ✅'}
        </span>
        <span className="flex items-center shrink-0">
          {guide && <button onClick={() => setGuideOpen(true)} style={{ color: accent }} className="p-2 -m-1" aria-label={`How to: ${exercise.name}`}><Info size={16} /></button>}
          <button onClick={onCollapse} style={{ color: TEXT_SOFT }} className="p-2 -m-1 ml-1" title="Collapse">
            <ChevronUp size={16} />
          </button>
        </span>
      </div>

      {loggedSets.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 mb-1">
          {loggedSets.map((s) => (
            <button
              key={s.id}
              onClick={() => press(s.id, () => onDeleteSet(s.id))}
              style={{ background: armed === s.id ? BRICK : INK_3, color: armed === s.id ? PAPER : PAPER_DIM, fontFamily: 'Outfit, sans-serif' }}
                data-armed={armed === s.id}
              className="rounded-full px-2.5 py-1 text-sm tabular-nums flex items-center gap-1"
            >
              {s.reps ? `${s.reps} reps` : s.durationSeconds ? `${s.durationSeconds}s` : '—'}
            <span style={{ borderLeft: `1px solid ${TEXT_SOFT}`, opacity: 0.9 }} className="pl-1.5 ml-0.5 flex items-center"><X size={12} strokeWidth={3} /></span>
              </button>
          ))}
        </div>
      )}

      <div style={{ color: TEXT_SOFT }} className="text-sm mb-1.5 text-center">
        Target {exercise.sets}×{exercise.reps} <span style={{ color: accent }}>· {isBalance ? 'Balance' : 'Flexibility'}</span>
      </div>
      <div className="flex items-center justify-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={seconds}
          onChange={(e) => setSeconds(e.target.value)}
          placeholder={isReps ? 'reps' : 'sec'}
          style={{ background: INK_3, color: PAPER, fontFamily: 'Outfit, sans-serif' }}
          className="w-16 rounded-md px-2 py-2 text-sm outline-none text-center"
        />
        {!isReps && Number(seconds) > 0 && (
          <button
            onClick={() => setTimeLeft((n) => (n == null ? Number(seconds) : null))}
            style={{ background: timeLeft != null ? accent : INK_3, color: timeLeft != null ? PAPER : PAPER_DIM }}
            className="shrink-0 rounded-md px-2.5 py-2 text-sm tabular-nums"
            aria-label={timeLeft != null ? 'Stop timer' : 'Start hold timer'}
          >
            {timeLeft != null ? `${timeLeft}s` : 'Timer'}
          </button>
        )}
        <button
          onClick={handleLog}
          style={{ background: accent, color: PAPER }}
          className="flex-1 rounded-md py-2 text-sm font-medium flex items-center justify-center gap-1"
        >
          <Plus size={14} /> Log {isReps ? 'set' : 'hold'} {nextSetNumber}
        </button>
        {loggedSets.length > 0 && (
          <button
            onClick={() => { onDone && onDone(); onCollapse && onCollapse(); }}
            style={{ background: INK_3, color: PAPER }}
            className="rounded-md py-2 px-2.5"
            title="Finish this exercise"
          >
            <Check size={14} />
          </button>
        )}
      </div>
      {guideOpen && guide && <ExerciseGuideSheet name={exercise.name} guide={guide} accent={accent} onClose={() => setGuideOpen(false)} />}
    </div>
    </SwipeActions>
  );
}
