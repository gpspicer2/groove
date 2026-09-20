import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Dumbbell, Activity, RotateCcw, Plus, Minus, Pencil, X, Info } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY, MOSS, BRICK, INK, AMBER } from '../../theme';
import FitnessAssessmentFlow from '../baseline/FitnessAssessmentFlow';
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

export default function BirdseyeTab({ userId, onOpenWorkout }) {
  const { profile, updateProfile } = useAuth();
  const weekStartDay = profile?.week_start_day || 'sunday';
  const customActivities = profile?.custom_activities || [];
  const [workouts, setWorkouts] = useState([]);
  const [deletedWorkouts, setDeletedWorkouts] = useState([]);
  const [workoutTypes, setWorkoutTypes] = useState({}); // workoutId -> Set('resistance'|'aerobic')
  const [journalCount, setJournalCount] = useState(0);
  const [assessmentDone, setAssessmentDone] = useState(true);
  const [age, setAge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAssessment, setShowAssessment] = useState(false);
  const [quickLogDate, setQuickLogDate] = useState(null);
  const [bodyweight, setBodyweight] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [prescribedZone, setPrescribedZone] = useState(null);
  const [restingHr, setRestingHr] = useState('');
  const [maxHr, setMaxHr] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [resistanceGoal, setResistanceGoal] = useState(3);
  const [aerobicGoal, setAerobicGoal] = useState(3);

  async function loadAll() {
    const [{ data: w }, { data: deleted }, { data: j }, { data: baseline }, { data: profileRow }, { data: setRows }] = await Promise.all([
      supabase.from('workouts').select('id, started_at, completed_at, muscle_groups, activities').not('completed_at', 'is', null).is('deleted_at', null).order('started_at', { ascending: false }),
      supabase.from('workouts').select('id, started_at, muscle_groups, activities').not('deleted_at', 'is', null).order('started_at', { ascending: false }),
      supabase.from('journal_entries').select('id'),
      supabase.from('baseline_responses').select('fitness_assessment, form_answers').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('bodyweight_lb, resting_hr_bpm, max_hr_bpm, prescribed_hr_zone, resistance_goal, aerobic_goal').eq('id', userId).maybeSingle(),
      supabase.from('workout_sets').select('workout_id, movement_type').eq('user_id', userId),
    ]);
    setWorkouts(w || []);
    setDeletedWorkouts(deleted || []);
    setJournalCount((j || []).length);
    setAssessmentDone(Boolean(baseline?.fitness_assessment && Object.keys(baseline.fitness_assessment).length > 0));
    setAge(profile?.age != null ? Number(profile.age) : (baseline?.form_answers?.age ? Number(baseline.form_answers.age) : null));
    setBodyweight(profileRow?.bodyweight_lb != null ? String(profileRow.bodyweight_lb) : '');
    setPrescribedZone(profileRow?.prescribed_hr_zone || null);
    setRestingHr(profileRow?.resting_hr_bpm != null ? String(profileRow.resting_hr_bpm) : '');
    setMaxHr(profileRow?.max_hr_bpm != null ? String(profileRow.max_hr_bpm) : '');
    setResistanceGoal(profileRow?.resistance_goal || 3);
    setAerobicGoal(profileRow?.aerobic_goal || 3);

    const types = {};
    (setRows || []).forEach((s) => {
      if (!types[s.workout_id]) types[s.workout_id] = new Set();
      types[s.workout_id].add(s.movement_type || 'resistance');
    });
    setWorkoutTypes(types);
  }

  useEffect(() => {
    (async () => {
      await loadAll();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function hasResistance(w) {
    return (w.muscle_groups || []).length > 0 || workoutTypes[w.id]?.has('resistance');
  }
  function hasAerobic(w) {
    return (w.activities || []).length > 0 || workoutTypes[w.id]?.has('aerobic');
  }

  async function saveBodyweight(value) {
    setSavingWeight(true);
    const numeric = value.trim() === '' ? null : parseFloat(value);
    await supabase.from('profiles').update({ bodyweight_lb: numeric }).eq('id', userId);
    setSavingWeight(false);
  }

  async function saveHr(field, value) {
    const numeric = value.trim() === '' ? null : parseFloat(value);
    await supabase.from('profiles').update({ [field]: numeric, ...(field === 'max_hr_bpm' ? { max_hr_measured: numeric != null } : {}) }).eq('id', userId);
  }

  async function saveGoal(field, value) {
    const clamped = Math.min(14, Math.max(1, value));
    if (field === 'resistance_goal') setResistanceGoal(clamped); else setAerobicGoal(clamped);
    await supabase.from('profiles').update({ [field]: clamped }).eq('id', userId);
  }

  async function restoreWorkout(id) {
    const { error } = await supabase.from('workouts').update({ deleted_at: null }).eq('id', id);
    if (error) return;
    await loadAll();
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
    const aCount = weekWorkouts.filter(hasAerobic).length;
    if (rCount >= resistanceGoal && aCount >= aerobicGoal) streak++;
    else break;
    if (i > 52) break;
  }

  const daysSinceLast = workouts.length > 0 ? daysBetween(now, new Date(workouts[0].started_at)) : null;
  const insight = buildInsight({ resistanceThisWeek, aerobicThisWeek, resistanceGoal, aerobicGoal, daysSinceLast });

  const restingHrNum = restingHr.trim() === '' ? null : parseFloat(restingHr);
  const maxHrNum = maxHr.trim() === '' ? (predictedMaxHR(age) || null) : parseFloat(maxHr);
  const maxHrIsPredicted = maxHr.trim() === '' && maxHrNum != null;

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
        <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-3">This week</div>

        <GoalRow label="Resistance" icon={Dumbbell} color={SKY} count={resistanceThisWeek} goal={resistanceGoal} onChangeGoal={(v) => saveGoal('resistance_goal', v)} />
        <GoalRow label="Aerobic" icon={Activity} color={MOSS} count={aerobicThisWeek} goal={aerobicGoal} onChangeGoal={(v) => saveGoal('aerobic_goal', v)} />

        {streak > 0 && (
          <div style={{ color: LIME }} className="text-sm mt-3">
            🔥 {streak} week{streak === 1 ? '' : 's'} in a row hitting both goals
          </div>
        )}
      </div>

      <WorkoutCalendar
        workouts={workouts}
        hasResistance={hasResistance}
        hasAerobic={hasAerobic}
        onOpenWorkout={onOpenWorkout}
        onAddWorkout={(day) => setQuickLogDate(dateInputValue(day))}
        weekStartDay={weekStartDay}
      />

      <DeletedWorkouts workouts={deletedWorkouts} open={showDeleted} onToggle={() => setShowDeleted((v) => !v)} onRestore={restoreWorkout} />

      <div className="mt-4">
        <ScienceStrategy
          restingHrNum={restingHrNum} maxHrNum={maxHrNum} maxHrIsPredicted={maxHrIsPredicted}
          prescribedZone={prescribedZone}
        />
      </div>

      <div className="mt-4">
        <AcsmGuidelines />
      </div>

      <div style={{ background: INK_2 }} className="rounded-md px-4 py-3 mb-4 mt-4">
        <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-1">Journal entries logged</div>
        <div style={{ color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }} className="text-lg">{journalCount}</div>
      </div>

      <BaselineSection>
        <div>
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

        <HeartRateCard
          restingHr={restingHr} setRestingHr={setRestingHr}
          maxHr={maxHr} setMaxHr={setMaxHr}
          onSave={saveHr}
          restingHrNum={restingHrNum} maxHrNum={maxHrNum} maxHrIsPredicted={maxHrIsPredicted}
          prescribedZone={prescribedZone}
        />
      </BaselineSection>

      {showAssessment && (
        <FitnessAssessmentFlow
          userId={userId}
          onClose={() => setShowAssessment(false)}
          onComplete={() => { setShowAssessment(false); setAssessmentDone(true); }}
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
    </div>
  );
}

function GoalRow({ label, icon: Icon, color, count, goal, onChangeGoal }) {
  const [editing, setEditing] = useState(false);
  const pct = Math.min(100, (count / goal) * 100);
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5">
          <Icon size={14} color={color} />
          <span style={{ color: PAPER_DIM }} className="text-sm">{label}</span>
        </span>
        {editing ? (
          <span className="flex items-center gap-2">
            <button onClick={() => onChangeGoal(goal - 1)} style={{ color: TEXT_SOFT }} className="p-1 -m-1">
              <Minus size={13} />
            </button>
            <span style={{ color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm font-medium w-14 text-center">
              {count} / {goal}
            </span>
            <button onClick={() => onChangeGoal(goal + 1)} style={{ color: TEXT_SOFT }} className="p-1 -m-1">
              <Plus size={13} />
            </button>
            <button onClick={() => setEditing(false)} style={{ color }} className="text-sm">Done</button>
          </span>
        ) : (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1">
            <span style={{ color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm font-medium">
              {count} / {goal}
            </span>
            <Pencil size={11} color={TEXT_SOFT} />
          </button>
        )}
      </div>
      <div style={{ background: INK_3 }} className="h-2 rounded-full overflow-hidden">
        <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full transition-all" />
      </div>
    </div>
  );
}

// Light, in-app encouragement — friendly and specific, never guilt-driven,
// and reflects whichever of the two goals actually needs attention.
function buildInsight({ resistanceThisWeek, aerobicThisWeek, resistanceGoal, aerobicGoal, daysSinceLast }) {
  const rDone = resistanceThisWeek >= resistanceGoal;
  const aDone = aerobicThisWeek >= aerobicGoal;

  if (rDone && aDone) {
    return 'Howdy! You hit both your resistance and aerobic goals this week — nice work. 🎉';
  }
  if (rDone && !aDone) {
    return "Howdy! Resistance goal is done for the week — got time for some aerobic activity, like a walk, today or tomorrow?";
  }
  if (aDone && !rDone) {
    return "Howdy! Aerobic goal is done for the week — one more resistance session would round things out nicely.";
  }
  if (resistanceThisWeek === resistanceGoal - 1 || aerobicThisWeek === aerobicGoal - 1) {
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

function WorkoutCalendar({ workouts, hasResistance, hasAerobic, onOpenWorkout, onAddWorkout, weekStartDay }) {
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
        {dayLabels.map((d, i) => (
          <div key={i} style={{ color: TEXT_SOFT }} className="text-sm text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const workout = workoutForDay(day);
          const isToday = sameDay(day, now);
          const isFuture = day > now && !isToday;
          const r = workout && hasResistance(workout);
          const a = workout && hasAerobic(workout);
          return (
            <button
              key={i}
              onClick={() => {
                if (workout) { onOpenWorkout && onOpenWorkout(workout.id); }
                else if (!isFuture) { onAddWorkout && onAddWorkout(day); }
              }}
              disabled={!workout && isFuture}
              style={{ outline: isToday ? `1px solid ${SKY}` : 'none', outlineOffset: -1 }}
              className="aspect-square rounded-md flex flex-col items-center justify-center gap-0.5 group"
            >
              <span style={{ color: workout ? PAPER : TEXT_SOFT }} className="text-sm">{day.getDate()}</span>
              {workout ? (
                <span className="flex items-center gap-0.5">
                  {r && <Dumbbell size={11} color={SKY} />}
                  {a && <Activity size={11} color={MOSS} />}
                </span>
              ) : !isFuture ? (
                <Plus size={10} color={INK_3} />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 mt-3">
        <div className="flex items-center gap-1">
          <Dumbbell size={12} color={SKY} />
          <span style={{ color: TEXT_SOFT }} className="text-sm">Resistance</span>
        </div>
        <div className="flex items-center gap-1">
          <Activity size={12} color={MOSS} />
          <span style={{ color: TEXT_SOFT }} className="text-sm">Aerobic</span>
        </div>
      </div>
      <div style={{ color: TEXT_SOFT }} className="text-sm text-center mt-2">Tap an empty day to log a workout</div>
    </div>
  );
}

function DeletedWorkouts({ workouts, open, onToggle, onRestore }) {
  if (workouts.length === 0) return null;
  return (
    <div style={{ background: INK_2 }} className="rounded-md px-4 py-3 mt-4">
      <button onClick={onToggle} className="w-full grid grid-cols-[24px_1fr_24px] items-center">
        <span />
        <span style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide">Deleted Workouts ({workouts.length})</span>
        <span className="justify-self-end">{open ? <ChevronUp size={16} color={TEXT_SOFT} /> : <ChevronDown size={16} color={TEXT_SOFT} />}</span>
      </button>
      {open && (
        <div style={{ borderTop: `1px dashed ${INK_3}` }} className="mt-3 pt-3 space-y-2">
          {workouts.map((w) => (
            <div key={w.id} className="flex flex-col items-center gap-1">
              <div style={{ color: PAPER_DIM }} className="text-sm">
                {[...(w.muscle_groups || []), ...(w.activities || [])].join(' + ') || 'Workout'}
              </div>
              <div style={{ color: TEXT_SOFT }} className="text-sm">
                {new Date(w.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <button onClick={() => onRestore(w.id)} style={{ color: LIME }} className="text-sm flex items-center gap-1 py-1 px-1">
                <RotateCcw size={14} /> Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BaselineSection({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: INK_2 }} className="rounded-md px-4 py-3 mb-4">
      <button onClick={() => setOpen((v) => !v)} className="w-full grid grid-cols-[24px_1fr_24px] items-center">
        <span />
        <span style={{ color: SKY }} className="text-sm uppercase tracking-wide font-bold">Baseline Data</span>
        <span className="justify-self-end">{open ? <ChevronUp size={16} color={TEXT_SOFT} /> : <ChevronDown size={16} color={TEXT_SOFT} />}</span>
      </button>
      {open && (
        <div style={{ borderTop: `1px dashed ${INK_3}` }} className="mt-3 pt-3 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

// Practical application of the ACSM guidelines below: turns the client's
// own resting/max heart rate into concrete target ranges, rather than
// leaving the guidelines as an abstract reference.
function ScienceStrategy({ restingHrNum, maxHrNum, maxHrIsPredicted, prescribedZone }) {
  const [open, setOpen] = useState(false);
  const zones = computeHrZones(restingHrNum, maxHrNum);

  return (
    <div style={{ background: INK_2 }} className="rounded-md px-4 py-3">
      <button onClick={() => setOpen((v) => !v)} className="w-full grid grid-cols-[24px_1fr_24px] items-center">
        <span />
        <span style={{ color: MOSS }} className="text-sm uppercase tracking-wide font-bold">Science-Supported Strategy</span>
        <span className="justify-self-end">{open ? <ChevronUp size={16} color={TEXT_SOFT} /> : <ChevronDown size={16} color={TEXT_SOFT} />}</span>
      </button>
      {open && (
        <div style={{ borderTop: `1px dashed ${INK_3}` }} className="mt-3 pt-3 space-y-3 text-center">
          <p style={{ color: TEXT_SOFT }} className="text-sm">
            The ACSM guidelines below tell you how much to move. This turns them into a personal number, using your own heart rate.
          </p>
          {zones ? (
            <>
              {prescribedZone && (
                <div style={{ color: SKY }} className="text-sm">
                  Your coach recommends training in the {prescribedZone} zone
                </div>
              )}
              <div className="space-y-1">
                {zones.map((z) => (
                  <div key={z.label} className="flex items-center justify-center gap-2">
                    <span style={{ color: PAPER_DIM }} className="text-sm">{z.label}:</span>
                    <span style={{ color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm">{z.lowBpm}–{z.highBpm} bpm</span>
                  </div>
                ))}
              </div>
              <p style={{ color: TEXT_SOFT }} className="text-sm">
                Aim to keep your heart rate in these ranges during aerobic work{maxHrIsPredicted ? ' (max is an age-based estimate)' : ''} to stay aligned with the ACSM guidelines.
              </p>
            </>
          ) : (
            <p style={{ color: TEXT_SOFT }} className="text-sm">
              Add your resting heart rate in Baseline Data below to see your personal target ranges.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function HeartRateCard({ restingHr, setRestingHr, maxHr, setMaxHr, onSave, restingHrNum, maxHrNum, maxHrIsPredicted, prescribedZone }) {
  const zones = computeHrZones(restingHrNum, maxHrNum);

  return (
    <div>
      <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-2">Heart rate</div>
      {prescribedZone && (
        <div style={{ color: SKY }} className="text-sm mb-3">
          Your coach recommends training in the {prescribedZone} zone
        </div>
      )}
      <div className="flex items-center justify-center gap-4 mb-2">
        <div>
          <div style={{ color: TEXT_SOFT }} className="text-sm mb-1">Resting</div>
          <input
            type="number"
            inputMode="numeric"
            value={restingHr}
            onChange={(e) => setRestingHr(e.target.value)}
            onBlur={(e) => onSave('resting_hr_bpm', e.target.value)}
            placeholder="—"
            style={{ background: INK_3, color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }}
            className="w-16 rounded-md px-2 py-1.5 text-lg text-center outline-none"
          />
        </div>
        <div>
          <div style={{ color: TEXT_SOFT }} className="text-sm mb-1">Max{maxHrIsPredicted ? ' (est.)' : ''}</div>
          <input
            type="number"
            inputMode="numeric"
            value={maxHr}
            onChange={(e) => setMaxHr(e.target.value)}
            onBlur={(e) => onSave('max_hr_bpm', e.target.value)}
            placeholder={maxHrIsPredicted ? String(maxHrNum) : '—'}
            style={{ background: INK_3, color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }}
            className="w-16 rounded-md px-2 py-1.5 text-lg text-center outline-none"
          />
        </div>
      </div>
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-3">
        bpm — leave max blank to use an age-based estimate
      </div>
      {zones ? (
        <div className="space-y-1">
          {zones.map((z) => (
            <div key={z.label} className="flex items-center justify-between">
              <span style={{ color: PAPER_DIM }} className="text-sm">{z.label}</span>
              <span style={{ color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }} className="text-sm">{z.lowBpm}–{z.highBpm} bpm</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: TEXT_SOFT }} className="text-sm">Enter your resting heart rate to see your training zones.</div>
      )}
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
        const durationSeconds = (parseInt(d.minutes, 10) || 0) * 60 + (parseInt(d.seconds, 10) || 0);
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
        };
      })
      .filter(Boolean);
    if (setRows.length > 0) await supabase.from('workout_sets').insert(setRows);

    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" />
      <div
        style={{ background: INK_2 }}
        className="relative w-full max-w-md rounded-t-xl px-5 pt-5 pb-8 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div style={{ color: PAPER }} className="text-sm font-medium">Log a workout</div>
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
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={details[activity]?.minutes || ''}
                    onChange={(e) => updateDetail(activity, 'minutes', e.target.value)}
                    placeholder="min"
                    style={{ background: INK_2, color: PAPER }}
                    className="w-16 rounded-md px-2 py-2 text-sm outline-none text-center"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={details[activity]?.seconds || ''}
                    onChange={(e) => updateDetail(activity, 'seconds', e.target.value)}
                    placeholder="sec"
                    style={{ background: INK_2, color: PAPER }}
                    className="w-16 rounded-md px-2 py-2 text-sm outline-none text-center"
                  />
                  <input
                    type="text"
                    value={details[activity]?.distance || ''}
                    onChange={(e) => updateDetail(activity, 'distance', e.target.value)}
                    placeholder="distance (optional)"
                    style={{ background: INK_2, color: PAPER }}
                    className="flex-1 min-w-[7rem] rounded-md px-2 py-2 text-sm outline-none text-center"
                  />
                </div>
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
          {saving ? 'Saving…' : 'Save workout'}
        </button>
      </div>
    </div>
  );
}
