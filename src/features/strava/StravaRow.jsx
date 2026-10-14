import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { STRAVA_ENABLED, connectStrava, disconnectStrava, syncStrava } from '../../lib/strava';
import { Watch } from '../../lib/icons';
import { INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, BRICK } from '../../theme';
import { useArmed } from '../../lib/useArmed';
import DeviceSheet from './DeviceSheet';
import StravaMark from './StravaMark';

// Account: two half-width buttons. Strava (connect / connected) and "Connect Device" (how to link a watch).
export default function StravaRow() {
  const { profile, reloadProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [menu, setMenu] = useState(false);
  const [devices, setDevices] = useState(false);
  const arm = useArmed();
  if (!STRAVA_ENABLED) return null;
  const connected = Boolean(profile?.strava_connected);

  async function run(fn, done) {
    setBusy(true); setError(''); setNote('');
    try { const out = await fn(); if (done) setNote(done(out)); } catch (e) { setError(e.message); }
    setBusy(false);
  }

  const cell = 'rounded-md px-3 py-2.5 flex items-center justify-center gap-2 text-sm font-medium';

  return (
    <div className="mb-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={busy}
          onClick={() => (connected ? setMenu((v) => !v) : run(connectStrava))}
          style={{ background: INK_3, color: PAPER }}
          className={cell}
        >
          <StravaMark />
          {busy ? 'Opening…' : connected ? (<><span style={{ background: LIME }} className="w-2 h-2 rounded-full" /> Connected</>) : 'Connect Strava'}
        </button>
        <button onClick={() => setDevices(true)} style={{ background: INK_3, color: PAPER }} className={cell}>
          <Watch size={17} color={PAPER_DIM} /> Connect Device
        </button>
      </div>

      {connected && menu && (
        <div style={{ background: INK_3 }} className="rounded-md mt-2 px-4 py-2.5 flex items-center justify-center gap-5">
          <button
            disabled={busy}
            onClick={() => run(syncStrava, (o) => (o.imported || o.removed ? `Added ${o.imported || 0}, tidied ${o.removed || 0} duplicate${o.removed === 1 ? '' : 's'}.` : 'Up to date.'))}
            style={{ color: PAPER_DIM }}
            className="text-sm underline"
          >
            {busy ? 'Syncing…' : 'Sync now'}
          </button>
          <button
            disabled={busy}
            onClick={() => arm.press('strava', () => run(async () => { await disconnectStrava(); await reloadProfile(); setMenu(false); }, () => 'Disconnected.'))}
            data-armed={arm.armed === 'strava'}
            style={arm.armed === 'strava' ? { background: BRICK, color: PAPER } : { color: TEXT_SOFT }}
            className={`text-sm ${arm.armed === 'strava' ? 'rounded-md px-2 py-0.5' : 'underline'}`}
          >
            {arm.armed === 'strava' ? 'Tap again to disconnect' : 'Disconnect Strava'}
          </button>
        </div>
      )}
      {note && <div style={{ color: TEXT_SOFT }} className="text-sm text-center mt-1">{note}</div>}
      {error && <div style={{ color: BRICK }} className="text-sm text-center mt-1">{error}</div>}
      {devices && <DeviceSheet onClose={() => setDevices(false)} />}
    </div>
  );
}
