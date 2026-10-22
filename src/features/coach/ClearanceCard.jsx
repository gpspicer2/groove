import React, { useState } from 'react';
import { useArmed } from '../../lib/useArmed';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, BRICK, AMBER } from '../../theme';
import { RESULT_COPY, needsClearance, clearanceReason } from '../screening/screening';
import { setClearance } from './clearance';

const fmt = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// A button Greg taps twice to clear a member to Groove (they are told). Used on Today and the member's Overview.
export function ClearButton({ client, onClientChanged, className = '' }) {
  const arm = useArmed();
  const [err, setErr] = useState('');
  async function go() {
    const { error } = await setClearance(client, true, onClientChanged);
    if (error) setErr(error.message);
  }
  return (
    <>
      <button
        onClick={() => arm.press('clear', go)}
        data-armed={arm.armed === 'clear'}
        style={arm.armed === 'clear' ? { background: LIME, color: INK } : { background: INK_3, color: PAPER }}
        className={`rounded-md px-4 py-2 text-sm font-medium ${className}`}
      >
        {arm.armed === 'clear' ? 'Tap Again to Confirm' : 'Clear to Groove'}
      </button>
      {err && <span style={{ color: BRICK }} className="text-sm block mt-1">{err}</span>}
    </>
  );
}

// The health check at the top of a member's Overview: what they reported, and the one-tap decision.
export default function ClearanceCard({ client, onClientChanged }) {
  const s = client.screening;
  const [err, setErr] = useState('');
  if (!s) {
    return (
      <div style={{ background: INK_2, borderTop: `2px solid ${TEXT_SOFT}` }} className="rounded-2xl px-4 py-3.5 mb-3">
        <div style={{ color: TEXT_SOFT }} className="text-sm font-semibold uppercase tracking-wide">Health Check</div>
        <div style={{ color: PAPER_DIM }} className="text-sm">Hasn't done the health check yet.</div>
      </div>
    );
  }
  const pending = needsClearance(s);
  const why = clearanceReason(s);
  const copy = RESULT_COPY[s.result];
  const color = pending ? (s.result === 'stop_and_clearance' ? BRICK : AMBER) : LIME;

  async function undo() {
    setErr('');
    const { error } = await setClearance(client, false, onClientChanged);
    if (error) setErr(error.message);
  }

  return (
    <div style={{ background: INK_2, borderTop: `2px solid ${color}` }} className="rounded-2xl px-4 py-3.5 mb-3">
      <div style={{ color }} className="text-sm font-semibold uppercase tracking-wide">
        Health Check{pending ? ': Needs Your Review' : ''}
      </div>
      {pending ? (
        <>
          <div style={{ color: PAPER }} className="text-sm mt-1">{why ? `Reported ${why}.` : copy.banner}</div>
          <div style={{ color: TEXT_SOFT }} className="text-sm mt-1">Your call: clear them to Groove, or have them see their doctor first.</div>
          <div className="mt-3"><ClearButton client={client} onClientChanged={onClientChanged} /></div>
        </>
      ) : s.cleared_at ? (
        <>
          <div style={{ color: PAPER }} className="text-sm mt-1">
            {s.cleared_by === 'coach' ? `You cleared them on ${fmt(s.cleared_at)}.` : `Their doctor cleared them (their word), ${fmt(s.cleared_at)}.`}
          </div>
          {why && <div style={{ color: TEXT_SOFT }} className="text-sm">Reported {why}.</div>}
          {s.cleared_by === 'coach' && <button onClick={undo} style={{ color: TEXT_SOFT }} className="text-sm underline mt-1">Undo Clearance</button>}
        </>
      ) : (
        <div style={{ color: PAPER_DIM }} className="text-sm mt-1">No flags from the health check.</div>
      )}
      {err && <div style={{ color: BRICK }} className="text-sm mt-1">{err}</div>}
    </div>
  );
}
