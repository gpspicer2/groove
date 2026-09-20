import React, { useState, useEffect } from 'react';
import { INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY, INK } from '../../theme';
import { MUSCLE_GROUPS, LIFESTYLE_ACTIVITIES, BODY_REGION_GROUPS } from './exerciseLibrary';

const LONG_PRESS_MS = 550;

// Muscle-group picker with "Upper Body"/"Lower Body" quick-select
// shortcuts, used by the Resistance/Combined/Flexibility steps of Move's
// start flow, and by Birdseye's quick-log modal.
export function MuscleGroupPicker({ selectedGroups, onToggleGroup }) {
  // "Whole Body" is tracked separately from the derived Upper/Lower
  // highlight: deselecting one or two individual muscles should leave it
  // looking selected, but explicitly clearing an entire half via the
  // Upper/Lower Body button should turn it off, even though the other
  // half's muscles are still selected.
  const [wholeActive, setWholeActive] = useState(false);

  useEffect(() => {
    if (selectedGroups.length === 0) setWholeActive(false);
  }, [selectedGroups.length]);

  function toggleRegion(region) {
    const groups = BODY_REGION_GROUPS[region];
    const allSelected = groups.every((g) => selectedGroups.includes(g));
    groups.forEach((g) => {
      const isSelected = selectedGroups.includes(g);
      if (allSelected && isSelected) onToggleGroup(g);
      if (!allSelected && !isSelected) onToggleGroup(g);
    });

    if (region === 'Whole Body') {
      setWholeActive(!allSelected);
    } else if (allSelected) {
      // Clearing an entire half while Whole Body was active means it's
      // no longer fully selected, even though the other half remains.
      setWholeActive(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap justify-center gap-2 mb-2">
        {Object.keys(BODY_REGION_GROUPS).map((region) => {
          // Upper/Lower stay highlighted as long as ANY of their groups
          // are still selected — deselecting one or two muscles
          // individually shouldn't make the shortcut look unused. Whole
          // Body uses its own explicit flag instead (see above).
          const selected = region === 'Whole Body' ? wholeActive : BODY_REGION_GROUPS[region].some((g) => selectedGroups.includes(g));
          return (
            <button
              key={region}
              onClick={() => toggleRegion(region)}
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
          const selected = selectedGroups.includes(group);
          return (
            <button
              key={group}
              onClick={() => onToggleGroup(group)}
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
