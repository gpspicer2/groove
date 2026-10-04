import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PAPER, PAPER_DIM, TEXT_SOFT, SKY, MOSS, AMBER, BRICK } from './theme';
import { MET_ACTIVITIES, MET_SOURCE } from './features/move/metLibrary';

// ACSM's Light / Moderate / Vigorous split, with the wide bands broken
// into finer steps so the slider is useful: "Moderate" alone spans
// everything from a stroll with the dog to a brisk bike commute.
const LEVELS = [
  { label: 'Light', range: 'under 3 METs', lo: 0, hi: 3, zone: 'Light', color: MOSS,
    blurb: 'Easy — you could sing. Gentle movement that barely raises your breathing.' },
  { label: 'Moderate · Lower', range: '3 – 4.4 METs', lo: 3, hi: 4.5, zone: 'Moderate', color: SKY,
    blurb: 'A noticeable lift in breathing, but conversation is easy.' },
  { label: 'Moderate · Upper', range: '4.5 – 5.9 METs', lo: 4.5, hi: 6, zone: 'Moderate', color: SKY,
    blurb: 'You can talk, but not sing. Steady, purposeful effort.' },
  { label: 'Vigorous', range: '6 – 8.9 METs', lo: 6, hi: 9, zone: 'Vigorous', color: AMBER,
    blurb: 'Hard to say more than a few words at a time.' },
  { label: 'Very Vigorous', range: '9 – 11.9 METs', lo: 9, hi: 12, zone: 'Vigorous', color: BRICK,
    blurb: 'Breathing hard; only short phrases at a time.' },
  { label: 'Near-Maximal', range: '12+ METs', lo: 12, hi: 99, zone: 'Vigorous', color: BRICK,
    blurb: 'All-out effort you can hold only briefly.' },
];

// The compendium's wording is written for researchers ("Bicycling,
// eccentric only, 200 W", long parenthetical examples) — trim it to
// something a person would say, and drop lab-protocol-only entries.
const SKIP = /eccentric|concentric|\bW\b|Taylor|Life-Build|™|pole dancing/i;
function tidy(name) {
  let n = name.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  const parts = n.split(',').map((x) => x.trim()).filter(Boolean);
  if (n.length > 48 && parts.length > 2) n = parts.slice(0, 2).join(', ');
  return n.charAt(0).toUpperCase() + n.slice(1);
}

// Drag the bar between intensities and see the activities that fall in
// each band — a lookup for "what counts, and how hard is it?" without
// needing to know what to search for.
export default function MetBrowser({ hrZones }) {
  const [i, setI] = useState(1);
  const level = LEVELS[i];
  const zone = hrZones?.find((z) => z.label === level.zone);

  const [openCats, setOpenCats] = useState(() => new Set());
  const groups = {};
  MET_ACTIVITIES.filter((a) => a.met >= level.lo && a.met < level.hi && !SKIP.test(a.name)).forEach((a) => {
    const n = tidy(a.name);
    const list = (groups[a.category] = groups[a.category] || []);
    if (!list.includes(n)) list.push(n);
  });
  const cats = Object.keys(groups).sort();
  function toggleCat(c) {
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c); else next.add(c);
      return next;
    });
  }

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
        onChange={(e) => { setI(Number(e.target.value)); setOpenCats(new Set()); }}
        style={{ accentColor: level.color }}
        className="w-full my-2"
        aria-label="Intensity"
      />
      <div className="flex justify-between text-[10px] uppercase tracking-wide mb-2" style={{ color: TEXT_SOFT }}>
        <span>Easier</span>
        <span>Harder</span>
      </div>
      <div style={{ color: PAPER_DIM }} className="text-sm text-center mb-3">{level.blurb}</div>
      <div className="space-y-1.5 text-left">
        {cats.map((cat) => {
          const open = openCats.has(cat);
          return (
            <div key={cat} style={{ background: 'rgba(0,0,0,0.03)' }} className="rounded-md px-3 py-2">
              <button onClick={() => toggleCat(cat)} className="w-full flex items-center justify-between">
                <span style={{ color: level.color }} className="text-sm font-medium">{cat}</span>
                <span style={{ color: TEXT_SOFT }} className="text-sm flex items-center gap-1">
                  {groups[cat].length}
                  {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </button>
              {open && (
                <ul className="mt-1.5 space-y-1 list-disc pl-5">
                  {groups[cat].map((n) => (
                    <li key={n} style={{ color: PAPER }} className="text-sm">{n}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ color: TEXT_SOFT }} className="text-xs mt-3 text-center">
        METs from the {MET_SOURCE.name} ({MET_SOURCE.authors}, {MET_SOURCE.journal}); values are for adults 19–59.
      </div>
    </div>
  );
}
