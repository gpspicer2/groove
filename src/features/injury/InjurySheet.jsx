import React, { useState } from 'react';
import Portal from '../../Portal';
import { useSwipeDown, GRAB_BAR_CLASS } from '../../lib/swipeDown';
import { useArmed } from '../../lib/useArmed';
import { BODY_AREAS } from '../move/exerciseLibrary';
import { stageFor, weeksSince, activeInjuries } from './injuries';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY, BRICK } from '../../theme';

function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Row({ injury, onRecover, onRemove }) {
  const w = weeksSince(injury.date);
  const st = stageFor(w);
  const { armed, press } = useArmed();
  return (
    <div style={{ background: INK_3 }} className="rounded-md px-3.5 py-3 mb-2 text-left">
      <div style={{ color: PAPER }} className="text-sm font-medium">{injury.label}</div>
      <div style={{ color: SKY }} className="text-[13px]">Week {w} · {st.name}</div>
      <div style={{ color: PAPER_DIM }} className="text-[13px] mt-1">{st.tip}</div>
      {injury.note ? <div style={{ color: TEXT_SOFT }} className="text-[13px] mt-1 italic">{injury.note}</div> : null}
      <div className="flex gap-4 mt-2">
        <button onClick={onRecover} style={{ color: SKY }} className="text-[13px] font-medium">Mark recovered</button>
        <button data-armed={armed === 'rm' ? 'true' : undefined} onClick={() => press('rm', onRemove)} style={{ color: armed === 'rm' ? BRICK : TEXT_SOFT }} className="text-[13px]">{armed === 'rm' ? 'Sure?' : 'Remove'}</button>
      </div>
    </div>
  );
}

export default function InjurySheet({ injuries, onSave, onClose }) {
  const sheet = useSwipeDown(onClose);
  const [adding, setAdding] = useState(false);
  const [area, setArea] = useState('');
  const [label, setLabel] = useState('');
  const [date, setDate] = useState(todayLocalISO());
  const [note, setNote] = useState('');
  const active = activeInjuries(injuries);
  const chip = (on) => ({ background: on ? SKY : INK_3, color: on ? INK : PAPER });
  const field = { background: INK_3, color: PAPER };

  function add() {
    const areaLabel = (BODY_AREAS.find((a) => a.id === area) || {}).label || '';
    const next = [...(injuries || []), { id: String(Date.now()), area, label: label.trim() || areaLabel, date, note: note.trim(), recovered: false }];
    onSave(next);
    setAdding(false); setArea(''); setLabel(''); setNote(''); setDate(todayLocalISO());
  }
  const update = (id, patch) => onSave((injuries || []).map((i) => (i.id === id ? { ...i, ...patch } : i)));

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" onClick={onClose} />
        <div ref={sheet.ref} {...sheet.handlers} style={{ background: INK_2, ...sheet.style }} className="relative w-full max-w-md rounded-t-xl px-4 pt-5 pb-6 max-h-[88vh] overflow-y-auto text-center">
          <div style={{ background: TEXT_SOFT, opacity: 0.45 }} className={GRAB_BAR_CLASS} />
          <div style={{ color: PAPER }} className="text-base font-medium">Injuries and Limits</div>
          <div style={{ color: PAPER_DIM }} className="text-sm mt-1 mb-3">Workouts built for you work around these automatically.</div>

          {active.length === 0 && !adding && <div style={{ color: TEXT_SOFT }} className="text-sm mb-3">Nothing listed.</div>}
          {active.map((i) => (
            <Row key={i.id} injury={i} onRecover={() => update(i.id, { recovered: true })} onRemove={() => onSave((injuries || []).filter((x) => x.id !== i.id))} />
          ))}

          {adding ? (
            <div className="text-left">
              <div style={{ color: PAPER_DIM }} className="text-[13px] mb-1.5">Where is it?</div>
              <div className="flex flex-wrap gap-2 mb-3">
                {BODY_AREAS.map((a) => (
                  <button key={a.id} onClick={() => setArea(a.id)} style={chip(area === a.id)} className="rounded-full px-3.5 py-1.5 text-sm">{a.label}</button>
                ))}
              </div>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="What happened? e.g. Partial quad tendon tear" style={field} className="w-full rounded-md px-3 py-2.5 text-sm mb-2" />
              <div style={{ color: PAPER_DIM }} className="text-[13px] mb-1.5">When did it happen?</div>
              <input type="date" value={date} max={todayLocalISO()} onChange={(e) => setDate(e.target.value)} style={field} className="w-full rounded-md px-3 py-2.5 text-sm mb-2" />
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything a pro told you (optional)" style={field} className="w-full rounded-md px-3 py-2.5 text-sm mb-3" />
              <button onClick={add} disabled={!area || !date} style={{ background: SKY, color: INK, opacity: !area || !date ? 0.4 : 1 }} className="w-full rounded-md py-3 text-sm font-medium">Save</button>
              <button onClick={() => setAdding(false)} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2 mt-1">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} style={{ background: SKY, color: INK }} className="w-full rounded-md py-3 text-sm font-medium">Add an injury</button>
          )}
          <div style={{ color: TEXT_SOFT }} className="text-[13px] mt-3">General guidance only. Sharp pain or swelling? Check in with a pro.</div>
          {!adding && <button onClick={onClose} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2 mt-1">Close</button>}
        </div>
      </div>
    </Portal>
  );
}
