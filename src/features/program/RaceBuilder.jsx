import React, { useState } from 'react';
import { Check } from '../../lib/icons';
import { INK, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY, BRICK } from '../../theme';
import {
  RACES, LEVEL_LABEL, WEEKLY_CHOICES, LONGEST_CHOICES, levelFor, startingVdot, weeksBetween, dateForWeeks, feasibility, goalCheck,
  parseTime, fmtTime, fmtPace, paces, isoDate, raceSummary, MAX_PLAN_WEEKS, fmtDist,
} from './race';
import { DAY_NAMES, sessionsForWeek, hasChosenDays } from './programs';

const todayISO = () => isoDate(new Date());
const addDays = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return isoDate(d); };
const niceDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const RECENT = ['5k', '10k', 'half', 'marathon'];

// "Train for a Race": distance, date, where you are starting, goal, days. Branches on the answers (a new runner gets a
// run/walk start, a short runway or a big goal gets an honest note, and so on). Calls onSave(program) at the end.
export default function RaceBuilder({ userId, program, weekStartDay, onSave, onDone, onBack }) {
  const old = program?.goal === 'race' ? program.race : null;
  const [step, setStep] = useState('distance');
  const [distance, setDistance] = useState(old?.distance || null);
  const [date, setDate] = useState(old?.date || '');
  const [weeklyId, setWeeklyId] = useState(old?.weeklyId ?? null);
  const [longestId, setLongestId] = useState(old?.longestId ?? null);
  const [recentDist, setRecentDist] = useState(old?.recent?.distance || null);
  const [recentTime, setRecentTime] = useState(old?.recent ? fmtTime(old.recent.seconds) : '');
  const [units, setUnits] = useState(old?.units || 'mi');
  const [goalKind, setGoalKind] = useState(old ? (old.goalSeconds ? 'time' : 'finish') : null);
  const [goalText, setGoalText] = useState(old?.goalSeconds ? fmtTime(old.goalSeconds) : '');
  const [runDays, setRunDays] = useState(old?.runDays || 4);
  const [strength, setStrength] = useState(old?.strength ?? 0);
  const [weekdays, setWeekdays] = useState(program?.goal === 'race' && hasChosenDays(program) ? program.weekdays : []);
  const [longDay, setLongDay] = useState(old?.longDay || 'sun');

  const spec = distance ? RACES[distance] : null;
  const startedAt = todayISO();
  const weeks = date ? weeksBetween(startedAt, date, weekStartDay) : 0;
  const weeklyMi = weeklyId == null ? 0 : WEEKLY_CHOICES[weeklyId].mi;
  const longestMi = longestId == null ? 0 : LONGEST_CHOICES[longestId].mi;
  const level = levelFor({ weeklyMi, longestMi });
  const recentSec = parseTime(recentTime);
  const recent = recentDist && recentSec && recentSec > 120 ? { distance: recentDist, meters: RACES[recentDist].meters, seconds: recentSec } : null;
  const fit = startingVdot({ level, recent });
  const feas = spec && date && weeks >= 1 ? feasibility({ distance, weeks, level }) : null;
  const goalSec = goalKind === 'time' ? parseTime(goalText) : null;
  const gc = spec && weeks > 0 ? goalCheck({ distance, goalSeconds: goalKind === 'time' ? goalSec : null, vdot: fit.vdot, level, weeks }) : null;
  const totalDays = runDays + strength;
  const maxRun = level === 'beginner' ? 4 : 6;

  const draft = () => {
    const race = {
      distance, date, weeks, level, runDays, strength, weeklyMi, longestMi, weeklyId, longestId,
      vdot: fit.vdot, vdotEstimated: fit.estimated, targetVdot: Math.max(fit.vdot, gc?.targetVdot || fit.vdot),
      goalSeconds: goalKind === 'time' && goalSec ? goalSec : null, recent, units, longDay, weekStart: weekStartDay,
    };
    return { goal: 'race', goals: ['race'], model: null, days: totalDays, split: null, weekdays: weekdays.length === totalDays ? weekdays : null, startedAt, race };
  };
  const preview = weekdays.length === totalDays && distance && date ? draft() : null;
  const tile = (on) => ({ background: on ? SKY : INK_3, color: on ? INK : PAPER });
  const Next = ({ to, disabled, label = 'Next', onClick }) => (
    <button disabled={disabled} onClick={onClick || (() => setStep(to))} style={{ background: disabled ? INK_3 : SKY, color: disabled ? TEXT_SOFT : INK }} className="rounded-md px-6 py-2.5 text-sm font-medium flex items-center gap-1.5">{label}</button>
  );
  const Back = ({ to, onClick }) => <button onClick={onClick || (() => setStep(to))} style={{ color: TEXT_SOFT }} className="text-sm py-2">Back</button>;
  const Note = ({ children, warn }) => <div style={{ background: INK_3, color: warn ? BRICK : PAPER_DIM }} className="rounded-md px-3 py-2.5 text-sm mt-3 text-left">{children}</div>;
  const Label = ({ children }) => <div style={{ color: PAPER_DIM }} className="text-sm mb-1.5 text-left">{children}</div>;
  const chips = (list, value, onPick) => (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {list.map((o) => <button key={o.id} onClick={() => onPick(o.id)} style={tile(value === o.id)} className="rounded-full px-3 py-1.5 text-sm font-medium">{o.label}</button>)}
    </div>
  );

  async function start() {
    const next = draft();
    await onSave(next);
    onDone(next);
  }

  const toggleDay = (d) => setWeekdays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : cur.length >= totalDays ? cur : [...cur, d]));
  const setCounts = (r, s) => { setRunDays(r); setStrength(s); setWeekdays((w) => w.slice(0, r + s)); };

  if (step === 'distance') {
    return (
      <>
        <div style={{ color: PAPER_DIM }} className="text-sm mb-2">Which race are we training for?</div>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(RACES).map((r) => (
            <button key={r.id} onClick={() => setDistance(r.id)} style={tile(distance === r.id)} className="rounded-xl px-3 py-3.5 text-base font-medium">🏃 {r.label}</button>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3"><Back onClick={onBack} /><Next to="date" disabled={!distance} /></div>
      </>
    );
  }

  if (step === 'date') {
    const min = addDays(startedAt, 7 * 4);
    const goodDate = dateForWeeks(startedAt, spec.defaultWeeks, weekStartDay, longDay);
    return (
      <>
        <div style={{ color: SKY }} className="text-sm font-medium mb-1">{spec.label} Plan</div>
        <div style={{ color: PAPER_DIM }} className="text-sm mb-2">When is race day?</div>
        <input type="date" value={date} min={min} onChange={(e) => setDate(e.target.value)} style={{ background: INK_3, color: PAPER }} className="w-full rounded-md px-3 py-2.5 text-base text-center" />
        {!date && <button onClick={() => setDate(goodDate)} style={{ color: SKY }} className="text-sm underline mt-2">No date yet? Use {niceDate(goodDate)}</button>}
        {date && weeks >= 1 && <div style={{ color: TEXT_SOFT }} className="text-sm mt-2">{niceDate(date)} · {weeks} week{weeks === 1 ? '' : 's'} of training</div>}
        {feas && feas.status !== 'ok' && weeks > 0 && weeks <= MAX_PLAN_WEEKS && <Note>Pick your starting point next, then I will check this date against it.</Note>}
        {weeks > MAX_PLAN_WEEKS && <Note warn>That is more than {MAX_PLAN_WEEKS} weeks away. Pick a date closer in, and keep your easy running going until then.</Note>}
        <div className="flex items-center justify-between mt-3"><Back to="distance" /><Next to="start" disabled={!date || weeks < 4 || weeks > MAX_PLAN_WEEKS} /></div>
      </>
    );
  }

  if (step === 'start') {
    return (
      <>
        <div style={{ color: SKY }} className="text-sm font-medium mb-0.5">Where Are We Starting?</div>
        <div style={{ color: TEXT_SOFT }} className="text-sm mb-3">A few quick taps so the plan fits you.</div>
        <Label>How much do you run in a normal week?</Label>
        {chips(WEEKLY_CHOICES, weeklyId, setWeeklyId)}
        <Label>What is the longest run you can do comfortably?</Label>
        {chips(LONGEST_CHOICES, longestId, setLongestId)}
        {weeklyId != null && longestId != null && (
          <>
            <Label>A recent race or hard effort <span style={{ color: TEXT_SOFT }}>(optional, sets your paces)</span></Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {RECENT.map((r) => <button key={r} onClick={() => setRecentDist(recentDist === r ? null : r)} style={tile(recentDist === r)} className="rounded-full px-3 py-1.5 text-sm font-medium">{RACES[r].label}</button>)}
            </div>
            {recentDist && <input value={recentTime} onChange={(e) => setRecentTime(e.target.value)} inputMode="numeric" placeholder="Time, like 27:30 or 1:55:00" style={{ background: INK_3, color: PAPER }} className="w-full rounded-md px-3 py-2.5 text-base text-center mb-2" />}
            <div className="flex items-center justify-center gap-2 mt-1">
              <span style={{ color: PAPER_DIM }} className="text-sm">Distances in</span>
              {[{ id: 'mi', label: 'Miles' }, { id: 'km', label: 'Kilometers' }].map((u) => <button key={u.id} onClick={() => setUnits(u.id)} style={tile(units === u.id)} className="rounded-full px-3 py-1 text-sm font-medium">{u.label}</button>)}
            </div>
            <Note>
              You start as a <b>{LEVEL_LABEL[level]}</b> runner{level === 'beginner' ? ': the plan opens with run/walk intervals and builds slowly.' : '.'}{' '}
              {fit.estimated ? 'Without a recent race, paces come from a careful estimate and you can adjust them as you go.' : `Your recent effort puts your fitness at a VDOT of ${fit.vdot}, which sets your training paces.`}
            </Note>
            {feas && feas.status !== 'ok' && <Note warn={feas.status !== 'tight'}>{feas.message}</Note>}
          </>
        )}
        <div className="flex items-center justify-between mt-3"><Back to="date" /><Next to="goal" disabled={weeklyId == null || longestId == null || (feas && (feas.status === 'short' || feas.status === 'far'))} /></div>
        {feas && feas.status === 'short' && <button onClick={() => { setDate(dateForWeeks(startedAt, feas.min, weekStartDay, longDay)); }} style={{ color: SKY }} className="text-sm underline mt-1">Use the earliest date that works ({niceDate(dateForWeeks(startedAt, feas.min, weekStartDay, longDay))})</button>}
      </>
    );
  }

  if (step === 'goal') {
    return (
      <>
        <div style={{ color: SKY }} className="text-sm font-medium mb-1">{spec.label} Plan</div>
        <div style={{ color: PAPER_DIM }} className="text-sm mb-2">What is the goal?</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setGoalKind('finish')} style={tile(goalKind === 'finish')} className="rounded-xl px-3 py-3"><div className="text-base font-medium">Finish Strong</div><div style={{ opacity: 0.85 }} className="text-sm">Enjoy it, no clock</div></button>
          <button onClick={() => setGoalKind('time')} style={tile(goalKind === 'time')} className="rounded-xl px-3 py-3"><div className="text-base font-medium">Hit a Time</div><div style={{ opacity: 0.85 }} className="text-sm">Train to a pace</div></button>
        </div>
        {goalKind === 'time' && (
          <>
            <input value={goalText} onChange={(e) => setGoalText(e.target.value)} inputMode="numeric" placeholder={distance === 'marathon' ? 'Goal time, like 4:15:00' : distance === 'half' ? 'Goal time, like 1:59:00' : 'Goal time, like 28:30'} style={{ background: INK_3, color: PAPER }} className="w-full rounded-md px-3 py-2.5 text-base text-center mt-3" />
            {goalSec && gc && <Note warn={gc.status === 'stretch'}>{gc.message}{gc.status !== 'stretch' ? ` Race pace: ${fmtPace((goalSec / spec.meters) * 1609.344, units)} /${units}.` : ''}</Note>}
            {goalText && !goalSec && <Note warn>Type the time like 28:30 or 1:55:00.</Note>}
          </>
        )}
        {goalKind === 'finish' && gc && <Note>At your fitness, a finish near {fmtTime(gc.predictedSeconds)} is realistic. Paces in the plan are set for finishing comfortably.</Note>}
        <div className="flex items-center justify-between mt-3"><Back to="start" /><Next to="days" disabled={!goalKind || (goalKind === 'time' && !goalSec)} /></div>
      </>
    );
  }

  // days
  const p = paces(fit.vdot, spec.meters);
  return (
    <>
      <div style={{ color: SKY }} className="text-sm font-medium mb-1">{spec.label} Plan</div>
      <Label>How many days a week can you run?</Label>
      <div className="flex justify-center gap-2 mb-3">
        {[3, 4, 5, 6].filter((n) => n <= maxRun).map((n) => <button key={n} onClick={() => setCounts(n, strength)} style={tile(runDays === n)} className="w-12 h-12 rounded-xl text-lg font-medium">{n}</button>)}
      </div>
      <Label>Runner strength days <span style={{ color: TEXT_SOFT }}>(optional, helps prevent injury)</span></Label>
      <div className="flex justify-center gap-2 mb-3">
        {[0, 1, 2].map((n) => <button key={n} onClick={() => setCounts(runDays, n)} style={tile(strength === n)} className="w-12 h-12 rounded-xl text-lg font-medium">{n}</button>)}
      </div>
      <Label>Which days will you train?</Label>
      <div className="flex justify-center gap-1.5 mb-1">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => {
          const on = weekdays.includes(d); const full = weekdays.length >= totalDays;
          return <button key={d} onClick={() => toggleDay(d)} style={{ ...tile(on), opacity: !on && full ? 0.45 : 1 }} className="w-11 h-12 rounded-xl text-sm font-medium">{DAY_NAMES[d]}</button>;
        })}
      </div>
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-2">{weekdays.length === totalDays ? 'Your runs will show up on the Birdseye calendar.' : `Pick ${totalDays - weekdays.length} more day${totalDays - weekdays.length === 1 ? '' : 's'}.`}</div>
      <div className="flex items-center justify-center gap-2 mb-1">
        <span style={{ color: PAPER_DIM }} className="text-sm">Long run on</span>
        {[{ id: 'sat', label: 'Saturday' }, { id: 'sun', label: 'Sunday' }].map((o) => <button key={o.id} onClick={() => setLongDay(o.id)} style={tile(longDay === o.id)} className="rounded-full px-3 py-1 text-sm font-medium">{o.label}</button>)}
      </div>
      {preview && <ReviewCard program={preview} paces={p} />}
      <div className="flex items-center justify-between mt-3">
        <Back to="goal" />
        <Next disabled={weekdays.length !== totalDays} onClick={start} label={<><Check size={14} /> {program ? 'Save Plan' : 'Start Plan'}</>} />
      </div>
    </>
  );
}

function ReviewCard({ program, paces: p }) {
  const r = program.race;
  const sum = raceSummary(r);
  const u = r.units;
  const first = sessionsForWeek(program, 1).slice(0, 3);
  return (
    <div style={{ background: INK_3 }} className="rounded-md px-3 py-2.5 text-sm mt-3 text-left space-y-1">
      <div style={{ color: PAPER }} className="font-medium">{sum.weeks} weeks to {niceDate(r.date)}</div>
      <div style={{ color: PAPER_DIM }}>{sum.startsRunWalk ? 'Starts with run/walk intervals. ' : ''}Builds to about {fmtDist(sum.peakMiles, u, 0)} a week, longest run {fmtDist(sum.longestRun, u, 0)}, then a taper.</div>
      <div style={{ color: PAPER_DIM }}>Easy pace {fmtPace(p.easy[0], u)}–{fmtPace(p.easy[1], u)} /{u} · {RACES[r.distance].label} pace {fmtPace(p.race, u)} /{u}</div>
      {first.length > 0 && <div style={{ color: TEXT_SOFT }}>Week 1: {first.map((s) => `${DAY_NAMES[s.day]} ${s.shortName}`).join(', ')}</div>}
    </div>
  );
}
