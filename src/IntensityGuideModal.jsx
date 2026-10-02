import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import Portal from './Portal';
import { INK_2, PAPER, PAPER_DIM, TEXT_SOFT, SKY, BRICK } from './theme';
import { MET_ACTIVITIES, MET_SOURCE, metIntensity } from './features/move/metLibrary';

// Same Karvonen math Birdseye's Science & Strategy card uses, so the
// numbers always agree with each other.
const INTENSITY_GUIDE = [
  { label: 'Light', rpe: '2–3', talk: 'Easy — you could sing.' },
  { label: 'Moderate', rpe: '4–6', talk: 'You can talk, but not sing.' },
  { label: 'Vigorous', rpe: '7–8', talk: 'Hard to say more than a few words at a time.' },
];

const INTENSITY_COLOR = { Light: PAPER_DIM, Moderate: SKY, Vigorous: BRICK };

// Shared by Move (reached via "Not sure?" while logging aerobic minutes
// — the moment someone actually needs this) and Learn (as a browsable
// entry point, for "oh, I can log that?" discovery). One component, one
// dataset, so the two never drift apart.
export default function IntensityGuideModal({ onClose, hrZones }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = q ? MET_ACTIVITIES.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 40) : [];

  return (
    <Portal>
      <div style={{ background: 'rgba(0,0,0,0.6)' }} className="fixed inset-0 flex items-end md:items-center justify-center z-50" onClick={onClose}>
        <div
          style={{ background: INK_2 }}
          className="w-full max-w-sm rounded-t-2xl md:rounded-2xl px-5 py-6 max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ color: PAPER }} className="text-base font-medium">Which intensity was it?</h3>
            <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-2 -m-2"><X size={20} /></button>
          </div>
          <div className="space-y-4 mb-5">
            {INTENSITY_GUIDE.map((tier) => {
              const zone = hrZones?.find((z) => z.label === tier.label);
              return (
                <div key={tier.label}>
                  <div style={{ color: SKY }} className="text-sm font-medium mb-0.5">{tier.label}</div>
                  <div style={{ color: PAPER_DIM }} className="text-sm">{tier.talk}</div>
                  <div style={{ color: TEXT_SOFT }} className="text-sm">
                    RPE {tier.rpe}/10{zone ? ` · ${zone.lowBpm}–${zone.highBpm} bpm` : ''}
                  </div>
                </div>
              );
            })}
          </div>
          {!hrZones && (
            <div style={{ color: TEXT_SOFT }} className="text-sm mb-5 pb-5 border-b border-white/10">
              Add your resting heart rate in Account to see your own personal bpm ranges here.
            </div>
          )}

          <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-2">Look up an activity</div>
          <div className="relative mb-2">
            <Search size={14} color={TEXT_SOFT} className="absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. gardening, hiking, tennis…"
              style={{ background: 'rgba(255,255,255,0.06)', color: PAPER }}
              className="w-full rounded-md pl-9 pr-3 py-2.5 text-sm outline-none"
            />
          </div>
          {q && (
            <div className="space-y-1">
              {matches.length === 0 ? (
                <div style={{ color: TEXT_SOFT }} className="text-sm py-3 text-center">No match in the compendium — try a different word.</div>
              ) : (
                matches.map((a, i) => {
                  const tier = metIntensity(a.met);
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 py-1.5">
                      <span style={{ color: PAPER }} className="text-sm">{a.name}</span>
                      <span style={{ color: INTENSITY_COLOR[tier] }} className="text-sm shrink-0 font-medium">{tier}</span>
                    </div>
                  );
                })
              )}
            </div>
          )}
          <div style={{ color: TEXT_SOFT }} className="text-sm mt-4 pt-4 border-t border-white/10">
            MET values from the {MET_SOURCE.name} ({MET_SOURCE.authors}, {MET_SOURCE.journal}) — the current research standard for the energy cost of physical activity.
          </div>
        </div>
      </div>
    </Portal>
  );
}
