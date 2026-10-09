import React from 'react';
import { INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, PLUM, MOSS, SKY, BRICK, AMBER } from '../../theme';
import { goalsFor } from './stats';

// Round initial, or the person's photo.
export function Avatar({ client, size = 40 }) {
  const initial = (client.full_name || client.email || '?').trim()[0]?.toUpperCase();
  if (client.avatar_url) {
    return <img src={client.avatar_url} alt="" style={{ width: size, height: size }} className="rounded-full object-cover shrink-0" />;
  }
  return (
    <span
      style={{ width: size, height: size, background: `color-mix(in srgb, ${PLUM} 22%, transparent)`, color: PLUM, fontSize: size * 0.42 }}
      className="rounded-full inline-flex items-center justify-center font-semibold shrink-0"
    >
      {initial}
    </span>
  );
}

export function Stat({ label, value, sub, color = PAPER }) {
  return (
    <div style={{ background: INK_2 }} className="rounded-2xl px-4 py-3 text-left">
      <div style={{ color: TEXT_SOFT }} className="text-sm">{label}</div>
      <div style={{ color, fontFamily: 'Outfit, sans-serif' }} className="text-3xl font-semibold leading-tight">{value}</div>
      {sub && <div style={{ color: TEXT_SOFT }} className="text-sm">{sub}</div>}
    </div>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between mt-6 mb-2 px-1">
      <h2 style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide font-semibold">{children}</h2>
      {right}
    </div>
  );
}

// One thin bar: how far through a weekly goal.
export function MiniBar({ label, value, goal, color, unit = '' }) {
  const pct = Math.min(100, goal > 0 ? (value / goal) * 100 : 0);
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between gap-1">
        <span style={{ color: TEXT_SOFT }} className="text-xs uppercase tracking-wide">{label}</span>
        <span style={{ color: PAPER_DIM, fontFamily: 'Outfit, sans-serif' }} className="text-xs">{Math.round(value)}/{goal}{unit}</span>
      </div>
      <div style={{ background: INK_3 }} className="h-1.5 rounded-full overflow-hidden mt-1">
        <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full" />
      </div>
    </div>
  );
}

// The three weekly goals as bars, honoring which goals the client tracks.
export function WeekBars({ client, week, unitless = false }) {
  const g = goalsFor(client);
  return (
    <div className="flex gap-3">
      {g.trackAerobic && <MiniBar label="Aero" value={week.aerobic} goal={g.aerobic} color={MOSS} unit={unitless ? '' : 'm'} />}
      {g.trackResistance && <MiniBar label="Resist" value={week.resistance} goal={g.resistance} color={SKY} />}
      {g.trackFlexibility && <MiniBar label="Flex" value={week.flexibility} goal={g.flexibility} color={BRICK} />}
    </div>
  );
}

export function StatusDot({ level }) {
  const color = level === 'red' ? BRICK : level === 'amber' ? AMBER : MOSS;
  return <span style={{ background: color }} className="inline-block w-2.5 h-2.5 rounded-full shrink-0" />;
}
