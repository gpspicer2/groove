import React, { useMemo, useState } from 'react';
import { Check, Pencil, Play, ListChecks, ChevronDown, ChevronUp } from '../../lib/icons';
import { useProgramProgress } from './useProgram';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY, LIME } from '../../theme';
import { GOALS, DAY_NAMES, chosenSplit, cycleLength, hasChosenDays, normalizeMoves, programTitle, weekNumber, phaseLabel, sessionsForWeek, prescriptionLine, accessoryLine } from './programs';

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

// Move: the program at a glance. Phase and week, the next session with its sets and reps and a one-tap
// Start, and one line of progress (sessions this week, pounds lifted since the program began).
// One line about what a session trains: the muscles, plus the day's flavor when it has one (Heavy, Light...).
function sessionBlurb(x) {
  if (x.kind === 'aerobic') return 'Cardio · steady, easy pace';
  const parts = [...new Set(x.groups || [])];
  return `${x.label && !/Deload/.test(x.name) ? `${x.label} · ` : ''}${parts.join(', ')}`;
}

const LS_OPEN = 'groove:programOpen';
function readOpen() { try { return localStorage.getItem(LS_OPEN) === '1'; } catch { return false; } }

// Move: the program in full. Collapsed it is one tidy card (exact program, week, days, next session + Start).
// Tap the header to open every session this week with its muscles and sets, and the shape of the cycle.
export function MoveProgramCard({ program, week, lifted = 0, flex = null, onStart, onManage }) {
  const [open, setOpen] = useState(readOpen);
  if (!program || !week) return null;
  const toggle = () => setOpen((v) => { const n = !v; try { localStorage.setItem(LS_OPEN, n ? '1' : '0'); } catch { /* storage blocked */ } return n; });
  const s = week.next;
  const goal = (GOALS.find((g) => g.id === program.goal) || { label: 'Training' }).label;
  const split = chosenSplit(program);
  const model = program.goal === 'hypertrophy' ? (program.model === 'linear' ? 'Linear' : 'Undulating') : null;
  const exact = [model, split ? split.label : null, `${program.days} days a week`].filter(Boolean).join(' · ');
  const today = new Date().getDay();
  const acc = s && s.kind !== 'aerobic' ? accessoryLine(s) : '';
  const len = cycleLength(program);
  return (
    <div style={{ background: INK_2, borderTop: `2px solid ${SKY}` }} className="rounded-lg px-4 py-2.5 mb-2">
      <div className="flex items-center justify-between text-center">
        <button onClick={toggle} style={{ color: TEXT_SOFT }} className="p-1 -m-1" aria-label={open ? 'Show less' : 'Show the whole program'}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
        <button onClick={toggle} style={{ color: SKY }} className="text-sm uppercase tracking-wide font-bold">{goal} Program</button>
        <button onClick={onManage} style={{ color: TEXT_SOFT }} className="p-1 -m-1" aria-label="Manage program"><Pencil size={14} /></button>
      </div>
      <button onClick={toggle} style={{ color: TEXT_SOFT }} className="block w-full text-center text-[13px] leading-snug">{exact}</button>
      <div style={{ color: TEXT_SOFT }} className="flex items-baseline justify-between gap-3 text-sm mt-1">
        <span className="truncate">{week.label}</span>
        <span className="shrink-0">{lifted.toLocaleString()} lb lifted</span>
      </div>
      <div className="flex gap-1.5 mt-2">
        {week.sessions.map((x) => {
          const isNext = s && s.id === x.id;
          return (
            <div
              key={x.id}
              style={{ background: isNext ? SKY : INK_3, color: isNext ? INK : x.done ? TEXT_SOFT : PAPER, outline: x.day === today && !isNext ? `1.5px solid ${SKY}` : 'none' }}
              className="flex-1 min-w-0 rounded-md py-1 px-0.5 text-[13px] font-medium leading-tight flex items-center justify-center gap-1"
            >
              {DAY_NAMES[x.day]}{x.done && <Check size={12} />}
            </div>
          );
        })}
      </div>
      {s ? (
        <div className="flex items-center justify-between gap-3 mt-2">
          <div className="min-w-0">
            <div style={{ color: PAPER }} className="text-base font-medium truncate">{s.name}</div>
            <div style={{ color: TEXT_SOFT }} className="text-[13px] leading-snug">{sessionBlurb(s)}</div>
            <div style={{ color: TEXT_SOFT }} className="text-[13px] leading-snug">{sessionDetail(s)}{acc ? ` · ${acc}` : ''}</div>
          </div>
          {s.inProgress ? (
            <span style={{ color: SKY }} className="shrink-0 text-sm font-medium">In progress</span>
          ) : (
            <button onClick={() => onStart(s)} style={{ background: SKY, color: INK }} className="shrink-0 rounded-md px-4 py-2 text-sm font-medium inline-flex items-center gap-1.5">
              <Play size={14} /> Start
            </button>
          )}
        </div>
      ) : (
        <div className="mt-2">
          <div style={{ color: PAPER_DIM }} className="text-sm text-center">All {week.sessions.length} sessions done this week. Nice work!</div>
          {flex && (
            <div style={{ background: INK_3 }} className="flex items-center justify-between gap-3 rounded-md px-3 py-2 mt-2">
              <div className="min-w-0">
                <div style={{ color: PAPER }} className="text-sm font-medium">Flex day</div>
                <div style={{ color: TEXT_SOFT }} className="text-[13px] leading-snug">Fills in what this week left out: {flex.label}</div>
              </div>
              <button onClick={() => onStart(flex.session)} style={{ background: SKY, color: INK }} className="shrink-0 rounded-md px-4 py-2 text-sm font-medium inline-flex items-center gap-1.5">
                <Play size={14} /> Start
              </button>
            </div>
          )}
        </div>
      )}
      {open && (
        <div style={{ borderTop: `1px dashed ${INK_3}` }} className="mt-3 pt-2.5">
          <div style={{ color: TEXT_SOFT }} className="text-[13px] uppercase tracking-wide mb-1.5">This week</div>
          <div className="space-y-1.5">
            {week.sessions.map((x) => (
              <div key={x.id} style={{ background: INK_3 }} className="rounded-md px-3 py-2 flex items-start gap-2.5">
                <span style={{ color: x.done ? TEXT_SOFT : SKY }} className="shrink-0 w-9 text-sm font-medium pt-px">{DAY_NAMES[x.day]}</span>
                <div className="min-w-0 flex-1">
                  <div style={{ color: x.done ? TEXT_SOFT : PAPER }} className="text-sm font-medium flex items-center gap-1.5">{x.name}{x.done && <Check size={12} />}</div>
                  <div style={{ color: TEXT_SOFT }} className="text-[13px] leading-snug">{sessionBlurb(x)}</div>
                  <div style={{ color: TEXT_SOFT }} className="text-[13px] leading-snug">{sessionDetail(x)}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ color: TEXT_SOFT }} className="text-[13px] leading-snug mt-2.5">
            {split ? `${split.freq}. ` : ''}The plan repeats every {len} weeks; the last week of each round is a lighter deload.
            {program.startedAt ? ` Started ${new Date(`${program.startedAt}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.` : ''}
          </div>
        </div>
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
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-2">{week.doneCount} of {week.sessions.length} done this week</div>
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
