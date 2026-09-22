import React, { useState, useEffect } from 'react';
import { INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY, INK } from '../../theme';
import { MUSCLE_GROUPS, LIFESTYLE_ACTIVITIES, BODY_REGION_GROUPS, LEGS_BUNDLE, ARMS_BUNDLE } from './exerciseLibrary';

const LONG_PRESS_MS = 550;

// Every quick-select shortcut (Whole/Upper/Lower Body, plus the Legs and
// Arms bundles in the chip row below) shares one highlighting rule: it
// looks "active" once its full set of muscles is covered — whether that
// happened by clicking the shortcut itself, or by hand-picking every
// member individually — and it STAYS looking active through partial
// deselection (dropping one or two muscles), only clearing once you
// explicitly clear the whole thing or empty the selection out entirely.
// This is what keeps a single muscle pick (e.g. just Triceps) from
// falsely lighting up "Arms," while still giving a grace period once a
// bundle really was fully selected.
const BUNDLE_DEFS = { Legs: LEGS_BUNDLE, Arms: ARMS_BUNDLE };

export function MuscleGroupPicker({ selectedGroups, onToggleGroup }) {
  const [active, setActive] = useState(new Set());

  useEffect(() => {
    setActive((prev) => {
      let next = prev;
      const allDefs = { ...BODY_REGION_GROUPS, ...BUNDLE_DEFS };
      Object.entries(allDefs).forEach(([label, groups]) => {
        if (!prev.has(label) && groups.every((g) => selectedGroups.includes(g))) {
          if (next === prev) next = new Set(prev);
          next.add(label);
        }
      });
      if (selectedGroups.length === 0 && next.size > 0) next = new Set();
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroups]);

  function setBundleActive(label, isActive) {
    setActive((prev) => {
      const next = new Set(prev);
      if (isActive) next.add(label); else next.delete(label);
      return next;
    });
  }

  function toggleBundle(label, groups) {
    const allSelected = groups.every((g) => selectedGroups.includes(g));
    groups.forEach((g) => {
      const isSelected = selectedGroups.includes(g);
      if (allSelected && isSelected) onToggleGroup(g);
      if (!allSelected && !isSelected) onToggleGroup(g);
    });
    setBundleActive(label, !allSelected);
    // Clearing Upper/Lower/Legs entirely also breaks Whole Body's own
    // highlight, even though the other half's muscles are untouched —
    // there's no such thing as a whole-body session missing a whole half.
    if (allSelected && label !== 'Whole Body') setBundleActive('Whole Body', false);
  }

  // Deselecting a single leg-bundle muscle (not via the bundle button)
  // should also break Whole Body once no leg coverage is left at all.
  function breakWholeIfLegsGone(groupBeingDeselected) {
    if (!active.has('Whole Body') || !LEGS_BUNDLE.includes(groupBeingDeselected)) return;
    const stillHasLegs = LEGS_BUNDLE.some((g) => g !== groupBeingDeselected && selectedGroups.includes(g));
    if (!stillHasLegs) setBundleActive('Whole Body', false);
  }

  // "Legs" and "Arms" act as bundle shortcuts right in the chip row —
  // clicking them fills in (or clears) their whole bundle. Everything
  // else is a plain single toggle.
  function handleGroupClick(group) {
    if (BUNDLE_DEFS[group]) { toggleBundle(group, BUNDLE_DEFS[group]); return; }
    if (selectedGroups.includes(group)) breakWholeIfLegsGone(group);
    onToggleGroup(group);
  }

  return (
    <>
      <div className="flex flex-wrap justify-center gap-2 mb-2">
        {Object.keys(BODY_REGION_GROUPS).map((region) => {
          const selected = active.has(region);
          return (
            <button
              key={region}
              onClick={() => toggleBundle(region, BODY_REGION_GROUPS[region])}
              style={{ background: selected ? SKY : INK_3, color: selected ? INK : PAPER_DIM, borderLeft: `3px solid ${SKY}` }}
              className="px-3 py-2 rounded-full text-sm font-medium"
            >
              {region}
            </button>
          );
        })}
      </div>
      <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-2">or pick specific muscle groups</div>
      <div className="flex flex-wrap justify-center gap-2 mb-2">
        {MUSCLE_GROUPS.map((group) => {
          const selected = BUNDLE_DEFS[group] ? active.has(group) : selectedGroups.includes(group);
          return (
            <button
              key={group}
              onClick={() => handleGroupClick(group)}
              style={{ background: selected ? SKY : INK_3, color: selected ? INK : PAPER_DIM }}
              className="px-3 py-2 rounded-full text-sm font-medium"
            >
              {group}
            </button>
          );
        })}
      </div>
    </>
  );
}

// Everyday-activity picker with a rememberable custom entry (press-and-
// hold to remove), used by the Aerobic/Combined steps of Move's start
// flow, and by Birdseye's quick-log modal.
export function ActivityPicker({ baseActivities = LIFESTYLE_ACTIVITIES, selectedActivities, onToggleActivity, customActivities, onAddCustomActivity, onRemoveCustomActivity }) {
  const [customInput, setCustomInput] = useState('');
  const [addingCustom, setAddingCustom] = useState(false);

  function handleAddCustom() {
    if (!customInput.trim()) return;
    onAddCustomActivity(customInput);
    setCustomInput('');
    setAddingCustom(false);
  }

  return (
    <>
      <div className="flex flex-wrap justify-center gap-2 mb-2">
        {[...baseActivities, ...customActivities].map((activity) => {
          const selected = selectedActivities.includes(activity);
          const isCustom = customActivities.includes(activity);
          return (
            <LongPressChip
              key={activity}
              label={activity}
              selected={selected}
              onClick={() => onToggleActivity(activity)}
              onLongPress={isCustom ? () => onRemoveCustomActivity(activity) : null}
            />
          );
        })}
      </div>
      {addingCustom ? (
        <div className="flex items-center gap-2 mb-2">
          <input
            autoFocus
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
            placeholder="Activity name…"
            style={{ background: INK_3, color: PAPER }}
            className="flex-1 rounded-md px-3 py-2 text-sm outline-none text-center"
          />
          <button
            onClick={handleAddCustom}
            disabled={!customInput.trim()}
            style={{ background: customInput.trim() ? SKY : INK_3, color: customInput.trim() ? INK : TEXT_SOFT }}
            className="rounded-md px-3 py-2 text-sm font-medium"
          >
            Add
          </button>
        </div>
      ) : (
        <button onClick={() => setAddingCustom(true)} style={{ color: SKY }} className="text-sm mb-2 mx-auto block">
          + Add…
        </button>
      )}
      {customActivities.length > 0 && (
        <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-3">Press and hold your own entries to remove them</div>
      )}
    </>
  );
}

// Combined picker (both muscle groups and activities together) — kept for
// Birdseye's lightweight quick-log modal, which doesn't need the full
// mode-branching flow Move's "start a workout" uses.
export default function MovementTypePicker({
  selectedGroups, onToggleGroup,
  selectedActivities, onToggleActivity,
  customActivities, onAddCustomActivity, onRemoveCustomActivity,
}) {
  return (
    <>
      <div style={{ color: PAPER_DIM }} className="text-sm text-center mb-2">Strength training (select any)</div>
      <MuscleGroupPicker selectedGroups={selectedGroups} onToggleGroup={onToggleGroup} />

      <div style={{ color: PAPER_DIM }} className="text-sm text-center mb-2 mt-2">Or everyday movement (select any)</div>
      <ActivityPicker
        selectedActivities={selectedActivities}
        onToggleActivity={onToggleActivity}
        customActivities={customActivities}
        onAddCustomActivity={onAddCustomActivity}
        onRemoveCustomActivity={onRemoveCustomActivity}
      />
    </>
  );
}

export function LongPressChip({ label, selected, onClick, onLongPress }) {
  const timerRef = React.useRef(null);
  const firedRef = React.useRef(false);

  function start() {
    if (!onLongPress) return;
    firedRef.current = false;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      if (window.confirm(`Remove "${label}" from your list?`)) onLongPress();
    }, LONG_PRESS_MS);
  }
  function cancel() {
    clearTimeout(timerRef.current);
  }
  function handleClick() {
    if (firedRef.current) { firedRef.current = false; return; }
    onClick();
  }

  return (
    <button
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onTouchStart={start}
      onTouchEnd={cancel}
      onClick={handleClick}
      style={{ background: selected ? SKY : INK_3, color: selected ? INK : PAPER_DIM }}
      className="px-3 py-2 rounded-full text-sm font-medium select-none"
    >
      {label}
    </button>
  );
}
