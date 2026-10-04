import React, { useState } from 'react';
import { PAPER, PAPER_DIM, TEXT_SOFT, SKY, MOSS, AMBER, BRICK } from './theme';
import { MET_ACTIVITIES, MET_SOURCE } from './features/move/metLibrary';

// ACSM's Light / Moderate / Vigorous split, with the wide bands broken
// into finer steps so the slider is useful: "Moderate" alone spans
// everything from a stroll with the dog to a brisk bike commute.
const LEVELS = [
  { label: 'Light', range: 'under 3 METs', lo: 0, hi: 3, zone: 'Light', color: MOSS,
    blurb: 'Easy — you could sing. Gentle movement that barely raises your breathing.' },
  { label: 'Moderate · lower', range: '3 – 4.4 METs', lo: 3, hi: 4.5, zone: 'Moderate', color: SKY,
    blurb: 'A noticeable lift in breathing, but conversation is easy.' },
  { label: 'Moderate · upper', range: '4.5 – 5.9 METs', lo: 4.5, hi: 6, zone: 'Moderate', color: SKY,
    blurb: 'You can talk, but not sing. Steady, purposeful effort.' },
  { label: 'Vigorous', range: '6 – 8.9 METs', lo: 6, hi: 9, zone: 'Vigorous', color: AMBER,
    blurb: 'Hard to say more than a few words at a time.' },
  { label: 'Very vigorous', range: '9 – 11.9 METs', lo: 9, hi: 12, zone: 'Vigorous', color: BRICK,
    blurb: 'Breathing hard; only short phrases at a time.' },
  { label: 'Near maximal', range: '12+ METs', lo: 12, hi: 99, zone: 'Vigorous', color: BRICK,
    blurb: 'All-out effort you can hold only briefly.' },
];

// Drag the bar between intensities and see the activities that fall in
// each band — a lookup for "what counts, and how hard is it?" without
// needing to know what to search for.
export default function MetBrowser({ hrZones }) {
  const [i, setI] = useState(1);
  const level = LEVELS[i];
  const zone = hrZones?.find((z) => z.label === level.zone);

  const groups = {};
  MET_ACTIVITIES.filter((a) => a.met >= level.lo && a.met < level.hi).forEach((a) => {
    (groups[a.category] = groups[a.category] || []).push(a);
  });
  const cats = Object.keys(groups).sort();

  return (
    <div>
      <div className="text-center mb-1">
        <div style={{ color: level.color }} className="text-base font-medium">{level.label}</div>
        <div style={{ color: TEXT_SOFT }} className="text-sm">{level.range}{zone ? ` · ${zone.lowBpm}–${zone.highBpm} bpm for you` : ''}</div>
      </div>
      <input
        type="range"
        min={0}
        max={LEVELS.length - 1}
        step={1}
        value={i}
        onChange={(e) => setI(Number(e.target.value))}
        style={{ accentColor: level.color }}
        className="w-full my-2"
        aria-label="Intensity"
      />
      <div className="flex justify-between text-[10px] uppercase tracking-wide mb-2" style={{ color: TEXT_SOFT }}>
        <span>Easier</span>
        <span>Harder</span>
      </div>
      <div style={{ color: PAPER_DIM }} className="text-sm text-center mb-3">{level.blurb}</div>
      <div className="max-h-72 overflow-y-auto space-y-3 text-left pr-1">
        {cats.map((cat) => (
          <div key={cat}>
            <div style={{ color: level.color }} className="text-xs uppercase tracking-wide font-bold mb-1">{cat}</div>
            <ul className="space-y-0.5">
              {groups[cat].map((a, k) => (
                <li key={k} style={{ color: PAPER }} className="text-sm">{a.name}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ color: TEXT_SOFT }} className="text-xs mt-3 text-center">
        METs from the {MET_SOURCE.name} ({MET_SOURCE.authors}, {MET_SOURCE.journal}); values are for adults 19–59.
      </div>
    </div>
  );
}
