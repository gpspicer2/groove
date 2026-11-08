import React, { useState } from 'react';
import { Check } from '../../lib/icons';
import { INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY, BRICK, INK } from '../../theme';
import { weeksBetween, isoDate } from './race';
import { DAY_NAMES, hasChosenDays, isContest, contestPhase, sessionsForWeek } from './programs';

const todayISO = () => isoDate(new Date());
const addDays = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return isoDate(d); };
const niceDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const MIN_WEEKS = 8;
const MAX_WEEKS = 30;

// "Contest Prep" (bodybuilding): a show date, how many lifting and cardio days, and which weekdays. The plan is a
// hypertrophy + cardio program whose phases follow the weeks left before the show (Prep, Late Prep, Final Push, Peak Week).
// Calls onSave(program) at the end.
export default function ContestBuilder({ program, weekStartDay, hrOn, onSave, onDone, onBack }) {
  const old = isContest(program) ? program.contest : null;
  const [step, setStep] = useState('date');
  const [date, setDate] = useState(old?.show || '');
  const [lift, setLift] = useState(old?.liftDays || 4);
  const [cardio, setCardio] = useState(old?.cardioDays ?? 2);
  const [weekdays, setWeekdays] = useState(isContest(program) && hasChosenDays(program) ? program.weekdays : []);
  const [guide, setGuide] = useState(program?.guide || (hrOn ? 'hr' : 'rpe'));

  const startedAt = isContest(program) ? program.startedAt : todayISO();
  const weeks = date ? weeksBetween(startedAt, date, weekStartDay) : 0;
  const total = lift + cardio;
  const draft = () => ({
    goal: 'hypertrophy', goals: ['hypertrophy', 'fitness'], model: null, days: total, split: null, guide,
    weekdays: weekdays.length === total ? weekdays : null, startedAt,
    ...(isContest(program) && program.startMinutes ? { startMinutes: program.startMinutes } : {}),
    contest: { show: date, weeks, liftDays: lift, cardioDays: cardio },
  });
  const tile = (on) => ({ background: on ? SKY : INK_3, color: on ? INK : PAPER });
  const Next = ({ to, disabled, label = 'Next', onClick }) => (
    <button disabled={disabled} onClick={onClick || (() => setStep(to))} style={{ background: disabled ? INK_3 : SKY, color: disabled ? TEXT_SOFT : INK }} className="rounded-md px-6 py-2.5 text-sm font-medium flex items-center gap-1.5">{label}</button>
  );
  const Back = ({ to, onClick }) => <button onClick={onClick || (() => setStep(to))} style={{ color: TEXT_SOFT }} className="text-sm py-2">Back</button>;
  const Note = ({ children, warn }) => <div style={{ background: INK_3, color: warn ? BRICK : PAPER_DIM }} className="rounded-md px-3 py-2.5 text-sm mt-3 text-left">{children}</div>;
  const Label = ({ children }) => <div style={{ color: PAPER_DIM }} className="text-sm mb-1.5 text-left">{children}</div>;
  const setCounts = (l, c) => { setLift(l); setCardio(c); setWeekdays((w) => w.slice(0, l + c)); };
  const toggleDay = (d) => setWeekdays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : cur.length >= total ? cur : [...cur, d]));

  async function start() {
    const next = draft();
    await onSave(next);
    onDone(next);
  }

  if (step === 'date') {
    const min = addDays(startedAt, 7 * (MIN_WEEKS - 1));
    return (
      <>
        <div style={{ color: PAPER_DIM }} className="text-sm mb-2">When is the show?</div>
        <input type="date" value={date} min={min} onChange={(e) => setDate(e.target.value)} style={{ background: INK_3, color: PAPER }} className="w-full rounded-md px-3 py-2.5 text-base text-center" />
        {date && weeks >= MIN_WEEKS && weeks <= MAX_WEEKS && <div style={{ color: TEXT_SOFT }} className="text-sm mt-2">{niceDate(date)} · {weeks} weeks of prep</div>}
        {date && weeks < MIN_WEEKS && <Note warn>That is under {MIN_WEEKS} weeks away. A shorter runway can not be built safely here. Pick a later show, or talk it through with Greg.</Note>}
        {weeks > MAX_WEEKS && <Note warn>That is more than {MAX_WEEKS} weeks away. Pick a date closer in and come back, or build a regular Hypertrophy program until then.</Note>}
        <Note>Contest prep is demanding. Check with your doctor first. Groove plans your lifting and cardio. It does not give diet, water or sodium advice.</Note>
        <div className="flex items-center justify-between mt-3"><Back onClick={onBack} /><Next to="days" disabled={!date || weeks < MIN_WEEKS || weeks > MAX_WEEKS} /></div>
      </>
    );
  }

  const first = ['Prep', 'Late Prep', 'Final Push', 'Peak Week'].map((n) => ({ n, weeks: Array.from({ length: weeks }, (_, i) => i + 1).filter((w) => contestPhase({ contest: { weeks } }, w).name === n).length })).filter((x) => x.weeks > 0);
  const preview = weekdays.length === total ? draft() : null;
  const wk1 = preview ? sessionsForWeek(preview, 1).slice(0, 4) : [];
  return (
    <>
      <Label>How many days a week will you lift?</Label>
      <div className="flex justify-center gap-2 mb-3">
        {[3, 4, 5].filter((n) => n + cardio <= 6).map((n) => <button key={n} onClick={() => setCounts(n, cardio)} style={tile(lift === n)} className="w-12 h-12 rounded-xl text-lg font-medium">{n}</button>)}
      </div>
      <Label>And how many cardio days?</Label>
      <div className="flex justify-center gap-2 mb-3">
        {[1, 2, 3].filter((n) => lift + n <= 6).map((n) => <button key={n} onClick={() => setCounts(lift, n)} style={tile(cardio === n)} className="w-12 h-12 rounded-xl text-lg font-medium">{n}</button>)}
      </div>
      <Label>Which days will you train?</Label>
      <div className="flex justify-center gap-1.5 mb-1">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => {
          const on = weekdays.includes(d); const full = weekdays.length >= total;
          return <button key={d} onClick={() => toggleDay(d)} style={{ ...tile(on), opacity: !on && full ? 0.45 : 1 }} className="w-11 h-12 rounded-xl text-sm font-medium">{DAY_NAMES[d]}</button>;
        })}
      </div>
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-2">{weekdays.length === total ? 'Your sessions will show up on the Birdseye calendar.' : `Pick ${total - weekdays.length} more day${total - weekdays.length === 1 ? '' : 's'}.`}</div>
      <div className="flex items-center justify-center gap-2 mb-1">
        <span style={{ color: PAPER_DIM }} className="text-sm">Guide cardio by</span>
        {[{ id: 'hr', label: 'Heart Rate' }, { id: 'rpe', label: 'Effort' }].map((o) => <button key={o.id} onClick={() => setGuide(o.id)} style={tile(guide === o.id)} className="rounded-full px-3 py-1 text-sm font-medium">{o.label}</button>)}
      </div>
      <div style={{ background: INK_3 }} className="rounded-md px-3 py-2.5 text-sm mt-3 text-left space-y-1">
        <div style={{ color: PAPER }} className="font-medium">{weeks} weeks to {niceDate(date)}</div>
        <div style={{ color: PAPER_DIM }}>{first.map((x) => `${x.n} ${x.weeks}w`).join(' → ')}</div>
        <div style={{ color: PAPER_DIM }}>Lifting stays heavy while cardio builds, volume trims in the Final Push, and Peak Week tapers.</div>
        {wk1.length > 0 && <div style={{ color: TEXT_SOFT }}>Week 1: {wk1.map((s) => `${DAY_NAMES[s.day]} ${s.kind === 'aerobic' ? 'Cardio' : s.shortName}`).join(', ')}</div>}
      </div>
      <div className="flex items-center justify-between mt-3">
        <Back to="date" />
        <Next disabled={weekdays.length !== total} onClick={start} label={<><Check size={14} /> {program ? 'Save Plan' : 'Start Plan'}</>} />
      </div>
    </>
  );
}
