import React, { useState } from 'react';
import Portal from '../../Portal';
import { useSwipeDown, GRAB_BAR_CLASS } from '../../lib/swipeDown';
import { BODY_AREAS } from './exerciseLibrary';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY } from '../../theme';

// Before a suggested lifting workout: anything sore or off today? The answer shapes the suggestion
// (movements that load a sore area are left out; "run down" trims the session).
export default function ReadinessSheet({ onConfirm, onCancel, injuries = [] }) {
  const [areas, setAreas] = useState([]);
  const [tired, setTired] = useState(false);
  const sheet = useSwipeDown(onCancel);
  const toggle = (id) => setAreas((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const any = areas.length > 0 || tired;
  const chip = (on) => ({ background: on ? SKY : INK_3, color: on ? INK : PAPER });
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" onClick={onCancel} />
        <div ref={sheet.ref} {...sheet.handlers} style={{ background: INK_2, ...sheet.style }} className="relative w-full max-w-md rounded-t-xl px-4 pt-5 pb-6 text-center">
          <div style={{ background: TEXT_SOFT, opacity: 0.45 }} className={GRAB_BAR_CLASS} />
          <div style={{ color: PAPER }} className="text-base font-medium">How's your body today?</div>
          <div style={{ color: PAPER_DIM }} className="text-sm mt-1 mb-3">Tap anything sore or not feeling right. I'll build around it.</div>
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            {BODY_AREAS.map((a) => (
              <button key={a.id} onClick={() => toggle(a.id)} style={chip(areas.includes(a.id))} className="rounded-full px-3.5 py-1.5 text-sm">{a.label}</button>
            ))}
            <button onClick={() => setTired((v) => !v)} style={chip(tired)} className="rounded-full px-3.5 py-1.5 text-sm">Run Down</button>
          </div>
          {injuries.length > 0 && <div style={{ color: SKY }} className="text-[13px] mb-2">Already working around: {injuries.map((i) => i.label).join(', ')}</div>}
          <div style={{ color: TEXT_SOFT }} className="text-[13px] mb-4">Sharp pain or swelling? Skip that area and check in with a pro.</div>
          <button onClick={() => onConfirm({ areas, tired })} style={{ background: SKY, color: INK }} className="w-full rounded-md py-3 text-sm font-medium">
            {any ? 'Build around that' : 'All good, build it'}
          </button>
          <button onClick={onCancel} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2 mt-1">Back</button>
        </div>
      </div>
    </Portal>
  );
}
