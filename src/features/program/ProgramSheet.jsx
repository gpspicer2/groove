import React, { useState } from 'react';
import { useArmed } from '../../lib/useArmed';
import Portal from '../../Portal';
import { X, Check } from '../../lib/icons';
import { supabase } from '../../lib/supabaseClient';
import { useSwipeDown, GRAB_BAR_CLASS } from '../../lib/swipeDown';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY, BRICK } from '../../theme';
import {
  GOALS, MODELS, GOAL_INFO, MODEL_INFO, DAY_NAMES, programTitle, resistanceDays, weekNumber, phaseLabel,
  sessionsForWeek, prescriptionLine, accessoryLine, splitOptions, chosenSplit, hasChosenDays,
} from './programs';

const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function WeekList({ program, week }) {
  const sessions = sessionsForWeek(program, week);
  return (
    <div className="space-y-1.5 text-left">
      {sessions.map((s) => (
        <div key={s.id} style={{ background: INK_3 }} className="rounded-md px-3 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <span style={{ color: PAPER }} className="text-sm font-medium">{s.name}</span>
            <span style={{ color: TEXT_SOFT }} className="text-sm">{DAY_NAMES[s.day]}</span>
          </div>
          <div style={{ color: TEXT_SOFT }} className="text-sm">
            {s.kind === 'aerobic' ? `${s.minutes} min moderate · RPE 5–6` : `${s.exercises} exercises · ${prescriptionLine(s)}`}
          </div>
          {accessoryLine(s) && <div style={{ color: TEXT_SOFT }} className="text-sm">{accessoryLine(s)}</div>}
        </div>
      ))}
    </div>
  );
}

// Pick a program (goal, method, days a week) or manage the one in progress.
export default function ProgramSheet({ userId, program, onSave, onClose, weekStartDay, initialStep }) {
  const arm = useArmed();
  const sheet = useSwipeDown(onClose);
  const [step, setStep] = useState(initialStep || (program ? 'manage' : 'goal'));
  const [goal, setGoal] = useState(program?.goal || null);
  const [model, setModel] = useState(program?.model || null);
  const [days, setDays] = useState(program?.days || 3);
  const [split, setSplit] = useState(program?.split || null);
  const [weekdays, setWeekdays] = useState(hasChosenDays(program) ? program.weekdays : []);

  const draftBase = { goal, model: goal === 'hypertrophy' ? (model || 'undulating') : null, days, startedAt: todayISO() };
  const options = goal ? splitOptions(draftBase) : [];
  const splitId = options.find((o) => o.id === split)?.id || options[0]?.id || null;
  const draft = { ...draftBase, split: splitId, weekdays: weekdays.length === days ? weekdays : null };

  async function start() {
    // Changing only the days or split keeps your place in the cycle; a new goal or method starts fresh.
    const sameCycle = program && program.goal === draft.goal && (program.model || null) === (draft.model || null);
    const next = { ...draft, startedAt: sameCycle ? program.startedAt : draft.startedAt };
    await onSave(next);
    // Lifting days a week become the resistance goal on Birdseye.
    await supabase.from('profiles').update({ resistance_goal: resistanceDays(next), track_resistance_goal: true }).eq('id', userId);
    onClose();
  }
  async function end() {
    await onSave(null);
    onClose();
  }

  const tile = (on) => ({ background: on ? SKY : INK_3, color: on ? INK : PAPER });
  const back = (to) => <button onClick={() => setStep(to)} style={{ color: TEXT_SOFT }} className="text-sm py-2">Back</button>;

  return (
    <Portal>
      <div style={{ background: 'rgba(0,0,0,0.5)' }} className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
        <div ref={sheet.ref} {...sheet.handlers} style={{ background: INK_2, ...sheet.style }} className="w-full max-w-md rounded-t-2xl px-5 py-4 max-h-[92vh] overflow-y-auto text-center" onClick={(e) => e.stopPropagation()}>
          <div style={{ background: TEXT_SOFT, opacity: 0.45 }} className={GRAB_BAR_CLASS} />
          <div className="flex items-center justify-between mb-3">
            <span className="w-6" />
            <h2 style={{ color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="text-lg font-medium">{step === 'manage' ? 'Your Program' : 'Choose a Program'}</h2>
            <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-1 -m-1" aria-label="Close"><X size={20} /></button>
          </div>

          {step === 'manage' && program && (() => {
            const week = weekNumber(program, new Date(), weekStartDay);
            return (
              <>
                <div style={{ color: SKY }} className="text-base font-medium">{programTitle(program)}</div>
                <div style={{ color: TEXT_SOFT }} className="text-sm mb-3">{program.days} days a week{chosenSplit(program) ? ` · ${chosenSplit(program).label}` : ''} · {phaseLabel(program, week)}</div>
                <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-1.5">This week</div>
                <WeekList program={program} week={week} />
                <button onClick={() => setStep('weekdays')} style={{ background: INK_3, color: PAPER }} className="w-full rounded-md py-2.5 text-sm font-medium mt-3">
                  {hasChosenDays(program) ? 'Change Training Days' : 'Pick Your Training Days'}
                </button>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button onClick={() => setStep('goal')} style={{ background: INK_3, color: PAPER }} className="rounded-md py-2.5 text-sm font-medium">Change Program</button>
                  <button onClick={() => arm.press('end', end)} data-armed={arm.armed === 'end'} style={arm.armed === 'end' ? { background: BRICK, color: PAPER } : { background: INK_3, color: BRICK }} className="rounded-md py-2.5 text-sm font-medium">{arm.armed === 'end' ? 'Tap again to end (workouts stay)' : 'End Program'}</button>
                </div>
              </>
            );
          })()}

          {step === 'goal' && (
            <>
              <div style={{ color: PAPER_DIM }} className="text-sm mb-2">What are you training for?</div>
              <div className="space-y-2">
                {GOALS.map((g) => (
                  <button key={g.id} onClick={() => { setGoal(g.id); if (g.id !== 'hypertrophy') setModel(null); }} style={tile(goal === g.id)} className="w-full rounded-xl px-4 py-3">
                    <div className="text-base font-medium">{g.emoji} {g.label}</div>
                    <div style={{ opacity: 0.85 }} className="text-sm">{g.blurb}</div>
                  </button>
                ))}
              </div>
              {goal && <div style={{ background: INK_3, color: PAPER_DIM }} className="rounded-md px-3 py-2.5 text-sm mt-3">{GOAL_INFO[goal]}</div>}
              <div className="flex items-center justify-between mt-3">
                {program ? back('manage') : <span />}
                <button
                  disabled={!goal}
                  onClick={() => setStep(goal === 'hypertrophy' ? 'model' : 'days')}
                  style={{ background: goal ? SKY : INK_3, color: goal ? INK : TEXT_SOFT }}
                  className="rounded-md px-6 py-2.5 text-sm font-medium"
                >
                  Next
                </button>
              </div>
            </>
          )}

          {step === 'model' && (
            <>
              <div style={{ color: PAPER_DIM }} className="text-sm mb-2">How should the weeks progress?</div>
              <div className="space-y-2">
                {MODELS.map((m) => (
                  <button key={m.id} onClick={() => setModel(m.id)} style={tile(model === m.id)} className="w-full rounded-xl px-4 py-3">
                    <div className="text-base font-medium">{m.label}</div>
                    <div style={{ opacity: 0.85 }} className="text-sm">{m.blurb}</div>
                  </button>
                ))}
              </div>
              {model && <div style={{ background: INK_3, color: PAPER_DIM }} className="rounded-md px-3 py-2.5 text-sm mt-3">{MODEL_INFO[model]}</div>}
              <div className="flex items-center justify-between mt-3">
                {back('goal')}
                <button disabled={!model} onClick={() => setStep('days')} style={{ background: model ? SKY : INK_3, color: model ? INK : TEXT_SOFT }} className="rounded-md px-6 py-2.5 text-sm font-medium">Next</button>
              </div>
            </>
          )}

          {step === 'days' && goal && (
            <>
              <div style={{ color: SKY }} className="text-sm font-medium mb-1">{programTitle(draft)}</div>
              <div style={{ color: PAPER_DIM }} className="text-sm mb-2">How many days a week can you train?</div>
              <div className="flex justify-center gap-2 mb-1">
                {[2, 3, 4, 5, 6].map((n) => (
                  <button key={n} onClick={() => { setDays(n); setSplit(null); setWeekdays((w) => w.slice(0, n)); }} style={tile(days === n)} className="w-12 h-12 rounded-xl text-lg font-medium">{n}</button>
                ))}
              </div>
              <div style={{ color: TEXT_SOFT }} className="text-sm mb-3">
                {goal === 'fat_loss' ? `${resistanceDays(draft)} lifting days and ${days - resistanceDays(draft)} cardio day${days - resistanceDays(draft) === 1 ? '' : 's'} a week` : 'Pick what you can keep up. Consistency beats ambition.'}
              </div>
              {options.length > 0 && (
                <>
                  <div style={{ color: PAPER_DIM }} className="text-sm mb-1.5">Choose a split <span style={{ color: TEXT_SOFT }}>(best supported first)</span></div>
                  <div className="space-y-1.5 mb-2">
                    {options.map((o) => (
                      <button key={o.id} onClick={() => setSplit(o.id)} style={tile(splitId === o.id)} className="w-full rounded-xl px-3 py-2 text-left">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium">{o.label}</span>
                          <span style={{ opacity: 0.85 }} className="text-xs whitespace-nowrap">{o.tag}</span>
                        </div>
                        <div style={{ opacity: 0.85 }} className="text-sm">{o.freq}</div>
                      </button>
                    ))}
                  </div>
                  <div style={{ background: INK_3, color: PAPER_DIM }} className="rounded-md px-3 py-2 text-sm mb-3">{chosenSplit(draft).info}</div>
                </>
              )}
              <WeekList program={draft} week={1} />
              <div style={{ color: TEXT_SOFT }} className="text-sm mt-2">Your resistance goal on Birdseye becomes {resistanceDays(draft)} day{resistanceDays(draft) === 1 ? '' : 's'} a week.</div>
              <div className="flex items-center justify-between mt-3">
                {back(goal === 'hypertrophy' ? 'model' : 'goal')}
                <button onClick={() => setStep('weekdays')} style={{ background: SKY, color: INK }} className="rounded-md px-6 py-2.5 text-sm font-medium">Next</button>
              </div>
            </>
          )}

          {step === 'weekdays' && goal && (
            <>
              <div style={{ color: SKY }} className="text-sm font-medium mb-1">{programTitle(draft)}</div>
              <div className="flex items-center justify-center gap-2 mb-3">
                <span style={{ color: PAPER_DIM }} className="text-sm whitespace-nowrap">Days a week</span>
                {[2, 3, 4, 5, 6].map((n) => (
                  <button key={n} onClick={() => { setDays(n); setSplit(null); setWeekdays((w) => w.slice(0, n)); }} style={tile(days === n)} className="w-8 h-8 rounded-full text-sm font-medium shrink-0">{n}</button>
                ))}
              </div>
              <div style={{ color: PAPER_DIM }} className="text-sm mb-2">Which days will you train?</div>
              <div className="flex justify-center gap-1.5 mb-1">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                  const on = weekdays.includes(d);
                  const full = weekdays.length >= days;
                  return (
                    <button
                      key={d}
                      onClick={() => setWeekdays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : cur.length >= days ? cur : [...cur, d]))}
                      style={{ ...tile(on), opacity: !on && full ? 0.45 : 1 }}
                      className="w-11 h-12 rounded-xl text-sm font-medium"
                    >
                      {DAY_NAMES[d]}
                    </button>
                  );
                })}
              </div>
              <div style={{ color: TEXT_SOFT }} className="text-sm mb-3">
                {weekdays.length === days ? 'Your sessions will show up on the Birdseye calendar.' : `Pick ${days - weekdays.length} more day${days - weekdays.length === 1 ? '' : 's'}.`}
              </div>
              {weekdays.length === days && <WeekList program={draft} week={1} />}
              <div style={{ color: TEXT_SOFT }} className="text-sm mt-2">Your resistance goal on Birdseye becomes {resistanceDays(draft)} day{resistanceDays(draft) === 1 ? '' : 's'} a week.</div>
              <div className="flex items-center justify-between mt-3">
                {back('days')}
                <button
                  disabled={weekdays.length !== days}
                  onClick={start}
                  style={{ background: weekdays.length === days ? SKY : INK_3, color: weekdays.length === days ? INK : TEXT_SOFT }}
                  className="rounded-md px-6 py-2.5 text-sm font-medium flex items-center gap-1.5"
                >
                  <Check size={14} /> {program ? 'Save Program' : 'Start Program'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}
