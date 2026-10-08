import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Play, Calendar } from 'lucide-react';
import { INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, MOSS, AMBER } from '../../theme';
import { planSummary } from '../plan/plan';

function storageGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function storageSet(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }

// A short look back at last week. Dismissible; returns next week.
export function RecapCard({ userId, recap, goals, onRaiseGoal, active }) {
  const storageKey = `groove:recap:${userId}:${recap.key}`;
  const [hidden, setHidden] = useState(() => storageGet(storageKey) === '1');
  const [raised, setRaised] = useState(false);

  // Closes itself after the client has left Birdseye 3 times, whether by
  // swiping to another tab or leaving the app.
  const leavesKey = `${storageKey}:leaves`;
  const wasActive = useRef(active);
  function countLeave() {
    const n = (parseInt(storageGet(leavesKey), 10) || 0) + 1;
    storageSet(leavesKey, String(n));
    if (n >= 3) { storageSet(storageKey, '1'); setHidden(true); }
  }
  useEffect(() => {
    if (wasActive.current && !active) countLeave();
    wasActive.current = active;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  useEffect(() => {
    function onVis() { if (document.visibilityState === 'hidden' && wasActive.current) countLeave(); }
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (hidden) return null;
  const { last, rows, milestones, suggestion } = recap;
  const bits = [
    `${last.sessions} workout${last.sessions === 1 ? '' : 's'}`,
    last.aerobicMin > 0 && `${Math.round(last.aerobicMin)} aerobic min`,
    last.kcal > 0 && `~${Math.round(last.kcal).toLocaleString()} kcal`,
  ].filter(Boolean);

  function dismiss() { storageSet(storageKey, '1'); setHidden(true); }

  return (
    <div style={{ background: INK_2, borderTop: `2px solid ${LIME}` }} className="rounded-lg px-5 py-4 relative">
      <button onClick={dismiss} aria-label="Dismiss" style={{ color: TEXT_SOFT }} className="absolute top-3 right-3 p-1">
        <X size={14} />
      </button>
      <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-1">Last week</div>
      <div style={{ color: PAPER }} className="text-sm font-medium mb-2">{bits.join(' · ')}</div>
      {rows.length > 0 && (
        <div className="flex justify-center flex-wrap gap-2 mb-1">
          {rows.map((r) => (
            <span
              key={r.label}
              style={{ background: INK_3, color: r.hit ? LIME : TEXT_SOFT }}
              className="rounded-full px-3 py-1 text-sm inline-flex items-center gap-1"
            >
              {r.hit && <Check size={13} strokeWidth={3} />}{r.label}
            </span>
          ))}
        </div>
      )}
      {milestones.map((m) => (
        <div key={m} style={{ color: AMBER }} className="text-sm font-medium mt-2">🎉 {m}</div>
      ))}
      {suggestion && !raised && (
        <div className="mt-3">
          <div style={{ color: PAPER_DIM }} className="text-sm mb-2">
            You hit {goals.aerobicMinutes} aerobic min two weeks running. Ready for {suggestion.aerobicMinutes}?
          </div>
          <button
            onClick={() => { onRaiseGoal(suggestion.aerobicMinutes); setRaised(true); }}
            style={{ background: LIME, color: '#0b0b0b' }}
            className="rounded-md px-4 py-2 text-sm font-medium"
          >
            Raise to {suggestion.aerobicMinutes} min
          </button>
        </div>
      )}
      {raised && <div style={{ color: MOSS }} className="text-sm mt-3">Goal raised. Nice work!</div>}
    </div>
  );
}

// Today's planned workout, one tap to start it.
export function TodayPlanCard({ plan, onStart, label = 'Planned for today', action = 'Start Workout' }) {
  const detail = planSummary(plan);
  return (
    <div style={{ background: INK_2, borderTop: `2px solid ${LIME}` }} className="rounded-lg px-5 py-4 text-center">
      <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-1 inline-flex items-center gap-1.5 justify-center w-full">
        <Calendar size={13} /> {label}
      </div>
      <div style={{ color: PAPER }} className="text-sm font-medium">{plan.title}</div>
      {detail && <div style={{ color: TEXT_SOFT }} className="text-sm">{detail}</div>}
      <button
        onClick={() => onStart(plan)}
        style={{ background: LIME, color: '#0b0b0b' }}
        className="mt-3 rounded-md px-5 py-2 text-sm font-medium inline-flex items-center gap-1.5"
      >
        <Play size={14} /> {action}
      </button>
    </div>
  );
}
