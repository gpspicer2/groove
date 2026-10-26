import { estimateKcal } from '../../lib/calories';
import { useSwipeDown, GRAB_BAR_CLASS } from '../../lib/swipeDown';
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Dumbbell, Activity, Trees, PersonStanding, Footprints, Timer, Plus, Minus, X, Info, Check } from '../../lib/icons';
import { supabase } from '../../lib/supabaseClient';
import Portal from '../../Portal';
import { useAuth } from '../../auth/AuthContext';
import { INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY, MOSS, BRICK, INK, AMBER, PLUM, VIOLET } from '../../theme';
import FitnessAssessmentFlow from '../baseline/FitnessAssessmentFlow';
import BaselineFlow from '../baseline/BaselineFlow';
import { startOfWeek, weekDayLabels } from '../../lib/week';
import { predictedMaxHR, computeHrZones } from '../../lib/heartRate';
import MetBrowser from '../../MetBrowser';
import { useRevealOnOpen } from '../../lib/reveal';
import ScreeningStatus from '../screening/ScreeningStatus';
import CoachMessages from '../message/CoachMessages';
import { PlanFormPopup, PlannedWorkoutPopup, QuickLogSheet } from '../plan/PlanPopups';
import { planKinds, planMinutes, planSummary, hasDetails } from '../plan/plan';
import { needsClearance } from '../screening/screening';
import { buildRecap, dayKey } from './weekly';
import { CLIENT_NUDGE_DAYS, calendarDaysBetween } from '../../lib/activityGap';
import { RecapCard, TodayPlanCard } from './WeekCards';
import Progress from './Progress';
import FirstTimeHint from '../onboarding/FirstTimeHint';
import { distinctDays } from '../../lib/days';
import GoalCelebration from './GoalCelebration';
import { useProgram } from '../program/useProgram';
import { programPlans, normalizeMoves } from '../program/programs';
import ProgramSheet from '../program/ProgramSheet';
import { ProgramWeekCard, MoveProgramLink, useProgramWeek } from '../program/ProgramCards';
import MuscleBalance from './MuscleBalance';
import TailoredTips from '../screening/TailoredTips';
import { BALANCE_ACTIVITIES } from '../move/exerciseLibrary';
import GoalInfo from './GoalInfo';
import { NATURE_GOAL_MINUTES, natureBaseFromSets, natureMinutes } from './nature';

const DEFAULT_ORDER = ['Aerobic', 'Resistance', 'Flexibility', 'Balance', 'Nature'];
const natureKey = (id) => `groove:nature:${id}`;
function readNature(id) {
  try { return JSON.parse(localStorage.getItem(natureKey(id)) || 'null') || {}; } catch { return {}; }
}

function daysBetween(a, b) {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function sameDay(a, b) {
  return a.toDateString() === b.toDateString();
}

function dateInputValue(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function BirdseyeTab({ userId, onOpenWorkout, onLogWorkout, onPlanWorkout, onStartPlan, onStartProgramSession, onOpenGroove, onOpenScientificSupport, active, openBaselineOnLoad, onBaselineAutoOpened }) {
  const { profile, updateProfile } = useAuth();
  const weekStartDay = profile?.week_start_day || 'sunday';
  const { program, save: saveProgram } = useProgram(userId);
  const [showProgramSheet, setShowProgramSheet] = useState(false);
  const [workouts, setWorkouts] = useState([]);
  const [programSheetStep, setProgramSheetStep] = useState(null);
  const programWeek = useProgramWeek(userId, program, active, workouts.length, weekStartDay);
  const [workoutTypes, setWorkoutTypes] = useState({}); // workoutId -> Set('resistance'|'aerobic')
  const [assessmentDone, setAssessmentDone] = useState(true);
  const [intakeDone, setIntakeDone] = useState(true);
  const [showBaseline, setShowBaseline] = useState(false);

  // The tour's exit prompt can send someone straight here instead of
  // making them find and tap the "let's get to know you" banner.
  useEffect(() => {
    if (openBaselineOnLoad) {
      setShowBaseline(true);
      onBaselineAutoOpened && onBaselineAutoOpened();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openBaselineOnLoad]);
  const [age, setAge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAssessment, setShowAssessment] = useState(false);
  const [prescribedZone, setPrescribedZone] = useState(null);
  const [restingHrNum, setRestingHrNum] = useState(null);
  const [maxHrNum, setMaxHrNum] = useState(null);
  const [maxHrIsPredicted, setMaxHrIsPredicted] = useState(false);
  const [resistanceGoal, setResistanceGoal] = useState(2);
  const [aerobicGoal, setAerobicGoal] = useState(3);
  const [aerobicGoalMinutes, setAerobicGoalMinutes] = useState(150);
  const [flexibilityGoal, setFlexibilityGoal] = useState(2);
  const [aerobicMinutesByWorkout, setAerobicMinutesByWorkout] = useState({});
  const [trackFlexibilityGoal, setTrackFlexibilityGoal] = useState(true);
  const [trackAerobicGoal, setTrackAerobicGoal] = useState(true);
  const [trackResistanceGoal, setTrackResistanceGoal] = useState(true);
  const [editingGoals, setEditingGoals] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [kcalByWorkout, setKcalByWorkout] = useState({});
  const [plans, setPlans] = useState([]); // planned workouts from the last 14 days on
  const [quickLogPlan, setQuickLogPlan] = useState(null);
  const [quickLogSaving, setQuickLogSaving] = useState(false);
  const [liftSetRows, setLiftSetRows] = useState([]);
  const [trackBalanceGoal, setTrackBalanceGoal] = useState(false);
  const [balanceGoal, setBalanceGoal] = useState(2);
  const [balanceWorkoutIds, setBalanceWorkoutIds] = useState(new Set());
  const [trackNature, setTrackNature] = useState(() => readNature(userId).track !== false);
  const [natureGoal, setNatureGoal] = useState(() => readNature(userId).minutes || NATURE_GOAL_MINUTES);
  const [natureBase, setNatureBase] = useState({});
  const [goalInfo, setGoalInfo] = useState(null); // the goal whose (i) was tapped
  const [goalOrder, setGoalOrder] = useState(() => { try { return JSON.parse(localStorage.getItem(`groove:goalOrder:${userId}`) || 'null') || []; } catch { return []; } });
  const orderedModes = [...goalOrder.filter((m) => DEFAULT_ORDER.includes(m)), ...DEFAULT_ORDER.filter((m) => !goalOrder.includes(m))];
  function moveGoal(mode, dir) {
    const list = [...orderedModes];
    const i = list.indexOf(mode); const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setGoalOrder(list);
    try { localStorage.setItem(`groove:goalOrder:${userId}`, JSON.stringify(list)); } catch { /* storage blocked */ }
  }

  // Strava brought in new workouts: reload.
  useEffect(() => {
    const f = () => loadAll();
    window.addEventListener('groove:workoutsChanged', f);
    return () => window.removeEventListener('groove:workoutsChanged', f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function loadAll() {
    const [workoutsRes, baselineRes, profileRes, setsRes] = await Promise.all([
      supabase.from('workouts').select('id, started_at, completed_at, muscle_groups, activities, movement_mode, location, external_id').eq('user_id', userId).is('deleted_at', null).order('started_at', { ascending: false }),
      supabase.from('baseline_responses').select('fitness_assessment, form_answers, submitted_at').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('age, resting_hr_bpm, max_hr_bpm, prescribed_hr_zone, resistance_goal, aerobic_goal, aerobic_goal_minutes, flexibility_goal, track_flexibility_goal, track_aerobic_goal, track_resistance_goal, bodyweight_lb').eq('id', userId).maybeSingle(),
      supabase.from('workout_sets').select('workout_id, exercise_name, muscle_group, distance, movement_type, light_minutes, moderate_minutes, vigorous_minutes, duration_seconds').eq('user_id', userId),
    ]);
    // Plans load on their own so a hiccup there never blocks the rest of Birdseye.
    const planRes = await supabase.from('planned_workouts').select('*').eq('user_id', userId).gte('planned_for', dateInputValue(new Date(Date.now() - 14 * 864e5))).order('planned_for', { ascending: true });
    setPlans(planRes.error ? [] : (planRes.data || []));
    // Balance goal columns load separately so Birdseye still works before they exist.
    const balRes = await supabase.from('profiles').select('balance_goal, track_balance_goal').eq('id', userId).maybeSingle();
    if (!balRes.error && balRes.data) {
      setTrackBalanceGoal(balRes.data.track_balance_goal === true);
      setBalanceGoal(balRes.data.balance_goal || 2);
    }
    // Nature goal columns also load on their own (a copy lives on this device until the SQL is run).
    const natRes = await supabase.from('profiles').select('track_nature_goal, nature_goal_minutes').eq('id', userId).maybeSingle();
    if (!natRes.error && natRes.data) {
      if (natRes.data.track_nature_goal != null) setTrackNature(natRes.data.track_nature_goal !== false);
      if (natRes.data.nature_goal_minutes) setNatureGoal(natRes.data.nature_goal_minutes);
    }
    const firstError = workoutsRes.error || baselineRes.error || profileRes.error || setsRes.error;
    setLoadError(firstError ? `Couldn't load your data: ${firstError.message}` : '');
    const w = workoutsRes.data;
    const baseline = baselineRes.data;
    const profileRow = profileRes.data;
    const setRows = setsRes.data;
    // A workout counts once it's either explicitly finished, or has at
    // least one logged set — someone who logged real sets but never
    // tapped "Finish Movement" (closed the app mid-session, etc.)
    // shouldn't have that day disappear from the calendar.
    const loggedWorkoutIds = new Set((setRows || []).map((s) => s.workout_id));
    setWorkouts((w || []).filter((row) => row.completed_at || loggedWorkoutIds.has(row.id)));
    setAssessmentDone(Boolean(baseline?.fitness_assessment && Object.keys(baseline.fitness_assessment).length > 0));
    setIntakeDone(Boolean(baseline?.submitted_at));
    const resolvedAge = profileRow?.age != null ? Number(profileRow.age) : (baseline?.form_answers?.age ? Number(baseline.form_answers.age) : null);
    setAge(resolvedAge);
    setPrescribedZone(profileRow?.prescribed_hr_zone || null);
    const resting = profileRow?.resting_hr_bpm != null ? Number(profileRow.resting_hr_bpm) : null;
    const maxMeasured = profileRow?.max_hr_bpm != null ? Number(profileRow.max_hr_bpm) : null;
    const maxResolved = maxMeasured != null ? maxMeasured : predictedMaxHR(resolvedAge);
    setRestingHrNum(resting);
    setMaxHrNum(maxResolved || null);
    setMaxHrIsPredicted(maxMeasured == null && maxResolved != null);
    setResistanceGoal(profileRow?.resistance_goal || 2);
    setAerobicGoal(profileRow?.aerobic_goal || 3);
    setAerobicGoalMinutes(profileRow?.aerobic_goal_minutes || 150);
    setFlexibilityGoal(profileRow?.flexibility_goal || 2);
    setTrackFlexibilityGoal(profileRow?.track_flexibility_goal !== false);
    setTrackAerobicGoal(profileRow?.track_aerobic_goal !== false);
    setTrackResistanceGoal(profileRow?.track_resistance_goal !== false);

    const types = {};
    const aerobicMinutes = {};
    (setRows || []).forEach((s) => {
      if (!types[s.workout_id]) types[s.workout_id] = new Set();
      types[s.workout_id].add(s.movement_type || 'resistance');
      // Yoga is two birds with one stone: it counts as flexibility work and
      // as aerobic activity, whichever list it was logged from.
      const isYoga = /^yoga$/i.test(String(s.exercise_name || '').trim());
      if (isYoga) { types[s.workout_id].add('aerobic'); types[s.workout_id].add('flexibility'); }
      if (s.movement_type === 'aerobic' || isYoga) {
        const bucket = aerobicMinutes[s.workout_id] || { light: 0, moderate: 0, vigorous: 0 };
        bucket.light += Number(s.light_minutes) || 0;
        bucket.moderate += Number(s.moderate_minutes) || 0;
        bucket.vigorous += Number(s.vigorous_minutes) || 0;
        aerobicMinutes[s.workout_id] = bucket;
      }
    });
    const bw = profileRow?.bodyweight_lb != null ? Number(profileRow.bodyweight_lb) : null;
    const byWorkout = {};
    (setRows || []).forEach((r) => { (byWorkout[r.workout_id] ||= []).push(r); });
    const kcalMap = {};
    Object.keys(byWorkout).forEach((id) => { kcalMap[id] = estimateKcal(byWorkout[id], bw); });
    setKcalByWorkout(kcalMap);
    setNatureBase(natureBaseFromSets(setRows));
    setWorkoutTypes(types);
    setAerobicMinutesByWorkout(aerobicMinutes);
    setLiftSetRows((setRows || []).filter((s) => (s.movement_type || 'resistance') === 'resistance' && s.muscle_group && s.muscle_group !== 'Warm-up'));
    setBalanceWorkoutIds(new Set((setRows || []).filter((s) => BALANCE_ACTIVITIES.includes(s.exercise_name)).map((s) => s.workout_id)));
  }

  useEffect(() => {
    (async () => {
      await loadAll();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // All four tabs stay mounted the whole session (SwipeTabs slides
  // between them rather than mounting/unmounting), so Birdseye's initial
  // load can go stale — a workout logged in Move, or HR data saved from
  // Account, wouldn't show up here until a full page refresh. Refetch
  // every time this tab becomes the active one.
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) loadAll();
    wasActive.current = active;
  }, [active]);

  // A workout's stored movement_mode reflects what it was when it was
  // started — but movement can be added afterward (aerobic work mixed
  // into a resistance session, say), so also fall back to what was
  // actually logged rather than trusting movement_mode alone.
  function hasResistance(w) {
    const byMode = w.movement_mode === 'Resistance' || w.movement_mode === 'Combined';
    // A flexibility workout also stores the muscle groups it stretches, which doesn't make it lifting.
    return byMode || (w.movement_mode !== 'Flexibility' && (w.muscle_groups || []).length > 0) || workoutTypes[w.id]?.has('resistance');
  }
  function hasAerobic(w) {
    const byMode = w.movement_mode === 'Aerobic' || w.movement_mode === 'Combined';
    // Flexibility workouts keep their stretch/yoga names in `activities` too, so those don't imply aerobic.
    return byMode || (w.movement_mode !== 'Flexibility' && (w.activities || []).length > 0) || workoutTypes[w.id]?.has('aerobic');
  }
  function hasBalance(w) {
    return balanceWorkoutIds.has(w.id) || (w.activities || []).some((a) => BALANCE_ACTIVITIES.includes(a));
  }
  function hasFlexibility(w) {
    const byMode = w.movement_mode === 'Flexibility';
    return byMode || workoutTypes[w.id]?.has('flexibility');
  }

  async function saveGoal(field, value) {
    const clamped = Math.min(14, Math.max(1, value));
    if (field === 'balance_goal') setBalanceGoal(clamped);
    else if (field === 'resistance_goal') setResistanceGoal(clamped);
    else if (field === 'aerobic_goal') setAerobicGoal(clamped);
    else setFlexibilityGoal(clamped);
    await supabase.from('profiles').update({ [field]: clamped }).eq('id', userId);
  }

  async function saveAerobicGoalMinutes(value) {
    const clamped = Math.max(10, Math.min(600, value));
    setAerobicGoalMinutes(clamped);
    await supabase.from('profiles').update({ aerobic_goal_minutes: clamped }).eq('id', userId);
  }

  function saveNature(patch) {
    const cur = { track: trackNature, minutes: natureGoal, ...patch };
    try { localStorage.setItem(natureKey(userId), JSON.stringify(cur)); } catch { /* storage blocked */ }
    if ('track' in patch) setTrackNature(patch.track);
    if ('minutes' in patch) setNatureGoal(patch.minutes);
    supabase.from('profiles').update({ track_nature_goal: cur.track, nature_goal_minutes: cur.minutes }).eq('id', userId).then(() => {}); // quietly ignored until the columns exist
  }
  async function setGoalTracked(mode, next) {
    if (mode === 'Nature') { saveNature({ track: next }); return; }
    const field = mode === 'Aerobic' ? 'track_aerobic_goal' : mode === 'Resistance' ? 'track_resistance_goal' : mode === 'Balance' ? 'track_balance_goal' : 'track_flexibility_goal';
    if (mode === 'Balance') setTrackBalanceGoal(next);
    else if (mode === 'Aerobic') setTrackAerobicGoal(next);
    else if (mode === 'Resistance') setTrackResistanceGoal(next);
    else setTrackFlexibilityGoal(next);
    await supabase.from('profiles').update({ [field]: next }).eq('id', userId);
  }

  async function savePlan({ id, date, title, notes, details }) {
    const fields = { title, notes: notes || null, details: details || null };
    const { error } = id
      ? await supabase.from('planned_workouts').update(fields).eq('id', id)
      : await supabase.from('planned_workouts').insert({ planned_for: date, ...fields });
    if (error) { setLoadError(`Couldn't save your plan: ${error.message}`); return; }
    await loadAll();
  }
  // A missed plan with no details is logged right here (the plan already says
  // what it was); a detailed one goes to Move to fill in the specifics.
  function handleStartPlan(plan, date) {
    if (plan.programSession) { if (onStartProgramSession) onStartProgramSession(plan.programSession); return; }
    const missed = date && date < dayKey(new Date());
    // A simple resistance plan opens Move with the gym, resistance and any
    // planned muscles already chosen, so only the goal is left to pick.
    if (!hasDetails(plan) && planKinds(plan).has('resistance')) {
      const withDetails = { ...plan, details: { ...plan.details, mode: 'Resistance', location: 'At the Gym', groups: plan.details?.groups || [] } };
      if (onStartPlan) onStartPlan(withDetails, date);
    } else if (missed && !hasDetails(plan)) setQuickLogPlan(plan);
    else if (onStartPlan) onStartPlan(plan, date);
  }
  async function logPlanNow(plan, { minutes, intensity }) {
    setQuickLogSaving(true);
    const kinds = planKinds(plan);
    const mode = kinds.has('resistance') ? 'Resistance' : kinds.has('flexibility') ? 'Flexibility' : 'Aerobic';
    const when = new Date(`${plan.planned_for}T12:00:00`).toISOString();
    const { data: workout, error } = await supabase.from('workouts').insert({
      muscle_groups: [], activities: mode === 'Resistance' ? [] : [plan.title], movement_mode: mode,
      started_at: when, completed_at: when, plan: [],
    }).select().single();
    if (error) { setLoadError(`Couldn't log it: ${error.message}`); setQuickLogSaving(false); return; }
    if (mode === 'Aerobic') {
      const { error: setError } = await supabase.from('workout_sets').insert({
        workout_id: workout.id, exercise_name: plan.title, muscle_group: 'Cardio', set_number: 1, movement_type: 'aerobic',
        duration_seconds: minutes * 60,
        light_minutes: intensity === 'Light' ? minutes : null,
        moderate_minutes: intensity === 'Moderate' ? minutes : null,
        vigorous_minutes: intensity === 'Vigorous' ? minutes : null,
      });
      if (setError) setLoadError(`Logged, but couldn't save the minutes: ${setError.message}`);
    }
    await supabase.from('planned_workouts').delete().eq('id', plan.id);
    setQuickLogSaving(false);
    setQuickLogPlan(null);
    await loadAll();
  }
  // Move a planned workout to another day. A program session is moved by
  // remembering the new day in the program; one of your own plans just changes date.
  async function movePlan(plan, dateStr) {
    if (plan.programSession) {
      await saveProgram({ ...program, moves: normalizeMoves(program, weekStartDay, { id: plan.programSession.id, date: dateStr }) });
      return true;
    }
    const { error } = await supabase.from('planned_workouts').update({ planned_for: dateStr }).eq('id', plan.id);
    if (error) { setLoadError(`Couldn't move your plan: ${error.message}`); return false; }
    await loadAll();
    return true;
  }
  async function deletePlan(plan) {
    const { error } = await supabase.from('planned_workouts').delete().eq('id', plan.id);
    if (error) { setLoadError(`Couldn't delete your plan: ${error.message}`); return false; }
    await loadAll();
    return true;
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-32" aria-busy="true" />
    );
  }

  const now = new Date();
  const weekStart = startOfWeek(now, weekStartDay);
  // A workout still being logged (started in the last 12 hours, not finished) shows as
  // flashing tentative progress, and only counts once it's finished.
  const isLive = (w) => !w.completed_at && now.getTime() - new Date(w.started_at).getTime() < 12 * 3600 * 1000;
  const weekAll = workouts.filter((w) => new Date(w.started_at) >= weekStart);
  const liveThisWeek = weekAll.filter(isLive);
  const workoutsThisWeek = weekAll.filter((w) => !isLive(w));
  const thisWeekIds = new Set(workoutsThisWeek.map((w) => w.id));
  const liftsThisWeek = liftSetRows.filter((s) => thisWeekIds.has(s.workout_id));
  const resistanceThisWeek = distinctDays(workoutsThisWeek.filter(hasResistance));
  const aerobicThisWeek = workoutsThisWeek.filter(hasAerobic).length;
  const flexibilityThisWeek = distinctDays(workoutsThisWeek.filter(hasFlexibility));
  const balanceThisWeek = distinctDays(workoutsThisWeek.filter(hasBalance));
  const natureThisWeek = workoutsThisWeek.reduce((sum, w) => sum + natureMinutes(w, natureBase), 0);

  // ACSM phrases the aerobic guideline in moderate-equivalent minutes —
  // vigorous minutes count double — not a session count, so that's the
  // real target. Light activity doesn't count toward the guideline.
  let lightMinutesThisWeek = 0;
  let moderateMinutesThisWeek = 0;
  let vigorousMinutesThisWeek = 0;
  workoutsThisWeek.forEach((w) => {
    const b = aerobicMinutesByWorkout[w.id];
    if (!b) return;
    lightMinutesThisWeek += b.light;
    moderateMinutesThisWeek += b.moderate;
    vigorousMinutesThisWeek += b.vigorous;
  });
  // Planned workouts later this week count tentatively toward the goals
  // (planned aerobic is assumed to be moderate intensity).
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  // Your program's sessions on the days you picked, alongside your own plans.
  const doneProgramIds = new Set((programWeek?.sessions || []).filter((x) => x.done).map((x) => x.id));
  const calendarPlans = [...plans, ...(program ? programPlans(program, weekStartDay, doneProgramIds) : [])];
  let plannedAerobicMinutes = 0;
  let plannedAerobicSessions = 0;
  let plannedResistance = 0;
  let plannedFlexibility = 0;
  calendarPlans.forEach((p) => {
    if (p.planned_for < dayKey(now)) return; // missed plans don't count as upcoming progress
    const day = new Date(`${p.planned_for}T12:00:00`);
    if (day >= weekEnd) return;
    const kinds = planKinds(p);
    if (kinds.has('aerobic')) { plannedAerobicMinutes += planMinutes(p); plannedAerobicSessions += 1; }
    if (kinds.has('resistance')) plannedResistance += 1;
    if (kinds.has('flexibility')) plannedFlexibility += 1;
  });
  liveThisWeek.forEach((w) => {
    if (hasResistance(w)) plannedResistance += 1;
    if (hasFlexibility(w)) plannedFlexibility += 1;
    if (hasAerobic(w)) {
      plannedAerobicSessions += 1;
      const b = aerobicMinutesByWorkout[w.id];
      plannedAerobicMinutes += b ? b.moderate + b.vigorous * 2 : 0;
    }
  });
  const recap = buildRecap({
    workouts, weekStart, aerobicMinutesByWorkout, kcalByWorkout, hasResistance, hasFlexibility,
    goals: {
      trackAerobic: trackAerobicGoal, trackResistance: trackResistanceGoal, trackFlexibility: trackFlexibilityGoal,
      aerobicMinutes: aerobicGoalMinutes, resistance: resistanceGoal, flexibility: flexibilityGoal,
    },
  });
  const todayPlan = plans.find((p) => p.planned_for === dayKey(now));
  // A plan from yesterday that never got logged: offer to log it now.
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const missedPlan = plans.find((p) => p.planned_for === dayKey(yesterday));
  const kcalThisWeek = workoutsThisWeek.reduce((sum, w) => sum + (kcalByWorkout[w.id] || 0), 0);
  const moderateEquivMinutesThisWeek = moderateMinutesThisWeek + vigorousMinutesThisWeek * 2;

  // Streak: consecutive weeks (including this one) hitting every goal being tracked.
  let streak = 0;
  for (let i = 0; ; i++) {
    const ws = new Date(weekStart);
    ws.setDate(weekStart.getDate() - i * 7);
    const we = new Date(ws);
    we.setDate(ws.getDate() + 7);
    const weekWorkouts = workouts.filter((w) => {
      const d = new Date(w.started_at);
      return d >= ws && d < we;
    });
    const rCount = distinctDays(weekWorkouts.filter(hasResistance));
    const aMinutes = weekWorkouts.reduce((sum, w) => {
      const b = aerobicMinutesByWorkout[w.id];
      return sum + (b ? b.moderate + b.vigorous * 2 : 0);
    }, 0);
    const fCount = distinctDays(weekWorkouts.filter(hasFlexibility));
    const bCount = distinctDays(weekWorkouts.filter(hasBalance));
    const metAll = (!trackAerobicGoal || aMinutes >= aerobicGoalMinutes)
      && (!trackResistanceGoal || rCount >= resistanceGoal)
      && (!trackFlexibilityGoal || fCount >= flexibilityGoal)
      && (!trackBalanceGoal || bCount >= balanceGoal);
    if (metAll) streak++;
    else break;
    if (i > 52) break;
  }

  const daysSinceLast = workouts.length > 0 ? calendarDaysBetween(now, new Date(workouts[0].started_at)) : null;
  // No "head over to Move" nudges while a doctor's okay is still recommended.
  // Consecutive training days ending today or yesterday; 6+ earns a rest-day nudge.
  const trainedDays = new Set(workouts.map((w) => dayKey(new Date(w.started_at))));
  let runDays = 0;
  for (let i = trainedDays.has(dayKey(now)) ? 0 : 1; i < 30; i++) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    if (trainedDays.has(dayKey(d))) runDays++; else break;
  }
  const restNudge = runDays >= 6 ? `${runDays} days in a row. A rest day helps your body recover and adapt.` : null;
  const insight = needsClearance(profile?.screening) ? null : restNudge || (todayPlan ? null : buildInsight({ resistanceThisWeek, aerobicMinutesThisWeek: moderateEquivMinutesThisWeek, resistanceGoal, aerobicGoalMinutes, daysSinceLast }));

  const trackedCount = [trackAerobicGoal, trackResistanceGoal, trackFlexibilityGoal, trackBalanceGoal].filter(Boolean).length;
  const trackedGoals = [
    trackAerobicGoal && { mode: 'Aerobic', label: 'Aerobic', icon: Activity, color: MOSS, count: aerobicThisWeek, goal: aerobicGoal, planned: plannedAerobicSessions, field: 'aerobic_goal' },
    trackResistanceGoal && { mode: 'Resistance', label: 'Resistance', icon: Dumbbell, color: SKY, count: resistanceThisWeek, goal: resistanceGoal, planned: plannedResistance, field: 'resistance_goal' },
    trackFlexibilityGoal && { mode: 'Flexibility', label: 'Flexibility', icon: PersonStanding, color: BRICK, count: flexibilityThisWeek, goal: flexibilityGoal, planned: plannedFlexibility, field: 'flexibility_goal' },
    trackBalanceGoal && { mode: 'Balance', label: 'Balance', icon: Footprints, color: VIOLET, count: balanceThisWeek, goal: balanceGoal, planned: 0, field: 'balance_goal' },
    trackNature && { mode: 'Nature', label: 'Nature', icon: Trees, color: LIME, count: natureThisWeek, goal: natureGoal, planned: 0, unit: 'min' },
  ].filter(Boolean).sort((a, b) => orderedModes.indexOf(a.mode) - orderedModes.indexOf(b.mode));

  return (
    <div className="max-w-md mx-auto px-4 pb-12 text-center relative flex flex-col min-h-full">
      {loadError && (
        <div style={{ background: INK_2, color: BRICK }} className="rounded-md px-4 py-3 mb-4 text-sm text-center">
          {loadError}
        </div>
      )}
      <GoalCelebration
        userId={userId}
        weekKey={dayKey(weekStart)}
        active
        latestAt={workoutsThisWeek.reduce((m, w) => { const t = w.completed_at || w.started_at; return !m || t > m ? t : m; }, null)}
        goals={trackedGoals.map((g) => ({
          mode: g.mode, label: g.label,
          met: g.goal > 0 && (g.mode === 'Aerobic' ? moderateEquivMinutesThisWeek >= aerobicGoalMinutes : g.count >= g.goal),
        }))}
      />
      <div className="flex flex-col gap-3">
        <CoachMessages />
        <ScreeningStatus />
        <TailoredTips />
        {/* The setup homework waits until the first workout is logged, so day one is about moving, not forms. */}
        {!intakeDone && workouts.length > 0 && (
          <button
            onClick={() => setShowBaseline(true)}
            style={{ background: INK_2, borderTop: `2px solid ${PLUM}` }}
            className="w-full rounded-lg px-5 py-2.5 text-center"
          >
            <div style={{ color: PAPER }} className="text-sm font-medium">Finish Setting Up Your Account <span style={{ color: PLUM }}>→</span></div>
            <div style={{ color: TEXT_SOFT }} className="text-[13px] leading-snug">About 10 minutes, whenever you're ready</div>
          </button>
        )}

        {todayPlan && <TodayPlanCard plan={todayPlan} onStart={(p) => handleStartPlan(p)} />}
        {missedPlan && !todayPlan && <TodayPlanCard plan={missedPlan} label="Planned for Yesterday" action="Log It" onStart={(p) => handleStartPlan(p, p.planned_for)} />}

        {recap && (
          <RecapCard
            key={recap.key}
            userId={userId}
            active={active}
            recap={recap}
            goals={{ aerobicMinutes: aerobicGoalMinutes }}
            onRaiseGoal={saveAerobicGoalMinutes}
          />
        )}

        <div data-tour="birdseye-goals" style={{ background: INK_2, borderTop: `2px solid ${LIME}` }} className="rounded-lg px-5 py-2.5">
          <div className="flex items-center justify-between mb-0.5">
            <button onClick={() => setEditingGoals(true)} style={{ color: TEXT_SOFT }} className="mx-auto text-base uppercase tracking-wide underline underline-offset-4 decoration-1">Weekly Goals</button>
          </div>

          {trackedGoals.length === 0 && (
            <button onClick={() => setEditingGoals(true)} style={{ color: TEXT_SOFT }} className="text-sm underline py-2">
              No goals on. Tap to choose some.
            </button>
          )}
          {trackedGoals.map((g) => (
            <GoalRow
              key={g.mode} label={g.label} icon={g.icon} color={g.color} count={g.count} goal={g.goal} planned={g.planned} unit={g.unit}
              active={active}
              extra={g.mode === 'Resistance' && liftsThisWeek.length > 0 ? <MuscleBalance bare sets={liftsThisWeek} /> : null}
              onEdit={() => setEditingGoals(true)}
              onInfo={() => setGoalInfo(g.mode)}
              aerobic={g.mode === 'Aerobic' ? {
                goalMinutes: aerobicGoalMinutes,
                moderateEquivMinutes: moderateEquivMinutesThisWeek,
                lightMinutes: lightMinutesThisWeek,
                moderateMinutes: moderateMinutesThisWeek,
                vigorousMinutes: vigorousMinutesThisWeek,
                plannedMinutes: plannedAerobicMinutes,
              } : null}
            />
          ))}

          {(kcalThisWeek > 0 || streak > 0) && (
            <div style={{ color: TEXT_SOFT }} className="text-sm mt-1.5 flex flex-wrap items-center justify-center gap-x-3">
              {kcalThisWeek > 0 && <span>~{kcalThisWeek.toLocaleString()} kcal this week</span>}
              {streak > 0 && <span style={{ color: LIME }}>🔥 {streak} week{streak === 1 ? '' : 's'} hitting {trackedCount > 2 ? 'all' : trackedCount === 2 ? 'both' : 'your'} {trackedCount === 1 ? 'goal' : 'goals'}</span>}
            </div>
          )}
          {/* First-timers (nothing logged yet) get a friendly way into setting their goals. */}
          {workouts.length === 0 && trackedGoals.length > 0 && (
            <FirstTimeHint id="goals" userId={userId} label="Where Did These Come From?" color={LIME} onOpen={() => setGoalInfo('Aerobic')} className="mt-1" />
          )}
          {/* The nudge lives inside this card (not a card of its own) so the calendar stays higher on the screen. */}
          {insight && intakeDone && (
            <div style={{ color: PAPER, borderTop: `1px dashed ${INK_3}` }} className="text-sm text-center mt-2 pt-2">{insight}</div>
          )}
        </div>

        {!program && <MoveProgramLink color={LIME} className="-mb-1" onOpen={() => { setProgramSheetStep(null); setShowProgramSheet(true); }} />}
        {program && (
          <ProgramWeekCard
            program={program} week={programWeek}
            onStart={(sess) => onStartProgramSession && onStartProgramSession(sess)}
            onManage={() => { setProgramSheetStep(null); setShowProgramSheet(true); }}
            onPickDays={() => { setProgramSheetStep('weekdays'); setShowProgramSheet(true); }}
          />
        )}

        <WorkoutCalendar
          userId={userId}
          dataTour="birdseye-calendar"
          workouts={workouts}
          hasResistance={hasResistance}
          hasAerobic={hasAerobic}
          hasFlexibility={hasFlexibility}
          onOpenWorkout={onOpenWorkout}
          onLogOnDate={(day) => onLogWorkout && onLogWorkout(dateInputValue(day))}
          plans={calendarPlans}
          onSavePlan={savePlan}
          onDeletePlan={deletePlan}
          onMovePlan={movePlan}
          onPlanDetails={(dateStr, plan) => onPlanWorkout && onPlanWorkout({ date: dateStr, plan: plan || null })}
          onStartPlan={handleStartPlan}
          weekStartDay={weekStartDay}
        />



        <Progress userId={userId} profile={profile} active={active} weekStartDay={weekStartDay} hideScale={(program?.goals || [program?.goal]).includes('fat_loss')} />
      </div>

      {showProgramSheet && <ProgramSheet userId={userId} program={program} onSave={saveProgram} onClose={() => setShowProgramSheet(false)} weekStartDay={weekStartDay} initialStep={programSheetStep} />}

      {quickLogPlan && <QuickLogSheet plan={quickLogPlan} saving={quickLogSaving} onConfirm={(v) => logPlanNow(quickLogPlan, v)} onClose={() => setQuickLogPlan(null)} />}

      {showAssessment && (
        <FitnessAssessmentFlow
          userId={userId}
          onClose={() => setShowAssessment(false)}
          onComplete={async () => { setShowAssessment(false); setAssessmentDone(true); await loadAll(); }}
        />
      )}

      {showBaseline && (
        <BaselineFlow
          userId={userId}
          onClose={() => setShowBaseline(false)}
          onComplete={async () => { setShowBaseline(false); setIntakeDone(true); await loadAll(); }}
        />
      )}

      {goalInfo && (
        <GoalInfo
          mode={goalInfo} modes={trackedGoals.map((g) => g.mode)} onPick={setGoalInfo}
          onChange={() => { setGoalInfo(null); setEditingGoals(true); }}
          onLearn={() => { setGoalInfo(null); onOpenScientificSupport && onOpenScientificSupport(); }}
          onClose={() => setGoalInfo(null)}
        />
      )}
      {editingGoals && (
        <EditGoalsModal
          tracked={{ Aerobic: trackAerobicGoal, Resistance: trackResistanceGoal, Flexibility: trackFlexibilityGoal, Balance: trackBalanceGoal, Nature: trackNature }}
          goals={{ Aerobic: aerobicGoal, Resistance: resistanceGoal, Flexibility: flexibilityGoal, Balance: balanceGoal }}
          order={orderedModes}
          onMove={moveGoal}
          onToggle={setGoalTracked}
          onChangeGoal={(mode, v) => saveGoal(mode === 'Aerobic' ? 'aerobic_goal' : mode === 'Resistance' ? 'resistance_goal' : mode === 'Balance' ? 'balance_goal' : 'flexibility_goal', v)}
          aerobicGoalMinutes={aerobicGoalMinutes}
          onChangeAerobicMinutes={saveAerobicGoalMinutes}
          natureMinutes={natureGoal}
          onChangeNatureMinutes={(v) => saveNature({ minutes: Math.max(15, Math.min(600, v)) })}
          onClose={() => setEditingGoals(false)}
        />
      )}

    </div>
  );
}

const ACSM_AEROBIC_MINIMUM = 150;

function EditGoalsModal({ order, onMove, tracked, goals, onToggle, onChangeGoal, aerobicGoalMinutes, onChangeAerobicMinutes, natureMinutes: natureGoalMin, onChangeNatureMinutes, onClose }) {
  const ALL = [
    { mode: 'Aerobic', icon: Activity, color: MOSS },
    { mode: 'Resistance', icon: Dumbbell, color: SKY },
    { mode: 'Flexibility', icon: PersonStanding, color: BRICK },
    { mode: 'Balance', icon: Footprints, color: VIOLET },
    { mode: 'Nature', icon: Trees, color: LIME },
  ];
  const MODES = order.map((m) => ALL.find((x) => x.mode === m)).filter(Boolean);
  const [confirmingLow, setConfirmingLow] = useState(null); // the value they tried to set below the ACSM floor
  const sheet = useSwipeDown(onClose);

  function requestAerobicChange(next) {
    if (next < ACSM_AEROBIC_MINIMUM) { setConfirmingLow(next); return; }
    onChangeAerobicMinutes(next);
  }

  return (
    <Portal>
      <div style={{ background: 'rgba(0,0,0,0.6)' }} className="fixed inset-0 flex items-end md:items-center justify-center z-50" onClick={onClose}>
        <div ref={sheet.ref} {...sheet.handlers} style={{ background: INK_2, ...sheet.style }} className="w-full max-w-sm rounded-t-2xl md:rounded-2xl px-5 py-6" onClick={(e) => e.stopPropagation()}>
          <div style={{ background: TEXT_SOFT, opacity: 0.45 }} className={GRAB_BAR_CLASS} />
          <div className="flex items-center justify-between mb-5">
            <h2 style={{ color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="text-lg">Weekly Goals</h2>
            <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-2 -m-2"><X size={20} /></button>
          </div>
          <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-4">Choose which goals show, their order, and what to aim for each week.</div>
          <div className="space-y-2">
            {MODES.map(({ mode, icon: Icon, color }, idx) => {
              const active = tracked[mode];
              const isAerobic = mode === 'Aerobic';
              const isNature = mode === 'Nature';
              return (
                <div key={mode} style={{ background: INK_3 }} className="rounded-md px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                    <span className="flex flex-col -my-1 mr-1">
                      <button onClick={() => onMove(mode, -1)} disabled={idx === 0} style={{ color: TEXT_SOFT, opacity: idx === 0 ? 0.3 : 1 }} className="p-0.5" aria-label={`Move ${mode} up`}><ChevronUp size={14} /></button>
                      <button onClick={() => onMove(mode, 1)} disabled={idx === MODES.length - 1} style={{ color: TEXT_SOFT, opacity: idx === MODES.length - 1 ? 0.3 : 1 }} className="p-0.5" aria-label={`Move ${mode} down`}><ChevronDown size={14} /></button>
                    </span>
                    <button onClick={() => onToggle(mode, !active)} className="flex items-center gap-2">
                      <span
                        style={{ background: active ? color : 'transparent', borderColor: active ? color : TEXT_SOFT }}
                        className="w-5 h-5 rounded-full border flex items-center justify-center"
                      >
                        {active && <Check size={12} color={INK} />}
                      </span>
                      <Icon size={16} color={color} />
                      <span style={{ color: PAPER }} className="text-sm">{mode}</span>
                    </button>
                    </span>
                    {active && (
                      <span className="flex items-center gap-2">
                        <button
                          onClick={() => (isAerobic ? requestAerobicChange(aerobicGoalMinutes - 15) : isNature ? onChangeNatureMinutes(natureGoalMin - 15) : onChangeGoal(mode, goals[mode] - 1))}
                          style={{ color: TEXT_SOFT }}
                          className="p-1 -m-1"
                        >
                          <Minus size={13} />
                        </button>
                        <span style={{ color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="text-sm font-medium w-14 text-center">
                          {isAerobic ? `${aerobicGoalMinutes} min` : isNature ? `${natureGoalMin} min` : goals[mode]}
                        </span>
                        <button
                          onClick={() => (isAerobic ? requestAerobicChange(aerobicGoalMinutes + 15) : isNature ? onChangeNatureMinutes(natureGoalMin + 15) : onChangeGoal(mode, goals[mode] + 1))}
                          style={{ color: TEXT_SOFT }}
                          className="p-1 -m-1"
                        >
                          <Plus size={13} />
                        </button>
                      </span>
                    )}
                  </div>
                  {mode === 'Balance' && (
                    <div style={{ color: TEXT_SOFT }} className="text-sm text-center mt-1.5">
                      Tai Chi and balance work. ACSM suggests 2+ days a week for adults 65+.
                    </div>
                  )}
                  {isNature && (
                    <div style={{ color: TEXT_SOFT }} className="text-sm text-center mt-1.5">
                      Time outdoors. Research links 120+ minutes a week to better health. Outdoor workouts count here too.
                    </div>
                  )}
                  {isAerobic && active && (
                    <div style={{ color: TEXT_SOFT }} className="text-sm text-center mt-1.5">
                      ACSM recommends at least {ACSM_AEROBIC_MINIMUM} min/week (moderate-equivalent)
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {confirmingLow != null && (
            <div style={{ background: INK_3, borderTop: `2px solid ${BRICK}` }} className="rounded-md px-4 py-4 mt-4 text-center">
              <div style={{ color: BRICK }} className="text-sm font-medium mb-1">Below ACSM's recommendation</div>
              <p style={{ color: PAPER_DIM }} className="text-sm mb-3">
                {ACSM_AEROBIC_MINIMUM} min/week is the minimum ACSM recommends for adults. A lower goal isn't advised unless it's clinically warranted — talk to Greg first if that's not the case for you.
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setConfirmingLow(null)} style={{ color: TEXT_SOFT }} className="flex-1 py-2.5 text-sm">
                  Cancel
                </button>
                <button
                  onClick={() => { onChangeAerobicMinutes(confirmingLow); setConfirmingLow(null); }}
                  style={{ background: BRICK, color: PAPER }}
                  className="flex-1 rounded-md py-2.5 text-sm font-medium"
                >
                  Set anyway
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}

function GoalRow({ label, icon: Icon, color, count, goal, planned = 0, unit, aerobic, extra, onInfo }) {
  // Edit or stop tracking a goal from the pencil in the Weekly Goals header. (Rows used to reveal buttons on
  // a left swipe, which is also the swipe to Move, so goals were getting edited by accident.)
  const view = 'minutes'; // aerobic is tracked in minutes only (no counting of separate bouts)
  const [expanded, setExpanded] = useState(false);
  const goalRef = useRevealOnOpen(expanded);
  const showingMinutes = Boolean(aerobic) && view === 'minutes';
  const displayCount = showingMinutes ? aerobic.moderateEquivMinutes : count;
  const displayGoal = showingMinutes ? aerobic.goalMinutes : goal;
  const pct = Math.min(100, (displayCount / displayGoal) * 100);
  // What this week's planned workouts would add, shown dashed and pulsing.
  const displayPlanned = showingMinutes ? aerobic.plannedMinutes : planned;
  const plannedPct = Math.max(0, Math.min(100 - pct, (displayPlanned / displayGoal) * 100));

  return (
    <div ref={goalRef} className="relative mb-1.5 last:mb-0 rounded-md overflow-hidden">
      <div className="w-full flex items-center justify-between mb-1 py-0.5">
        <span className="flex items-center gap-1.5">
          <button onClick={() => (aerobic || extra) && setExpanded((v) => !v)} className="flex items-center gap-1.5">
            <Icon size={14} color={color} />
            <span style={{ color: PAPER_DIM }} className="text-sm">{label}</span>
            {(aerobic || extra) && (expanded ? <ChevronUp size={13} color={TEXT_SOFT} /> : <ChevronDown size={13} color={TEXT_SOFT} />)}
          </button>
          {onInfo && <button onClick={onInfo} style={{ color: TEXT_SOFT }} className="p-1 -m-0.5" aria-label={`About the ${label} goal`}><Info size={14} /></button>}
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="text-sm font-medium">
            {displayCount}
            {displayPlanned > 0 && (
              <span className="groove-plan-pulse" style={{ color, borderBottom: `1.5px dashed ${color}` }}> +{displayPlanned}</span>
            )}
            {' '}/ {displayGoal}{showingMinutes || unit ? ' min' : ''}
          </span>
        </span>
      </div>
      <div style={{ background: INK_3 }} className="h-1.5 rounded-full overflow-hidden relative">
        <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full transition-all" />
        {plannedPct > 0 && (
          <div
            className="groove-plan-pulse absolute top-0 bottom-0 rounded-full"
            style={{
              left: `${pct}%`,
              width: `${plannedPct}%`,
              border: `1.5px dashed ${color}`,
              background: `repeating-linear-gradient(135deg, ${color}55 0 4px, transparent 4px 8px)`,
            }}
          />
        )}
      </div>

      {/* Logging everything as "light" is a common first mistake (light
          intensity is real movement, just not what the ACSM guideline
          counts) — surface that immediately instead of only after
          expanding, so "0 min" never looks like the log went nowhere. */}
      {aerobic && !expanded && showingMinutes && aerobic.moderateEquivMinutes === 0 && aerobic.lightMinutes > 0 && (
        <button onClick={() => setExpanded(true)} style={{ color: TEXT_SOFT }} className="text-sm mt-1 underline underline-offset-2">
          {Math.round(aerobic.lightMinutes)} min logged as light — doesn't count toward this goal, tap for details
        </button>
      )}

      {extra && expanded && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px dashed ${INK_3}` }}>{extra}</div>
      )}

      {aerobic && expanded && (
        <div className="mt-3 pt-3 space-y-2.5" style={{ borderTop: `1px dashed ${INK_3}` }}>
          <AerobicSubBar label="Moderate" minutes={aerobic.moderateMinutes} color={SKY} />
          <AerobicSubBar label="Vigorous" minutes={aerobic.vigorousMinutes} color={BRICK} />
          {aerobic.lightMinutes > 0 && (
            <div style={{ color: TEXT_SOFT }} className="text-sm text-center">
              + {Math.round(aerobic.lightMinutes)} min light activity (doesn't count toward the guideline, but still counts)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// An informational breakdown bar — not its own separate target, just
// showing how this intensity is contributing toward the moderate-
// equivalent total above (vigorous counts double there).
function AerobicSubBar({ label, minutes, color }) {
  const rounded = Math.round(minutes);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span style={{ color: PAPER_DIM }} className="text-sm">{label}</span>
        <span style={{ color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="text-sm">{rounded} min</span>
      </div>
      <div style={{ background: INK_3 }} className="h-1.5 rounded-full overflow-hidden">
        <div style={{ width: `${Math.min(100, (rounded / 150) * 100)}%`, background: color }} className="h-full rounded-full transition-all" />
      </div>
    </div>
  );
}

// Light, in-app encouragement — friendly and specific, never guilt-driven,
// and reflects whichever of the two goals actually needs attention.
function buildInsight({ resistanceThisWeek, aerobicMinutesThisWeek, resistanceGoal, aerobicGoalMinutes, daysSinceLast }) {
  const rDone = resistanceThisWeek >= resistanceGoal;
  const aDone = aerobicMinutesThisWeek >= aerobicGoalMinutes;

  // A gap is the most useful thing to say, so it comes first.
  if (daysSinceLast != null && daysSinceLast >= CLIENT_NUDGE_DAYS) {
    return `Howdy! It's been ${daysSinceLast} days. Even a 20 min walk gets you moving again.`;
  }

  if (rDone && aDone) {
    return 'Howdy! You hit both your resistance and aerobic goals this week — nice work. 🎉';
  }
  if (aDone && !rDone) {
    return "Howdy! Aerobic goal done. One more resistance session rounds out the week.";
  }
  if (rDone && !aDone) {
    return "Howdy! Resistance goal done. Time for a walk or other aerobic today or tomorrow?";
  }
  if (resistanceThisWeek === resistanceGoal - 1 || (aerobicGoalMinutes - aerobicMinutesThisWeek > 0 && aerobicGoalMinutes - aerobicMinutesThisWeek <= 20)) {
    return "Howdy! You're close on a weekly goal. Let's close the gap today or tomorrow!";
  }
  if (daysSinceLast == null) {
    return "Howdy! Ready for your first session? Head to Move when you can.";
  }
  return null;
}

function WorkoutCalendar({ userId, workouts, hasResistance, hasAerobic, hasFlexibility, onOpenWorkout, onLogOnDate, plans = [], onSavePlan, onDeletePlan, onMovePlan, onPlanDetails, onStartPlan, weekStartDay, dataTour }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [choiceDay, setChoiceDay] = useState(null); // a day that already has workouts
  const [plannedDay, setPlannedDay] = useState(null); // a day with planned workouts
  const [planForm, setPlanForm] = useState(null); // { dateStr, plan|null } create/edit
  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rawStartWeekday = firstDay.getDay();
  const startWeekday = weekStartDay === 'monday' ? (rawStartWeekday + 6) % 7 : rawStartWeekday;
  const dayLabels = weekDayLabels(weekStartDay);

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  // A day can have more than one logged session (a walk in the morning,
  // a resistance session later) — combine all of them so none quietly
  // gets shadowed by whichever one happens to render first.
  function workoutsForDay(day) {
    return workouts.filter((w) => sameDay(new Date(w.started_at), day));
  }
  function plansForDay(day) {
    const key = dateInputValue(day);
    return plans.filter((p) => p.planned_for === key);
  }

  return (
    <div data-tour={dataTour} style={{ background: INK_2 }} className="rounded-md px-4 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setMonthOffset((m) => m - 1)} style={{ color: TEXT_SOFT }} className="p-2 -m-2">
          <ChevronLeft size={16} />
        </button>
        <span style={{ color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="text-sm font-medium">
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
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {dayLabels.map((d, i) => (
          <div key={i} style={{ color: TEXT_SOFT }} className="text-sm text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dayWorkouts = workoutsForDay(day);
          const hasAny = dayWorkouts.length > 0;
          const dayPlans = plansForDay(day);
          const isToday = sameDay(day, now);
          const isFuture = day > now && !isToday;
          const r = dayWorkouts.some(hasResistance);
          const a = dayWorkouts.some(hasAerobic);
          const f = dayWorkouts.some(hasFlexibility);
          return (
            <button
              key={i}
              onClick={() => {
                // A day with workouts asks what you want; a planned day shows
                // its plan; an empty future day offers to plan one; an empty
                // past day goes straight to Move to log one for that date.
                if (hasAny) setChoiceDay(day);
                else if (dayPlans.length > 0) setPlannedDay(day);
                else if (isFuture) setPlanForm({ dateStr: dateInputValue(day), plan: null });
                else onLogOnDate && onLogOnDate(day);
              }}
              style={{ outline: isToday ? `1px solid ${SKY}` : 'none', outlineOffset: -1 }}
              className="aspect-[3/2] rounded-md flex flex-col items-center justify-center gap-0.5 group"
            >
              <span style={{ color: hasAny || dayPlans.length > 0 ? PAPER : TEXT_SOFT }} className="text-sm">{day.getDate()}</span>
              {hasAny || dayPlans.length > 0 ? (
                <span className="flex items-center gap-0.5">
                  {a && <Activity size={10} color={MOSS} />}
                  {r && <Dumbbell size={10} color={SKY} />}
                  {f && <PersonStanding size={10} color={BRICK} />}
                  {dayPlans.length > 0 && <PlannedMark plans={dayPlans} past={day < now && !isToday} />}
                </span>
              ) : (
                <Plus size={9} color={INK_3} />
              )}
            </button>
          );
        })}
      </div>
      {/* First-timers (no plans yet) get a one-tap way to plan tomorrow; it hides itself once a plan exists. */}
      {plans.length === 0 && workouts.length < 3 && (
        <FirstTimeHint
          id="plan"
          userId={userId}
          label="Want to Plan a Workout?"
          color={LIME}
          className="mt-1"
          onOpen={() => { const t = new Date(); t.setDate(t.getDate() + 1); setPlanForm({ dateStr: dateInputValue(t), plan: null }); }}
        />
      )}
      {plannedDay && (
        <PlannedWorkoutPopup
          dateStr={dateInputValue(plannedDay)}
          plans={plansForDay(plannedDay)}
          isToday={sameDay(plannedDay, now)}
          isPast={plannedDay < now && !sameDay(plannedDay, now)}
          onClose={() => setPlannedDay(null)}
          onEdit={(plan) => { setPlannedDay(null); setPlanForm({ dateStr: plan.planned_for, plan }); }}
          onDetails={(plan) => { setPlannedDay(null); onPlanDetails && onPlanDetails(plan.planned_for, plan); }}
          onMove={async (plan, d) => { const ok = await onMovePlan(plan, d); if (ok && plansForDay(plannedDay).length <= 1) setPlannedDay(null); }}
          onDelete={async (plan) => {
            const deleted = await onDeletePlan(plan);
            // Close once the last plan for this day is gone.
            if (deleted && plansForDay(plannedDay).length <= 1) setPlannedDay(null);
          }}
          onStart={(plan) => { setPlannedDay(null); onStartPlan && onStartPlan(plan, plan.planned_for); }}
          onPlanAnother={() => { const d = plannedDay; setPlannedDay(null); setPlanForm({ dateStr: dateInputValue(d), plan: null }); }}
        />
      )}
      {planForm && (
        <PlanFormPopup
          dateStr={planForm.dateStr}
          plan={planForm.plan}
          onClose={() => setPlanForm(null)}
          onSave={async ({ title, notes, details }) => {
            await onSavePlan({ id: planForm.plan?.id, date: planForm.dateStr, title, notes, details });
            setPlanForm(null);
          }}
          onDetails={() => { const f = planForm; setPlanForm(null); onPlanDetails && onPlanDetails(f.dateStr, f.plan); }}
        />
      )}
      {choiceDay && (
        <DayChoicePopup
          day={choiceDay}
          count={workoutsForDay(choiceDay).length}
          plans={plansForDay(choiceDay)}
          onStartPlan={(plan) => { setChoiceDay(null); onStartPlan && onStartPlan(plan, plan.planned_for); }}
          onPlanned={() => { const d = choiceDay; setChoiceDay(null); setPlannedDay(d); }}
          onClose={() => setChoiceDay(null)}
          onView={() => { const w = workoutsForDay(choiceDay)[0]; setChoiceDay(null); onOpenWorkout && onOpenWorkout(w.id); }}
          onLog={() => { const d = choiceDay; setChoiceDay(null); onLogOnDate && onLogOnDate(d); }}
        />
      )}
    </div>
  );
}

// A planned workout on the calendar: the same icon a logged one of that
// type gets (aerobic unless the plan says otherwise), with a little timer
// on it, pulsing gently.
function PlannedMark({ plans, past = false }) {
  const kinds = new Set();
  plans.forEach((p) => planKinds(p).forEach((k) => kinds.add(k)));
  const icon = { aerobic: [Activity, MOSS], resistance: [Dumbbell, SKY], flexibility: [PersonStanding, BRICK] };
  return (
    <>
      {[...kinds].map((k) => {
        const [Icon, color] = icon[k];
        return (
          <span key={k} className={`${past ? 'opacity-60' : 'groove-plan-blink'} relative inline-flex`}>
            <Icon size={11} color={color} />
            <Timer size={7} color={color} strokeWidth={3} className="absolute -right-1 -bottom-0.5 rounded-full" style={{ background: INK_2 }} />
          </span>
        );
      })}
    </>
  );
}

// Shown when a calendar day already has workouts: look back at them, or
// add another for that date.
function DayChoicePopup({ day, count, plans = [], onStartPlan, onPlanned, onView, onLog, onClose }) {
  const isFuture = day > new Date() && !sameDay(day, new Date());
  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" onClick={onClose}>
        <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" />
        <div style={{ background: INK_2, borderTop: `2px solid ${LIME}` }} className="relative w-full max-w-xs rounded-xl px-5 py-5 text-center" onClick={(e) => e.stopPropagation()}>
          <div style={{ color: PAPER }} className="text-base font-medium">
            {day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <div style={{ color: TEXT_SOFT }} className="text-sm mb-4">
            {count === 1 ? '1 workout logged' : `${count} workouts logged`}
          </div>
          <button onClick={onView} style={{ background: LIME, color: INK }} className="w-full rounded-md py-2.5 text-sm font-medium mb-2">
            {count === 1 ? 'View workout' : 'View workouts'}
          </button>
          {!isFuture && (
            <button onClick={onLog} style={{ background: INK_3, color: PAPER }} className="w-full rounded-md py-2.5 text-sm font-medium mb-1">
              Log another workout
            </button>
          )}
          {plans.length > 0 && (
            <div style={{ borderTop: `1px dashed ${INK_3}` }} className="mt-3 pt-3">
              <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-2">Planned</div>
              {plans.map((p) => (
                <div key={p.id} style={{ background: INK_3 }} className="rounded-md px-3 py-2.5 mb-2">
                  <div style={{ color: PAPER }} className="text-sm font-medium">{p.title}</div>
                  {planSummary(p) && <div style={{ color: TEXT_SOFT }} className="text-sm">{planSummary(p)}</div>}
                  {!isFuture && (
                    <button onClick={() => onStartPlan(p)} style={{ background: LIME, color: INK }} className="w-full rounded-md py-2 text-sm font-medium mt-2">
                      {sameDay(day, new Date()) ? 'Start Workout' : 'Log It'}
                    </button>
                  )}
                </div>
              ))}
              <button onClick={onPlanned} style={{ color: TEXT_SOFT }} className="text-sm underline mb-1">Edit or Delete Plans</button>
            </div>
          )}
          <button onClick={onClose} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2">Cancel</button>
        </div>
      </div>
    </Portal>
  );
}

// "Where Did These Come From?" for first-time members (their goals load automatically): what the three weekly goals mean in
// plain words (from ACSM), and a way to change them or read more under Learn > Guides > Scientific Support.
