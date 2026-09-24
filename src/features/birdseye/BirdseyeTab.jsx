import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Dumbbell, Activity, StretchHorizontal, Plus, Minus, Pencil, X, Info, Check } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Portal from '../../Portal';
import { useAuth } from '../../auth/AuthContext';
import { INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY, MOSS, BRICK, INK, AMBER } from '../../theme';
import FitnessAssessmentFlow from '../baseline/FitnessAssessmentFlow';
import BaselineFlow from '../baseline/BaselineFlow';
import { startOfWeek, weekDayLabels } from '../../lib/week';
import { predictedMaxHR, computeHrZones } from '../../lib/heartRate';
import { WORKOUT_LOCATIONS, locationEmojis } from '../move/exerciseLibrary';
import MovementTypePicker from '../move/MovementTypePicker';

function daysBetween(a, b) {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function sameDay(a, b) {
  return a.toDateString() === b.toDateString();
}

function todayInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateInputValue(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function BirdseyeTab({ userId, onOpenWorkout, onOpenGroove, active, openBaselineOnLoad, onBaselineAutoOpened }) {
  const { profile, updateProfile } = useAuth();
  const weekStartDay = profile?.week_start_day || 'sunday';
  const customActivities = profile?.custom_activities || [];
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
  const [quickLogDate, setQuickLogDate] = useState(null);
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

  async function loadAll() {
    const [workoutsRes, baselineRes, profileRes, setsRes] = await Promise.all([
      supabase.from('workouts').select('id, started_at, completed_at, muscle_groups, activities, movement_mode').eq('user_id', userId).is('deleted_at', null).order('started_at', { ascending: false }),
      supabase.from('baseline_responses').select('fitness_assessment, form_answers, submitted_at').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('age, resting_hr_bpm, max_hr_bpm, prescribed_hr_zone, resistance_goal, aerobic_goal, aerobic_goal_minutes, flexibility_goal, track_flexibility_goal, track_aerobic_goal, track_resistance_goal').eq('id', userId).maybeSingle(),
      supabase.from('workout_sets').select('workout_id, movement_type, light_minutes, moderate_minutes, vigorous_minutes').eq('user_id', userId),
    ]);
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

  async function addCustomActivity(name) {
    const trimmed = name.trim();
    if (!trimmed || customActivities.includes(trimmed)) return;
    await updateProfile({ custom_activities: [...customActivities, trimmed] });
  }
  async function removeCustomActivity(name) {
    await updateProfile({ custom_activities: customActivities.filter((a) => a !== name) });
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
  const insight = buildInsight({ resistanceThisWeek, aerobicMinutesThisWeek: moderateEquivMinutesThisWeek, resistanceGoal, aerobicGoalMinutes, daysSinceLast });

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
        {!intakeDone && (
          <button
            onClick={() => setShowBaseline(true)}
            style={{ background: INK_2, borderTop: `2px solid ${LIME}` }}
            className="w-full rounded-lg px-5 py-4 text-center"
          >
            <div style={{ color: LIME }} className="text-sm uppercase tracking-wide mb-1">Let's get to know you</div>
            <div style={{ color: PAPER }} className="text-sm font-medium">Finish setting up your account →</div>
            <div style={{ color: TEXT_SOFT }} className="text-sm mt-0.5">A few questions so I can actually coach you — takes about 10 minutes, whenever you're ready.</div>
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

          {trackedGoals.map((g) => (
            <GoalRow
              key={g.mode} label={g.label} icon={g.icon} color={g.color} count={g.count} goal={g.goal}
              active={active}
              onEdit={() => setEditingGoals(true)}
              onDelete={() => setGoalTracked(g.mode, false)}
              aerobic={g.mode === 'Aerobic' ? {
                goalMinutes: aerobicGoalMinutes,
                moderateEquivMinutes: moderateEquivMinutesThisWeek,
                lightMinutes: lightMinutesThisWeek,
                moderateMinutes: moderateMinutesThisWeek,
                vigorousMinutes: vigorousMinutesThisWeek,
              } : null}
            />
          ))}

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
          onAddWorkout={(day) => setQuickLogDate(dateInputValue(day))}
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
        <AcsmGuidelines />
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

      {quickLogDate && (
        <QuickLogModal
          gender={profile?.gender}
          initialDate={quickLogDate}
          customActivities={customActivities}
          onAddCustomActivity={addCustomActivity}
          onRemoveCustomActivity={removeCustomActivity}
          onClose={() => setQuickLogDate(null)}
          onSaved={async () => { setQuickLogDate(null); await loadAll(); }}
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
                {ACSM_AEROBIC_MINIMUM} min/week is the minimum ACSM recommends for adults. A lower goal isn't advised unless it's clinically warranted — talk to your coach first if that's not the case for you.
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

function WorkoutCalendar({ workouts, hasResistance, hasAerobic, hasFlexibility, onOpenWorkout, onAddWorkout, weekStartDay, dataTour }) {
  const [monthOffset, setMonthOffset] = useState(0);
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
          const isToday = sameDay(day, now);
          const isFuture = day > now && !isToday;
          const r = dayWorkouts.some(hasResistance);
          const a = dayWorkouts.some(hasAerobic);
          const f = dayWorkouts.some(hasFlexibility);
          return (
            <button
              key={i}
              onClick={() => {
                if (hasAny) { onOpenWorkout && onOpenWorkout(dayWorkouts[0].id); }
                else if (!isFuture) { onAddWorkout && onAddWorkout(day); }
              }}
              disabled={!hasAny && isFuture}
              style={{ outline: isToday ? `1px solid ${SKY}` : 'none', outlineOffset: -1 }}
              className="aspect-[5/4] rounded-md flex flex-col items-center justify-center gap-0.5 group"
            >
              <span style={{ color: hasAny ? PAPER : TEXT_SOFT }} className="text-sm">{day.getDate()}</span>
              {hasAny ? (
                <span className="flex items-center gap-0.5">
                  {a && <Activity size={10} color={MOSS} />}
                  {r && <Dumbbell size={10} color={SKY} />}
                  {f && <StretchHorizontal size={10} color={BRICK} />}
                </span>
              ) : !isFuture ? (
                <Plus size={9} color={INK_3} />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// The permanent, personalized companion to the ACSM reference below: your
// own individualized exercise prescription, not just an abstract standard.
function ScienceStrategy({ assessmentDone, onStartAssessment, resistanceGoal, aerobicGoalMinutes, restingHrNum, maxHrNum, maxHrIsPredicted, prescribedZone, dataTour }) {
  const zones = computeHrZones(restingHrNum, maxHrNum);

  return (
    <div data-tour={dataTour} style={{ background: INK_2, borderTop: `2px solid ${MOSS}` }} className="rounded-lg px-5 py-5 text-center">
      <div style={{ color: MOSS }} className="text-sm uppercase tracking-wide font-bold mb-3">
        My Science-Supported Strategy
      </div>

      <div className="space-y-4">
        <p style={{ color: TEXT_SOFT }} className="text-sm">
          My individualized exercise prescription, based on my goals (see ACSM guidelines description below):
        </p>

        <div>
          <div style={{ color: MOSS }} className="text-sm font-medium mb-1">Aerobic</div>
          <p style={{ color: TEXT_SOFT }} className="text-sm mb-1">
            Aim for {aerobicGoalMinutes} min/week (moderate-equivalent — vigorous minutes count double), spread across 3+ days.
          </p>
          {zones ? (
            <>
              {prescribedZone && (
                <div style={{ color: SKY }} className="text-sm mb-1">Coach-recommended: {prescribedZone} zone</div>
              )}
              <div className="space-y-1">
                {zones.map((z) => (
                  <div key={z.label} className="flex items-center justify-center gap-2">
                    <span style={{ color: PAPER_DIM }} className="text-sm">{z.label}:</span>
                    <span style={{ color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm">{z.lowBpm}–{z.highBpm} bpm</span>
                  </div>
                ))}
              </div>
              <p style={{ color: TEXT_SOFT }} className="text-sm mt-1">
                Keep your heart rate in these ranges during aerobic work{maxHrIsPredicted ? ' (max is an age-based estimate)' : ''}.
              </p>
            </>
          ) : (
            <p style={{ color: TEXT_SOFT }} className="text-sm">
              Add your resting heart rate in Account → Baseline Data to see your personal target ranges.
            </p>
          )}
        </div>

        <div>
          <div style={{ color: SKY }} className="text-sm font-medium mb-1">Resistance</div>
          <p style={{ color: TEXT_SOFT }} className="text-sm">
            Train each major muscle group across {resistanceGoal} session{resistanceGoal === 1 ? '' : 's'}/week, 2–4 sets of 8–12 reps at moderate-to-vigorous intensity.
          </p>
        </div>

        <div>
          <div style={{ color: BRICK }} className="text-sm font-medium mb-1">Flexibility</div>
          <p style={{ color: TEXT_SOFT }} className="text-sm">
            Stretch major muscle-tendon groups 2–3 days/week, holding each stretch 10–30 sec for 2–4 reps.
          </p>
        </div>

        {!assessmentDone && (
          <button
            onClick={onStartAssessment}
            style={{ color: MOSS }}
            className="text-sm underline"
          >
            Complete your fitness baseline for a fuller picture →
          </button>
        )}
      </div>
    </div>
  );
}

const MOVEMENT_INFO = {
  Aerobic: "Aerobic activity doesn't have to mean the treadmill. Anything that elicits your target heart-rate response counts — brisk walking, cycling, swimming, dancing, hiking, even a vigorous afternoon of yard work. What matters is the response your body has, not the setting it happens in.",
  Resistance: 'Resistance training is most convenient in a gym with barbells and machines, but that\'s not the only way to meet this recommendation. Bodyweight circuits, resistance bands, carrying or loading heavy objects (yard work, groceries, moving furniture), rock climbing, and heavy manual labor can all count toward this guideline.',
  Flexibility: 'Static stretching, yoga, and dynamic mobility work targeting the major muscle-tendon groups all count — the goal is regularly moving your joints through their full range of motion.',
};

function AcsmGuidelines() {
  const [open, setOpen] = useState(false);
  const [openInfo, setOpenInfo] = useState(null);

  return (
    <div style={{ background: INK_2 }} className="rounded-md px-4 py-3">
      <button onClick={() => setOpen((v) => !v)} className="w-full grid grid-cols-[24px_1fr_24px] items-center">
        <span />
        <span style={{ color: AMBER }} className="text-sm uppercase tracking-wide font-bold leading-snug">
          ACSM's Recommendations for<br />Physical Activity
        </span>
        <span className="justify-self-end">{open ? <ChevronUp size={16} color={TEXT_SOFT} /> : <ChevronDown size={16} color={TEXT_SOFT} />}</span>
      </button>
      {open && (
        <div style={{ borderTop: `1px dashed ${INK_3}` }} className="mt-3 pt-3 space-y-4 text-center">
          <p style={{ color: TEXT_SOFT }} className="text-sm italic">
            The American College of Sports Medicine (ACSM) is the leading professional organization for exercise science, publishing the evidence-based, science-backed recommendations behind the guidelines below.
          </p>

          <GuidelineBlock
            label="Aerobic" color={MOSS}
            text="150+ min/week moderate, or 75+ min/week vigorous (or a combination), spread across 3+ days — no more than 2 consecutive days without activity."
            open={openInfo === 'Aerobic'} onToggle={() => setOpenInfo((v) => (v === 'Aerobic' ? null : 'Aerobic'))}
          />
          <GuidelineBlock
            label="Resistance" color={SKY}
            text="2–3 non-consecutive days/week, training all major muscle groups — 2–4 sets of 8–12 reps at moderate-to-vigorous intensity."
            open={openInfo === 'Resistance'} onToggle={() => setOpenInfo((v) => (v === 'Resistance' ? null : 'Resistance'))}
          />
          <GuidelineBlock
            label="Flexibility" color={BRICK}
            text="2–3 days/week, stretching major muscle-tendon groups — hold static stretches 10–30 sec, 2–4 reps each."
            open={openInfo === 'Flexibility'} onToggle={() => setOpenInfo((v) => (v === 'Flexibility' ? null : 'Flexibility'))}
          />

          <div style={{ color: TEXT_SOFT }} className="text-sm">— American College of Sports Medicine</div>
        </div>
      )}
    </div>
  );
}

function GuidelineBlock({ label, color, text, open, onToggle }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <span style={{ color }} className="text-sm font-medium">{label}</span>
        <button onClick={onToggle} style={{ color: TEXT_SOFT }} className="p-1 -m-1">
          <Info size={13} />
        </button>
      </div>
      <div style={{ color: PAPER_DIM }} className="text-sm">{text}</div>
      {open && (
        <div style={{ background: INK_3, color: PAPER_DIM }} className="rounded-md px-3 py-2.5 text-sm mt-2">
          {MOVEMENT_INFO[label]}
        </div>
      )}
    </div>
  );
}

function QuickLogModal({ gender, initialDate, customActivities, onAddCustomActivity, onRemoveCustomActivity, onClose, onSaved }) {
  const [date, setDate] = useState(initialDate || todayInputValue());
  const [location, setLocation] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [details, setDetails] = useState({}); // activity -> {minutes, seconds, distance}
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleGroup(g) {
    setSelectedGroups((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }
  function toggleActivity(a) {
    setSelectedActivities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }
  function updateDetail(activity, field, value) {
    setDetails((prev) => ({ ...prev, [activity]: { ...prev[activity], [field]: value } }));
  }

  const canSave = Boolean(date) && Boolean(location) && (selectedGroups.length > 0 || selectedActivities.length > 0);

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError('');
    const iso = new Date(`${date}T12:00:00`).toISOString();
    const { data: workout, error: workoutErr } = await supabase
      .from('workouts')
      .insert({
        muscle_groups: selectedGroups,
        activities: selectedActivities,
        location,
        started_at: iso,
        completed_at: iso,
      })
      .select()
      .single();
    if (workoutErr) { setSaving(false); setError(workoutErr.message); return; }

    const setRows = selectedActivities
      .map((activity) => {
        const d = details[activity] || {};
        const light = parseInt(d.light, 10) || 0;
        const moderate = parseInt(d.moderate, 10) || 0;
        const vigorous = parseInt(d.vigorous, 10) || 0;
        const durationSeconds = (light + moderate + vigorous) * 60;
        const distance = (d.distance || '').trim();
        if (!durationSeconds && !distance) return null;
        return {
          workout_id: workout.id,
          exercise_name: activity,
          muscle_group: 'Cardio',
          set_number: 1,
          movement_type: 'aerobic',
          duration_seconds: durationSeconds || null,
          distance: distance || null,
          light_minutes: light || null,
          moderate_minutes: moderate || null,
          vigorous_minutes: vigorous || null,
        };
      })
      .filter(Boolean);
    if (setRows.length > 0) await supabase.from('workout_sets').insert(setRows);

    setSaving(false);
    onSaved();
  }

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" />
      <div
        style={{ background: INK_2 }}
        className="relative w-full max-w-md rounded-t-xl px-5 pt-5 pb-8 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div style={{ color: PAPER }} className="text-sm font-medium">Log movement</div>
          <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-2 -m-2">
            <X size={18} />
          </button>
        </div>

        <div style={{ color: TEXT_SOFT }} className="text-sm mb-2 text-center">Date</div>
        <input
          type="date"
          value={date}
          max={todayInputValue()}
          onChange={(e) => setDate(e.target.value)}
          style={{ background: INK_3, color: PAPER }}
          className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center mb-4"
        />

        <div style={{ color: TEXT_SOFT }} className="text-sm mb-2 text-center">Where</div>
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {WORKOUT_LOCATIONS.map((loc) => {
            const [left, right] = locationEmojis(loc, gender);
            return (
              <button
                key={loc}
                onClick={() => setLocation(loc)}
                style={{ background: location === loc ? SKY : INK_3, color: location === loc ? INK : PAPER_DIM }}
                className="px-3 py-2 rounded-full text-sm font-medium"
              >
                {left} {loc} {right}
              </button>
            );
          })}
        </div>

        <MovementTypePicker
          selectedGroups={selectedGroups}
          onToggleGroup={toggleGroup}
          selectedActivities={selectedActivities}
          onToggleActivity={toggleActivity}
          customActivities={customActivities}
          onAddCustomActivity={onAddCustomActivity}
          onRemoveCustomActivity={onRemoveCustomActivity}
        />

        {selectedActivities.length > 0 && (
          <div className="space-y-3 mt-2 mb-2">
            {selectedActivities.map((activity) => (
              <div key={activity} style={{ background: INK_3 }} className="rounded-md px-3 py-3">
                <div style={{ color: PAPER }} className="text-sm mb-2 text-center">{activity}</div>
                <div style={{ color: TEXT_SOFT }} className="text-sm mb-1.5 text-center">Minutes spent at each intensity</div>
                <div className="flex items-center justify-center gap-2 flex-wrap mb-2">
                  {[['light', 'Light'], ['moderate', 'Moderate'], ['vigorous', 'Vigorous']].map(([field, label]) => (
                    <div key={field} className="flex flex-col items-center gap-1">
                      <span style={{ color: TEXT_SOFT }} className="text-sm">{label}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={details[activity]?.[field] || ''}
                        onChange={(e) => updateDetail(activity, field, e.target.value)}
                        placeholder="0"
                        style={{ background: INK_2, color: PAPER }}
                        className="w-16 rounded-md px-2 py-2 text-sm outline-none text-center"
                      />
                    </div>
                  ))}
                </div>
                <input
                  type="text"
                  value={details[activity]?.distance || ''}
                  onChange={(e) => updateDetail(activity, 'distance', e.target.value)}
                  placeholder="distance (optional)"
                  style={{ background: INK_2, color: PAPER }}
                  className="w-full rounded-md px-2 py-2 text-sm outline-none text-center"
                />
              </div>
            ))}
          </div>
        )}

        {error && <div style={{ color: BRICK }} className="text-sm text-center mb-2">{error}</div>}

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          style={{ background: canSave ? LIME : INK_3, color: canSave ? INK : TEXT_SOFT }}
          className="w-full rounded-md py-3 text-sm font-medium mt-3"
        >
          {saving ? 'Saving…' : 'Save movement'}
        </button>
      </div>
    </div>
    </Portal>
  );
}
