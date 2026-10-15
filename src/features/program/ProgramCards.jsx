import React, { useMemo } from 'react';
import { Check, Pencil, Play, ListChecks } from '../../lib/icons';
import { useProgramProgress } from './useProgram';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY, LIME } from '../../theme';
import { GOALS, DAY_NAMES, hasChosenDays, normalizeMoves, programTitle, weekNumber, phaseLabel, sessionsForWeek, prescriptionLine, accessoryLine } from './programs';

// This week's sessions with done / next flags, from this week's logged workouts.
export function useProgramWeek(userId, program, active, refreshKey, weekStartDay) {
  const done = useProgramProgress(userId, program, active, refreshKey, weekStartDay);
  return useMemo(() => {
    if (!program) return null;
    const week = weekNumber(program, new Date(), weekStartDay);
    let r = 0; let a = 0;
    const moves = normalizeMoves(program, weekStartDay);
    const sessions = sessionsForWeek(program, week).map((s0) => {
      // A moved session shows the weekday it was moved to.
      const s = moves[s0.id] ? { ...s0, day: new Date(`${moves[s0.id]}T12:00:00`).getDay() } : s0;
      const isDone = s.kind === 'aerobic' ? a++ < done.aerobic : r++ < done.resistance;
      return { ...s, done: isDone };
    });
    const next = sessions.find((s) => !s.done) || null;
    // The session being logged right now.
    if (next && done.inProgress && (done.inProgress === 'aerobic') === (next.kind === 'aerobic')) next.inProgress = true;
    return { week, sessions, next, doneCount: sessions.filter((s) => s.done).length, label: phaseLabel(program, week) };
  }, [program, done.resistance, done.aerobic, done.inProgress, weekStartDay]);
}

function sessionDetail(s) {
  if (s.kind === 'aerobic') return `${s.minutes} min · RPE 5–6 · easy, steady pace`;
  return `${s.exercises} exercises · ${prescriptionLine(s)}`;
}

// Move: a slim card with the next session and a one-tap start.
export function MoveProgramCard({ program, week, onStart, onManage }) {
  if (!program || !week) return null;
  const s = week.next;
  return (
    <div style={{ background: INK_2, borderTop: `2px solid ${SKY}` }} className="rounded-lg px-4 py-3 mb-2 text-center">
      <div className="flex items-center justify-between mb-1">
        <span className="w-5" />
        <span style={{ color: SKY }} className="text-sm uppercase tracking-wide font-bold">{(GOALS.find((g) => g.id === program.goal) || { label: 'Training' }).label} Program</span>
        <button onClick={onManage} style={{ color: TEXT_SOFT }} className="p-1 -m-1" aria-label="Manage program"><Pencil size={14} /></button>
      </div>
      {s ? (
        <>
          <div style={{ color: PAPER }} className="text-base font-medium">{s.name}</div>
          <div style={{ color: TEXT_SOFT }} className="text-sm">{sessionDetail(s)}</div>
          {accessoryLine(s) && <div style={{ color: TEXT_SOFT }} className="text-sm">{accessoryLine(s)}</div>}
          <div className="flex items-center justify-between gap-3 mt-2">
            <span style={{ color: TEXT_SOFT }} className="text-sm text-left">{week.label}<br />{week.doneCount} of {week.sessions.length} done</span>
            <button onClick={() => onStart(s)} style={{ background: SKY, color: INK }} className="rounded-md px-5 py-2 text-sm font-medium inline-flex items-center gap-1.5">
              <Play size={14} /> Start Session
            </button>
          </div>
        </>
      ) : (
        <div style={{ color: PAPER_DIM }} className="text-sm py-1">All {week.sessions.length} sessions done this week. Nice work!<br /><span style={{ color: TEXT_SOFT }}>{week.label}</span></div>
      )}
    </div>
  );
}

// Move, no program yet: a quiet one-line way in.
export function MoveProgramLink({ onOpen }) {
  return (
    <button onClick={onOpen} style={{ color: TEXT_SOFT }} className="w-full mt-3 text-sm flex items-center justify-center gap-1.5 py-1.5">
      <ListChecks size={14} /> Follow a training program <span style={{ opacity: 0.7 }}>(optional)</span>
    </button>
  );
}

// Birdseye: a slim look at the week (the details live in Move). Days with a check are done; the next
// one is highlighted, with a one-tap Start.
export function ProgramWeekCard({ program, week, onStart, onManage, onPickDays }) {
  if (!program || !week) return null;
  const next = week.next;
  const today = new Date().getDay();
  return (
    <div style={{ background: INK_2, borderTop: `2px solid ${LIME}` }} className="rounded-lg px-4 py-3 text-center">
      <div className="flex items-center justify-between">
        <span className="w-5" />
        <span style={{ color: LIME }} className="text-sm uppercase tracking-wide font-bold">{(GOALS.find((g) => g.id === program.goal) || { label: 'Training' }).label} Program</span>
        <button onClick={onManage} style={{ color: TEXT_SOFT }} className="p-1 -m-1" aria-label="Manage program"><Pencil size={14} /></button>
      </div>
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-2">{program.goal === 'hypertrophy' ? `${program.model === 'linear' ? 'Linear' : 'Undulating'} · ` : ''}{week.doneCount} of {week.sessions.length} done</div>
      {!hasChosenDays(program) && onPickDays && (
        <button onClick={onPickDays} style={{ background: LIME, color: INK }} className="w-full rounded-md py-2 text-sm font-medium mb-2">
          Pick your training days
        </button>
      )}
      <div className="flex gap-1.5">
        {week.sessions.map((s) => {
          const isNext = next && next.id === s.id;
          return (
            <div
              key={s.id}
              style={{ background: isNext ? LIME : INK_3, color: isNext ? INK : s.done ? TEXT_SOFT : PAPER, outline: s.day === today && !isNext ? `1.5px solid ${LIME}` : 'none' }}
              className="flex-1 min-w-0 rounded-md py-1.5 px-0.5 text-sm font-medium leading-tight flex items-center justify-center gap-1"
            >
              {DAY_NAMES[s.day]}{s.done && <Check size={12} />}
            </div>
          );
        })}
      </div>
      {next ? (
        <div className="flex items-center justify-between gap-3 text-left mt-2">
          <div style={{ color: PAPER }} className="min-w-0 truncate text-sm font-medium">Next: {DAY_NAMES[next.day]} · {next.kind === 'aerobic' ? 'Cardio' : next.name}</div>
          {next.inProgress ? (
            <span style={{ color: LIME }} className="shrink-0 text-sm font-medium">In progress</span>
          ) : (
            <button onClick={() => onStart(next)} style={{ background: LIME, color: INK }} className="shrink-0 rounded-md px-3.5 py-1.5 text-sm font-medium inline-flex items-center gap-1.5">
              <Play size={14} /> Start
            </button>
          )}
        </div>
      ) : (
        <div style={{ color: PAPER_DIM }} className="text-sm mt-2">All {week.sessions.length} sessions done this week. Nice work!</div>
      )}
    </div>
  );
}
