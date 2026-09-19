import React, { useState } from 'react';
import { INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY, INK } from '../../theme';
import { MUSCLE_GROUPS, LIFESTYLE_ACTIVITIES } from './exerciseLibrary';

const LONG_PRESS_MS = 550;

// Shared by Move's "start a workout" flow and Birdseye's quick-log modal —
// both need the same "what kind of movement" picker (strength training
// muscle groups, plus everyday activities with a rememberable custom
// entry, press-and-hold to remove).
export default function MovementTypePicker({
  selectedGroups, onToggleGroup,
  selectedActivities, onToggleActivity,
  customActivities, onAddCustomActivity, onRemoveCustomActivity,
}) {
  const [customInput, setCustomInput] = useState('');

  function handleAddCustom() {
    if (!customInput.trim()) return;
    onAddCustomActivity(customInput);
    setCustomInput('');
  }

  return (
    <>
      <div style={{ color: PAPER_DIM }} className="text-sm text-center mb-2">Strength training (select any)</div>
      <div className="flex flex-wrap justify-center gap-2 mb-4">
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

      <div style={{ color: PAPER_DIM }} className="text-sm text-center mb-2">Or everyday movement (select any)</div>
      <div className="flex flex-wrap justify-center gap-2 mb-2">
        {[...LIFESTYLE_ACTIVITIES, ...customActivities].map((activity) => {
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
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Add your own…"
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
      {customActivities.length > 0 && (
        <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-3">Press and hold your own entries to remove them</div>
      )}
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
