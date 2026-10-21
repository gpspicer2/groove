import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from '../../lib/icons';
import { useRevealOnOpen } from '../../lib/reveal';
import { INK, INK_2, INK_3, PAPER_DIM, TEXT_SOFT, LIME } from '../../theme';
import Trends from './Trends';
import FitnessTrends from './FitnessTrends';

// One closed card for everything about progress: Trends (how training changes week to week) and Your Fitness
// (VO2max, resting heart rate, strength and mobility tests). Folded until tapped; a small switch picks which one.
const TABS = [{ id: 'trends', label: 'Trends' }, { id: 'fitness', label: 'Your Fitness' }];

export default function Progress({ userId, profile, active, weekStartDay, hideScale }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('trends');
  const revealRef = useRevealOnOpen(open);
  return (
    <div ref={revealRef} data-tour="birdseye-trends" style={{ background: INK_2, borderTop: `2px solid ${LIME}` }} className="rounded-lg px-5 py-4 text-center">
      <button onClick={() => setOpen((v) => !v)} className="w-full grid grid-cols-[24px_1fr_24px] items-center">
        <span />
        <span style={{ color: LIME }} className="text-base uppercase tracking-wide font-bold">Progress</span>
        <span className="justify-self-end">{open ? <ChevronUp size={16} color={TEXT_SOFT} /> : <ChevronDown size={16} color={TEXT_SOFT} />}</span>
      </button>
      {open && (
        <div className="mt-2.5">
          <div style={{ background: INK_3 }} className="inline-flex rounded-full p-0.5 mb-3">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{ background: tab === t.id ? LIME : 'transparent', color: tab === t.id ? INK : PAPER_DIM }}
                className="rounded-full px-4 py-1 text-sm font-medium whitespace-nowrap"
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'trends'
            ? <Trends embedded userId={userId} profile={profile} active={active} weekStartDay={weekStartDay} hideScale={hideScale} />
            : <FitnessTrends embedded userId={userId} profile={profile} active={active} hideScale={hideScale} />}
        </div>
      )}
    </div>
  );
}
