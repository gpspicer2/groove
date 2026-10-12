import React, { useState, useMemo } from 'react';
import { Check, Pencil, Play, ListChecks } from '../../lib/icons';
import { useProgramProgress } from './useProgram';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY, LIME } from '../../theme';
import { DAY_NAMES, programTitle, weekNumber, phaseLabel, sessionsForWeek, prescriptionLine, accessoryLine } from './programs';

// This week's sessions with done / next flags, from this week's logged workouts.
export function useProgramWeek(userId, program, active, refreshKey, weekStartDay) {
  const done = useProgramProgress(userId, program, active, refreshKey, weekStartDay);
  return useMemo(() => {
    if (!program) return null;
    const week = weekNumber(program, new Date(), weekStartDay);
    let r = 0; let a = 0;
    const sessions = sessionsForWeek(program, week).map((s) => {
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
        <span style={{ color: SKY }} className="text-sm uppercase tracking-wide font-bold">{programTitle(program)}</span>
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

// Birdseye: the week laid out on suggested days, tap a day to see and start it.
export function ProgramWeekCard({ userId, program, active, weekStartDay, refreshKey, onStart, onManage }) {
  const week = useProgramWeek(userId, program, active, refreshKey, weekStartDay);
  const [picked, setPicked] = useState(null);
  if (!program || !week) return null;
  const shown = week.sessions.find((s) => s.id === picked) || week.next || week.sessions[week.sessions.length - 1];
  const today = new Date().getDay();
  return (
    <div style={{ background: INK_2, borderTop: `2px solid ${LIME}` }} className="rounded-lg px-4 py-3 text-center">
      <div className="flex items-center justify-between mb-0.5">
        <span className="w-5" />
        <span style={{ color: LIME }} className="text-sm uppercase tracking-wide font-bold">{programTitle(program)}</span>
        <button onClick={onManage} style={{ color: TEXT_SOFT }} className="p-1 -m-1" aria-label="Manage program"><Pencil size={14} /></button>
      </div>
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-2">{week.label} · {week.doneCount} of {week.sessions.length} done</div>
      <div className="flex gap-1.5 mb-2">
        {week.sessions.map((s) => {
          const on = shown?.id === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setPicked(s.id)}
              style={{ background: on ? LIME : INK_3, color: on ? INK : PAPER, outline: s.day === today && !on ? `1.5px solid ${LIME}` : 'none' }}
              className="flex-1 min-w-0 rounded-md py-1.5 px-0.5"
            >
              <div className="text-sm font-medium leading-tight">{DAY_NAMES[s.day]}</div>
              <div className="text-xs leading-tight truncate opacity-90">{s.done ? <Check size={11} className="inline" /> : (s.kind === 'aerobic' ? 'Cardio' : (s.shortName || s.name).replace('Full Body ', 'Full '))}</div>
            </button>
          );
        })}
      </div>
      {shown && (
        <div className="flex items-center justify-between gap-3 text-left">
          <div className="min-w-0">
            <div style={{ color: PAPER }} className="text-sm font-medium">{shown.name}{shown.done ? ' · done' : ''}</div>
            <div style={{ color: TEXT_SOFT }} className="text-sm">{sessionDetail(shown)}</div>
            {accessoryLine(shown) && <div style={{ color: TEXT_SOFT }} className="text-sm">{accessoryLine(shown)}</div>}
          </div>
          {!shown.done && shown.inProgress && (
            <span style={{ color: LIME }} className="shrink-0 text-sm font-medium">In progress</span>
          )}
          {!shown.done && !shown.inProgress && (
            <button onClick={() => onStart(shown)} style={{ background: LIME, color: INK }} className="shrink-0 rounded-md px-3.5 py-2 text-sm font-medium inline-flex items-center gap-1.5">
              <Play size={14} /> Start
            </button>
          )}
        </div>
      )}
    </div>
  );
}
