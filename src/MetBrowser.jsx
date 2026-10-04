import React, { useState } from 'react';
import { INK, INK_3, TEXT_SOFT, PAPER, SKY, MOSS, AMBER } from './theme';

// A short, everyday-language guide to what counts at each ACSM intensity.
// Activities are hand-picked from the 2024 Adult Compendium of Physical
// Activities (Herrmann et al.): Light < 3 METs, Moderate 3–5.9, Vigorous 6+.
const LEVELS = [
  {
    label: 'Light', color: MOSS, blurb: 'Easy. You could sing.',
    activities: ['Strolling', 'Gentle stretching', 'Gentle yoga', 'Cooking', 'Doing dishes', 'Watering plants', 'Playing catch', 'Fishing'],
  },
  {
    label: 'Moderate', color: SKY, blurb: 'You can talk, but not sing.',
    activities: ['Brisk walking', 'Easy bike ride', 'Dancing', 'Gardening', 'Raking leaves', 'Mowing the lawn', 'Vacuuming', 'Doubles tennis', 'Pickleball', 'Golf (walking)', 'Water aerobics', 'Leisure swimming'],
  },
  {
    label: 'Vigorous', color: AMBER, blurb: 'Only a few words at a time.',
    activities: ['Jogging or running', 'Uphill hiking', 'Fast cycling', 'Lap swimming', 'Singles tennis', 'Basketball', 'Soccer', 'Jumping rope', 'Stair climbing', 'HIIT class', 'Shoveling snow'],
  },
];

export default function MetBrowser({ hrZones }) {
  const [i, setI] = useState(1);
  const level = LEVELS[i];
  const zone = hrZones?.find((z) => z.label === level.label);

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {LEVELS.map((l, idx) => (
          <button
            key={l.label}
            onClick={() => setI(idx)}
            style={idx === i ? { background: l.color, color: INK } : { background: INK_3, color: TEXT_SOFT }}
            className="flex-1 rounded-full py-2 text-sm font-medium"
          >
            {l.label}
          </button>
        ))}
      </div>
      <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-3">
        {level.blurb}{zone ? ` · ${zone.lowBpm}–${zone.highBpm} bpm for you` : ''}
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {level.activities.map((a) => (
          <span key={a} style={{ color: PAPER, background: 'rgba(0,0,0,0.04)' }} className="rounded-full px-3 py-1 text-sm">{a}</span>
        ))}
      </div>
      <div style={{ color: TEXT_SOFT }} className="text-xs mt-3 text-center">
        Source: 2024 Compendium of Physical Activities
      </div>
    </div>
  );
}
