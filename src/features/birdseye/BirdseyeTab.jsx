import { estimateKcal } from '../../lib/calories';
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Dumbbell, Activity, StretchHorizontal, CalendarClock, Plus, Minus, Pencil, X, Info, Check } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Portal from '../../Portal';
import { useAuth } from '../../auth/AuthContext';
import { INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY, MOSS, BRICK, INK, AMBER, PLUM } from '../../theme';
import FitnessAssessmentFlow from '../baseline/FitnessAssessmentFlow';
import BaselineFlow from '../baseline/BaselineFlow';
import { startOfWeek, weekDayLabels } from '../../lib/week';
import { predictedMaxHR, computeHrZones } from '../../lib/heartRate';
import MetBrowser from '../../MetBrowser';
import SwipeHint from '../../SwipeHint';
import ScreeningStatus from '../screening/ScreeningStatus';
import { PlanFormPopup, PlannedWorkoutPopup } from '../plan/PlanPopups';
import { needsClearance } from '../screening/screening';

function daysBetween(a, b) {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function sameDay(a, b) {
  return a.toDateString() === b.toDateString();
}

function dateInputValue(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function BirdseyeTab({ userId, onOpenWorkout, onLogWorkout, onPlanWorkout, onStartPlan, onOpenGroove, active, openBaselineOnLoad, onBaselineAutoOpened }) {
  const { profile, updateProfile } = useAuth();
  const weekStartDay = profile?.week_start_day || 'sunday';
  const [workouts, setWorkouts] = useState([]);
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
  const [resistanceGoal, setResistanceGoal] = useState(3);
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
  const [plans, setPlans] = useState([]); // planned workouts from today on

  async function loadAll() {
    const [workoutsRes, baselineRes, profileRes, setsRes] = await Promise.all([
      supabase.from('workouts').select('id, started_at, completed_at, muscle_groups, activities, movement_mode').eq('user_id', userId).is('deleted_at', null).order('started_at', { ascending: false }),
      supabase.from('baseline_responses').select('fitness_assessment, form_answers, submitted_at').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('age, resting_hr_bpm, max_hr_bpm, prescribed_hr_zone, resistance_goal, aerobic_goal, aerobic_goal_minutes, flexibility_goal, track_flexibility_goal, track_aerobic_goal, track_resistance_goal, bodyweight_lb').eq('id', userId).maybeSingle(),
      supabase.from('workout_sets').select('workout_id, exercise_name, muscle_group, distance, movement_type, light_minutes, moderate_minutes, vigorous_minutes').eq('user_id', userId),
    ]);
    // Plans load on their own so a hiccup there never blocks the rest of Birdseye.
    const planRes = await supabase.from('planned_workouts').select('*').eq('user_id', userId).gte('planned_for', dateInputValue(new Date())).order('planned_for', { ascending: true });
    setPlans(planRes.error ? [] : (planRes.data || []));
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
    setResistanceGoal(profileRow?.resistance_goal || 3);
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
      if (s.movement_type === 'aerobic') {
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
    setWorkoutTypes(types);
    setAerobicMinutesByWorkout(aerobicMinutes);
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
    return byMode || (w.muscle_groups || []).length > 0 || workoutTypes[w.id]?.has('resistance');
  }
  function hasAerobic(w) {
    const byMode = w.movement_mode === 'Aerobic' || w.movement_mode === 'Combined';
    return byMode || (w.activities || []).length > 0 || workoutTypes[w.id]?.has('aerobic');
  }
  function hasFlexibility(w) {
    const byMode = w.movement_mode === 'Flexibility';
    return byMode || workoutTypes[w.id]?.has('flexibility');
  }

  async function saveGoal(field, value) {
    const clamped = Math.min(14, Math.max(1, value));
    if (field === 'resistance_goal') setResistanceGoal(clamped);
    else if (field === 'aerobic_goal') setAerobicGoal(clamped);
    else setFlexibilityGoal(clamped);
    await supabase.from('profiles').update({ [field]: clamped }).eq('id', userId);
  }

  async function saveAerobicGoalMinutes(value) {
    const clamped = Math.max(10, Math.min(600, value));
    setAerobicGoalMinutes(clamped);
    await supabase.from('profiles').update({ aerobic_goal_minutes: clamped }).eq('id', userId);
  }

  async function setGoalTracked(mode, next) {
    const field = mode === 'Aerobic' ? 'track_aerobic_goal' : mode === 'Resistance' ? 'track_resistance_goal' : 'track_flexibility_goal';
    if (mode === 'Aerobic') setTrackAerobicGoal(next);
    else if (mode === 'Resistance') setTrackResistanceGoal(next);
    else setTrackFlexibilityGoal(next);
    await supabase.from('profiles').update({ [field]: next }).eq('id', userId);
  }

  async function savePlan({ id, date, title, notes }) {
    const fields = { title, notes: notes || null };
    const { error } = id
      ? await supabase.from('planned_workouts').update(fields).eq('id', id)
      : await supabase.from('planned_workouts').insert({ planned_for: date, ...fields });
    if (error) { setLoadError(`Couldn't save your plan: ${error.message}`); return; }
    await loadAll();
  }
  async function deletePlan(plan) {
    if (!window.confirm('Delete this planned workout?')) return false;
    const { error } = await supabase.from('planned_workouts').delete().eq('id', plan.id);
    if (error) { setLoadError(`Couldn't delete your plan: ${error.message}`); return false; }
    await loadAll();
    return true;
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <span style={{ color: TEXT_SOFT }} className="text-sm">Loading…</span>
      </div>
    );
  }

  const now = new Date();
  const weekStart = startOfWeek(now, weekStartDay);
  const workoutsThisWeek = workouts.filter((w) => new Date(w.started_at) >= weekStart);
  const resistanceThisWeek = workoutsThisWeek.filter(hasResistance).length;
  const aerobicThisWeek = workoutsThisWeek.filter(hasAerobic).length;
  const flexibilityThisWeek = workoutsThisWeek.filter(hasFlexibility).length;

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
  const kcalThisWeek = workoutsThisWeek.reduce((sum, w) => sum + (kcalByWorkout[w.id] || 0), 0);
  const moderateEquivMinutesThisWeek = moderateMinutesThisWeek + vigorousMinutesThisWeek * 2;

  // Streak: consecutive weeks (including this one) hitting BOTH goals.
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
    const rCount = weekWorkouts.filter(hasResistance).length;
    const aMinutes = weekWorkouts.reduce((sum, w) => {
      const b = aerobicMinutesByWorkout[w.id];
      return sum + (b ? b.moderate + b.vigorous * 2 : 0);
    }, 0);
    if (rCount >= resistanceGoal && aMinutes >= aerobicGoalMinutes) streak++;
    else break;
    if (i > 52) break;
  }

  const daysSinceLast = workouts.length > 0 ? daysBetween(now, new Date(workouts[0].started_at)) : null;
  // No "head over to Move" nudges while a doctor's okay is still recommended.
  const insight = needsClearance(profile?.screening) ? null : buildInsight({ resistanceThisWeek, aerobicMinutesThisWeek: moderateEquivMinutesThisWeek, resistanceGoal, aerobicGoalMinutes, daysSinceLast });

  const trackedGoals = [
    trackAerobicGoal && { mode: 'Aerobic', label: 'Aerobic', icon: Activity, color: MOSS, count: aerobicThisWeek, goal: aerobicGoal, field: 'aerobic_goal' },
    trackResistanceGoal && { mode: 'Resistance', label: 'Resistance', icon: Dumbbell, color: SKY, count: resistanceThisWeek, goal: resistanceGoal, field: 'resistance_goal' },
    trackFlexibilityGoal && { mode: 'Flexibility', label: 'Flexibility', icon: StretchHorizontal, color: BRICK, count: flexibilityThisWeek, goal: flexibilityGoal, field: 'flexibility_goal' },
  ].filter(Boolean);

  return (
    <div className="max-w-md mx-auto px-4 pb-12 text-center relative flex flex-col min-h-full">
      {loadError && (
        <div style={{ background: INK_2, color: BRICK }} className="rounded-md px-4 py-3 mb-4 text-sm text-center">
          {loadError}
        </div>
      )}
      <div className="flex flex-col gap-4">
        <ScreeningStatus />
        {!intakeDone && (
          <button
            onClick={() => setShowBaseline(true)}
            style={{ background: INK_2, borderTop: `2px solid ${PLUM}` }}
            className="w-full rounded-lg px-5 py-4 text-center"
          >
            <div style={{ color: PLUM }} className="text-sm uppercase tracking-wide mb-1">Let's get to know you</div>
            <div style={{ color: PAPER }} className="text-sm font-medium">Finish setting up your account →</div>
            <div style={{ color: TEXT_SOFT }} className="text-sm mt-0.5">About 10 minutes, whenever you're ready.</div>
          </button>
        )}

        {insight && (
          <div style={{ background: INK_2, borderTop: `2px solid ${LIME}` }} className="rounded-lg px-5 py-4">
            <div style={{ color: PAPER }} className="text-sm">{insight}</div>
          </div>
        )}

        <div data-tour="birdseye-goals" style={{ background: INK_2, borderTop: `2px solid ${LIME}` }} className="rounded-lg px-5 py-6">
          <div className="flex items-center justify-between mb-3">
            <span />
            <span style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide">Weekly Goals</span>
            <button onClick={() => setEditingGoals(true)} style={{ color: TEXT_SOFT }} className="p-1 -m-1">
              <Pencil size={14} />
            </button>
          </div>

          <SwipeHint id="goals">Tip: swipe a goal left to edit or stop tracking it.</SwipeHint>
          {trackedGoals.map((g) => (
            <GoalRow
              key={g.mode} label={g.label} icon={g.icon} color={g.color} count={g.count} goal={g.goal}
              active={active}
              onEdit={() => setEditingGoals(true)}
              onDelete={() => { if (window.confirm('Stop tracking this goal?')) setGoalTracked(g.mode, false); }}
              aerobic={g.mode === 'Aerobic' ? {
                goalMinutes: aerobicGoalMinutes,
                moderateEquivMinutes: moderateEquivMinutesThisWeek,
                lightMinutes: lightMinutesThisWeek,
                moderateMinutes: moderateMinutesThisWeek,
                vigorousMinutes: vigorousMinutesThisWeek,
              } : null}
            />
          ))}

          {kcalThisWeek > 0 && (
            <div style={{ color: TEXT_SOFT }} className="text-sm mt-3">
              ~{kcalThisWeek.toLocaleString()} kcal burned this week <span style={{ opacity: 0.7 }}>(ACSM estimate)</span>
            </div>
          )}

          {streak > 0 && (
            <div style={{ color: LIME }} className="text-sm mt-3">
              🔥 {streak} week{streak === 1 ? '' : 's'} in a row hitting both goals
            </div>
          )}
        </div>

        <WorkoutCalendar
          dataTour="birdseye-calendar"
          workouts={workouts}
          hasResistance={hasResistance}
          hasAerobic={hasAerobic}
          hasFlexibility={hasFlexibility}
          onOpenWorkout={onOpenWorkout}
          onLogOnDate={(day) => onLogWorkout && onLogWorkout(dateInputValue(day))}
          plans={plans}
          onSavePlan={savePlan}
          onDeletePlan={deletePlan}
          onPlanDetails={(dateStr, plan) => onPlanWorkout && onPlanWorkout({ date: dateStr, plan: plan || null })}
          onStartPlan={(plan) => onStartPlan && onStartPlan(plan)}
          weekStartDay={weekStartDay}
        />

        <ScienceStrategy
          dataTour="birdseye-science"
          assessmentDone={assessmentDone}
          onStartAssessment={() => setShowAssessment(true)}
          resistanceGoal={resistanceGoal}
          aerobicGoalMinutes={aerobicGoalMinutes}
          restingHrNum={restingHrNum} maxHrNum={maxHrNum} maxHrIsPredicted={maxHrIsPredicted}
          prescribedZone={prescribedZone}
        />
      </div>

      <div className="mt-4">
        <MovementLibrary hrZones={computeHrZones(restingHrNum, maxHrNum)} />
      </div>

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

      {editingGoals && (
        <EditGoalsModal
          tracked={{ Aerobic: trackAerobicGoal, Resistance: trackResistanceGoal, Flexibility: trackFlexibilityGoal }}
          goals={{ Aerobic: aerobicGoal, Resistance: resistanceGoal, Flexibility: flexibilityGoal }}
          onToggle={setGoalTracked}
          onChangeGoal={(mode, v) => saveGoal(mode === 'Aerobic' ? 'aerobic_goal' : mode === 'Resistance' ? 'resistance_goal' : 'flexibility_goal', v)}
          aerobicGoalMinutes={aerobicGoalMinutes}
          onChangeAerobicMinutes={saveAerobicGoalMinutes}
          onClose={() => setEditingGoals(false)}
        />
      )}

    </div>
  );
}

const ACSM_AEROBIC_MINIMUM = 150;

function EditGoalsModal({ tracked, goals, onToggle, onChangeGoal, aerobicGoalMinutes, onChangeAerobicMinutes, onClose }) {
  const MODES = [
    { mode: 'Aerobic', icon: Activity, color: MOSS },
    { mode: 'Resistance', icon: Dumbbell, color: SKY },
    { mode: 'Flexibility', icon: StretchHorizontal, color: BRICK },
  ];
  const [confirmingLow, setConfirmingLow] = useState(null); // the value they tried to set below the ACSM floor

  function requestAerobicChange(next) {
    if (next < ACSM_AEROBIC_MINIMUM) { setConfirmingLow(next); return; }
    onChangeAerobicMinutes(next);
  }

  return (
    <Portal>
      <div style={{ background: 'rgba(0,0,0,0.6)' }} className="fixed inset-0 flex items-end md:items-center justify-center z-50" onClick={onClose}>
        <div style={{ background: INK_2 }} className="w-full max-w-sm rounded-t-2xl md:rounded-2xl px-5 py-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h2 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-lg">Weekly Goals</h2>
            <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-2 -m-2"><X size={20} /></button>
          </div>
          <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-4">Choose which modes show up, and what to aim for each week.</div>
          <div className="space-y-2">
            {MODES.map(({ mode, icon: Icon, color }) => {
              const active = tracked[mode];
              const isAerobic = mode === 'Aerobic';
              return (
                <div key={mode} style={{ background: INK_3 }} className="rounded-md px-4 py-3">
                  <div className="flex items-center justify-between">
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
                    {active && (
                      <span className="flex items-center gap-2">
                        <button
                          onClick={() => (isAerobic ? requestAerobicChange(aerobicGoalMinutes - 15) : onChangeGoal(mode, goals[mode] - 1))}
                          style={{ color: TEXT_SOFT }}
                          className="p-1 -m-1"
                        >
                          <Minus size={13} />
                        </button>
                        <span style={{ color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm font-medium w-14 text-center">
                          {isAerobic ? `${aerobicGoalMinutes} min` : goals[mode]}
                        </span>
                        <button
                          onClick={() => (isAerobic ? requestAerobicChange(aerobicGoalMinutes + 15) : onChangeGoal(mode, goals[mode] + 1))}
                          style={{ color: TEXT_SOFT }}
                          className="p-1 -m-1"
                        >
                          <Plus size={13} />
                        </button>
                      </span>
                    )}
                  </div>
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

function GoalRow({ label, icon: Icon, color, count, goal, onEdit, onDelete, aerobic, active }) {
  const [revealed, setRevealed] = useState(false);
  const [view, setView] = useState('minutes'); // 'minutes' | 'sessions' — aerobic only
  const [expanded, setExpanded] = useState(false);
  const startX = useRef(0);
  const dragging = useRef(false);

  // Swiping to Move and back left this open indefinitely — close it
  // whenever this tab isn't the one showing, or once the page itself
  // has scrolled a meaningful amount (both read as "I'm done with
  // this row" even without an explicit tap elsewhere).
  useEffect(() => {
    if (!active) setRevealed(false);
  }, [active]);
  useEffect(() => {
    if (!revealed) return;
    const scroller = document.getElementById('app-scroll');
    if (!scroller) return;
    const startTop = scroller.scrollTop;
    function onScroll() {
      if (Math.abs(scroller.scrollTop - startTop) > 40) setRevealed(false);
    }
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [revealed]);

  const showingMinutes = Boolean(aerobic) && view === 'minutes';
  const displayCount = showingMinutes ? aerobic.moderateEquivMinutes : count;
  const displayGoal = showingMinutes ? aerobic.goalMinutes : goal;
  const pct = Math.min(100, (displayCount / displayGoal) * 100);

  function handleTouchStart(e) {
    startX.current = e.touches[0].clientX;
    dragging.current = true;
  }
  function handleTouchMove(e) {
    if (!dragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < -30) setRevealed(true);
    if (dx > 30) setRevealed(false);
  }
  function handleTouchEnd() {
    dragging.current = false;
  }

  return (
    <div
      data-no-swipe
      className="relative mb-3 last:mb-0 rounded-md overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Nothing in the row itself ever moves — the buttons slide IN
          from off-screen to overlay it, instead of the row's own
          content sliding away to uncover them underneath. Absolutely
          positioned elements always paint above normal in-flow content
          in CSS, so once these are on-screen they're guaranteed visible
          without needing to fight anything for stacking. */}
      <div
        className="absolute right-0 top-0 bottom-0 flex"
        style={{ width: 96, transform: `translateX(${revealed ? 0 : 96}px)`, transition: 'transform 0.2s ease' }}
      >
        <button onClick={onEdit} style={{ background: SKY, color: INK }} className="flex-1 flex items-center justify-center">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} style={{ background: BRICK, color: PAPER }} className="flex-1 flex items-center justify-center">
          <X size={14} />
        </button>
      </div>
      <button
        onClick={() => aerobic && setExpanded((v) => !v)}
        className="w-full flex items-center justify-between mb-1 py-0.5"
      >
        <span className="flex items-center gap-1.5">
          <Icon size={14} color={color} />
          <span style={{ color: PAPER_DIM }} className="text-sm">{label}</span>
          {aerobic && (expanded ? <ChevronUp size={13} color={TEXT_SOFT} /> : <ChevronDown size={13} color={TEXT_SOFT} />)}
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm font-medium">
            {displayCount} / {displayGoal}{showingMinutes ? ' min' : ''}
          </span>
          <span className="flex items-center gap-0.5" style={{ color: TEXT_SOFT }}>
            <span style={{ width: 2, height: 14, background: 'currentColor', borderRadius: 1 }} />
            <span style={{ width: 2, height: 14, background: 'currentColor', borderRadius: 1 }} />
          </span>
        </span>
      </button>
      <div style={{ background: INK_3 }} className="h-2 rounded-full overflow-hidden">
        <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full transition-all" />
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

      {aerobic && expanded && (
        <div className="mt-3 pt-3 space-y-2.5" style={{ borderTop: `1px dashed ${INK_3}` }}>
          <div className="flex items-center justify-center gap-2">
            {['minutes', 'sessions'].map((v) => (
              <button
                key={v}
                onClick={(e) => { e.stopPropagation(); setView(v); }}
                style={{ background: view === v ? color : INK_3, color: view === v ? INK : PAPER_DIM }}
                className="px-3 py-1 rounded-full text-sm font-medium capitalize"
              >
                {v}
              </button>
            ))}
          </div>
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
        <span style={{ color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm">{rounded} min</span>
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

  if (rDone && aDone) {
    return 'Howdy! You hit both your resistance and aerobic goals this week — nice work. 🎉';
  }
  if (aDone && !rDone) {
    return "Howdy! Aerobic goal is done for the week — one more resistance session would round things out nicely.";
  }
  if (rDone && !aDone) {
    return "Howdy! Resistance goal is done for the week — got time for some aerobic activity, like a walk, today or tomorrow?";
  }
  if (resistanceThisWeek === resistanceGoal - 1 || (aerobicGoalMinutes - aerobicMinutesThisWeek > 0 && aerobicGoalMinutes - aerobicMinutesThisWeek <= 20)) {
    return "Howdy! You're close on one of your weekly goals — let's close the gap today or tomorrow!";
  }
  if (daysSinceLast != null && daysSinceLast >= 4) {
    return `Howdy! It's been ${daysSinceLast} days since your last session — do you have time for a 20 min walk today?`;
  }
  if (daysSinceLast == null) {
    return "Howdy! Ready for your first session? Head over to Move whenever you've got a few minutes.";
  }
  return null;
}

function WorkoutCalendar({ workouts, hasResistance, hasAerobic, hasFlexibility, onOpenWorkout, onLogOnDate, plans = [], onSavePlan, onDeletePlan, onPlanDetails, onStartPlan, weekStartDay, dataTour }) {
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
              className="aspect-[5/4] rounded-md flex flex-col items-center justify-center gap-0.5 group"
            >
              <span style={{ color: hasAny || dayPlans.length > 0 ? PAPER : TEXT_SOFT }} className="text-sm">{day.getDate()}</span>
              {hasAny || dayPlans.length > 0 ? (
                <span className="flex items-center gap-0.5">
                  {a && <Activity size={10} color={MOSS} />}
                  {r && <Dumbbell size={10} color={SKY} />}
                  {f && <StretchHorizontal size={10} color={BRICK} />}
                  {dayPlans.length > 0 && <CalendarClock size={10} color={PLUM} className="groove-plan-blink" />}
                </span>
              ) : (
                <Plus size={9} color={INK_3} />
              )}
            </button>
          );
        })}
      </div>
      {plannedDay && (
        <PlannedWorkoutPopup
          dateStr={dateInputValue(plannedDay)}
          plans={plansForDay(plannedDay)}
          isToday={sameDay(plannedDay, now)}
          onClose={() => setPlannedDay(null)}
          onEdit={(plan) => { setPlannedDay(null); setPlanForm({ dateStr: plan.planned_for, plan }); }}
          onDelete={async (plan) => {
            const deleted = await onDeletePlan(plan);
            // Close once the last plan for this day is gone.
            if (deleted && plansForDay(plannedDay).length <= 1) setPlannedDay(null);
          }}
          onStart={(plan) => { setPlannedDay(null); onStartPlan && onStartPlan(plan); }}
          onPlanAnother={() => { const d = plannedDay; setPlannedDay(null); setPlanForm({ dateStr: dateInputValue(d), plan: null }); }}
        />
      )}
      {planForm && (
        <PlanFormPopup
          dateStr={planForm.dateStr}
          plan={planForm.plan}
          onClose={() => setPlanForm(null)}
          onSave={async ({ title, notes }) => {
            await onSavePlan({ id: planForm.plan?.id, date: planForm.dateStr, title, notes });
            setPlanForm(null);
          }}
          onDetails={() => { const f = planForm; setPlanForm(null); onPlanDetails && onPlanDetails(f.dateStr, f.plan); }}
        />
      )}
      {choiceDay && (
        <DayChoicePopup
          day={choiceDay}
          count={workoutsForDay(choiceDay).length}
          plannedCount={plansForDay(choiceDay).length}
          onPlanned={() => { const d = choiceDay; setChoiceDay(null); setPlannedDay(d); }}
          onClose={() => setChoiceDay(null)}
          onView={() => { const w = workoutsForDay(choiceDay)[0]; setChoiceDay(null); onOpenWorkout && onOpenWorkout(w.id); }}
          onLog={() => { const d = choiceDay; setChoiceDay(null); onLogOnDate && onLogOnDate(d); }}
        />
      )}
    </div>
  );
}

// Shown when a calendar day already has workouts: look back at them, or
// add another for that date.
function DayChoicePopup({ day, count, plannedCount = 0, onPlanned, onView, onLog, onClose }) {
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
          {plannedCount > 0 && (
            <button onClick={onPlanned} style={{ background: INK_3, color: PAPER }} className="w-full rounded-md py-2.5 text-sm font-medium mb-1">
              Planned workout{plannedCount > 1 ? 's' : ''}
            </button>
          )}
          <button onClick={onClose} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2">Cancel</button>
        </div>
      </div>
    </Portal>
  );
}

const MOVEMENT_INFO = {
  Aerobic: 'Anything that gets your heart rate up counts: walking, cycling, dancing, even yard work.',
  Resistance: 'No gym needed. Bodyweight moves, bands, carrying groceries, and yard work all count.',
  Flexibility: 'Stretching, yoga, and mobility work all count.',
};

// Your individualized exercise prescription and the ACSM guidelines it's
// built on, as one dropdown — they said nearly the same thing twice.
function ScienceStrategy({ assessmentDone, onStartAssessment, resistanceGoal, aerobicGoalMinutes, restingHrNum, maxHrNum, maxHrIsPredicted, prescribedZone, dataTour }) {
  const zones = computeHrZones(restingHrNum, maxHrNum);
  const [open, setOpen] = useState(false);
  const [openInfo, setOpenInfo] = useState(null);
  const infoBtn = (label) => (
    <button onClick={() => setOpenInfo((v) => (v === label ? null : label))} style={{ color: TEXT_SOFT }} className="p-1 -m-1">
      <Info size={13} />
    </button>
  );
  const infoBox = (label) => openInfo === label && (
    <div style={{ background: INK_3, color: PAPER_DIM }} className="rounded-md px-3 py-2.5 text-sm mt-2">{MOVEMENT_INFO[label]}</div>
  );

  return (
    <div data-tour={dataTour} style={{ background: INK_2, borderTop: `2px solid ${MOSS}` }} className="rounded-lg px-5 py-4 text-center">
      <button onClick={() => setOpen((v) => !v)} className="w-full grid grid-cols-[24px_1fr_24px] items-center">
        <span />
        <span style={{ color: MOSS }} className="text-sm uppercase tracking-wide font-bold">Science Supported Strategy</span>
        <span className="justify-self-end">{open ? <ChevronUp size={16} color={TEXT_SOFT} /> : <ChevronDown size={16} color={TEXT_SOFT} />}</span>
      </button>

      {open && (
        <div style={{ borderTop: `1px dashed ${INK_3}` }} className="mt-3 pt-3 space-y-4">
          <p style={{ color: TEXT_SOFT }} className="text-sm italic">
            Your plan, built on ACSM guidelines.
          </p>

          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span style={{ color: MOSS }} className="text-sm font-medium">Aerobic</span>{infoBtn('Aerobic')}
            </div>
            <p style={{ color: TEXT_SOFT }} className="text-sm mb-1">
              {aerobicGoalMinutes} min/week of moderate-intensity activity, over 3+ days. Vigorous minutes count double.
            </p>
            {zones ? (
              <>
                {prescribedZone && <div style={{ color: SKY }} className="text-sm mb-1">Greg recommends: {prescribedZone} zone</div>}
                <div className="space-y-1">
                  {zones.map((z) => (
                    <div key={z.label} className="flex items-center justify-center gap-2">
                      <span style={{ color: PAPER_DIM }} className="text-sm">{z.label}:</span>
                      <span style={{ color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm">{z.lowBpm}–{z.highBpm} bpm</span>
                    </div>
                  ))}
                </div>
                <p style={{ color: TEXT_SOFT }} className="text-sm mt-1">
                  Your heart-rate ranges{maxHrIsPredicted ? ' (age-based estimate)' : ''}.
                </p>
              </>
            ) : (
              <p style={{ color: TEXT_SOFT }} className="text-sm">Add your resting heart rate in Account to see your ranges.</p>
            )}
            {infoBox('Aerobic')}
          </div>

          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span style={{ color: SKY }} className="text-sm font-medium">Resistance</span>{infoBtn('Resistance')}
            </div>
            <p style={{ color: TEXT_SOFT }} className="text-sm">
              {resistanceGoal} day{resistanceGoal === 1 ? '' : 's'}/week, all major muscles, 2–4 sets of 8–12 reps.
            </p>
            {infoBox('Resistance')}
          </div>

          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span style={{ color: BRICK }} className="text-sm font-medium">Flexibility</span>{infoBtn('Flexibility')}
            </div>
            <p style={{ color: TEXT_SOFT }} className="text-sm">
              2–3 days/week. Hold each stretch 10–30 sec.
            </p>
            {infoBox('Flexibility')}
          </div>

          {!assessmentDone && (
            <button onClick={onStartAssessment} style={{ color: MOSS }} className="text-sm underline">
              Complete your fitness baseline for a fuller picture →
            </button>
          )}
          <div style={{ color: TEXT_SOFT }} className="text-sm">— American College of Sports Medicine</div>
        </div>
      )}
    </div>
  );
}

function MovementLibrary({ hrZones }) {
  const [open, setOpen] = useState(false);
  return (
    <div data-tour="birdseye-library" style={{ background: INK_2 }} className="rounded-md px-4 py-3">
      <button onClick={() => setOpen((v) => !v)} className="w-full grid grid-cols-[24px_1fr_24px] items-center">
        <span />
        <span style={{ color: AMBER }} className="text-sm uppercase tracking-wide font-bold">Movement Library</span>
        <span className="justify-self-end">{open ? <ChevronUp size={16} color={TEXT_SOFT} /> : <ChevronDown size={16} color={TEXT_SOFT} />}</span>
      </button>
      {open && (
        <div style={{ borderTop: `1px dashed ${INK_3}` }} className="mt-3 pt-3">
          <p style={{ color: TEXT_SOFT }} className="text-sm italic text-center mb-3">
            Gardening counts. So does dancing.
          </p>
          <MetBrowser hrZones={hrZones} />
        </div>
      )}
    </div>
  );
}
