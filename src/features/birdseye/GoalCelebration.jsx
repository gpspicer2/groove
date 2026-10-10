import React, { useState, useEffect, useMemo } from 'react';
import Portal from '../../Portal';
import { INK_2, PAPER, TEXT_SOFT, LIME, SKY, AMBER, VIOLET, BRICK, PLUM } from '../../theme';

const COLORS = [LIME, SKY, AMBER, VIOLET, BRICK, PLUM];
const FRESH_MS = 6 * 3600 * 1000; // only celebrate a goal finished just now
const SHOW_MS = 4200;

// Confetti and a short fading message when a weekly goal is reached. Each
// goal celebrates once per week per device; goals that were already done
// before the client got here (older workouts) are marked quietly.
export default function GoalCelebration({ userId, weekKey, goals, latestAt, active }) {
  const [show, setShow] = useState(null); // { title, names }
  const metKey = goals.filter((g) => g.met).map((g) => g.mode).join(',');

  useEffect(() => {
    if (!active || !userId || !metKey) return;
    const key = `groove:goalsDone:${userId}:${weekKey}`;
    let done = [];
    try { done = JSON.parse(localStorage.getItem(key) || '[]'); } catch { done = []; }
    const fresh = goals.filter((g) => g.met && !done.includes(g.mode));
    if (fresh.length === 0) return;
    try { localStorage.setItem(key, JSON.stringify([...new Set([...done, ...fresh.map((g) => g.mode)])])); } catch { /* storage blocked */ }
    const justNow = latestAt && Date.now() - new Date(latestAt).getTime() < FRESH_MS;
    if (!justNow) return;
    const allMet = goals.length > 0 && goals.every((g) => g.met);
    setShow({ title: allMet ? 'All your weekly goals reached!' : fresh.length > 1 ? 'Weekly goals reached!' : 'Weekly goal reached!', names: fresh.map((g) => g.label).join(' · ') });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, userId, weekKey, metKey, latestAt]);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(null), SHOW_MS);
    return () => clearTimeout(t);
  }, [show]);

  const pieces = useMemo(() => Array.from({ length: 46 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.7,
    dur: 2.2 + Math.random() * 1.6,
    size: 7 + Math.random() * 7,
    drift: (Math.random() - 0.5) * 140,
    spin: 360 + Math.random() * 720,
    color: COLORS[i % COLORS.length],
    round: i % 3 === 0,
  })), [show]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!show) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden" aria-live="polite">
        {pieces.map((p, i) => (
          <span
            key={i}
            className="groove-confetti"
            style={{
              left: `${p.left}%`, width: p.size, height: p.round ? p.size : p.size * 1.6,
              background: p.color, borderRadius: p.round ? '50%' : 2,
              animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`,
              '--drift': `${p.drift}px`, '--spin': `${p.spin}deg`,
            }}
          />
        ))}
        <div className="absolute inset-x-0 top-[18%] flex justify-center px-6">
          <div style={{ background: INK_2, borderTop: `2px solid ${LIME}`, boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }} className="groove-celebrate-msg rounded-xl px-6 py-4 text-center max-w-xs">
            <div style={{ color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="text-lg font-medium">{show.title}</div>
            <div style={{ color: TEXT_SOFT }} className="text-sm mt-0.5">{show.names}. Nice work!</div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
