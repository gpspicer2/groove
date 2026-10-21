import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { STRAVA_ENABLED, connectStrava, disconnectStrava, syncStrava } from '../../lib/strava';
import { TEXT_SOFT, LIME, BRICK, INK_2, PAPER } from '../../theme';
import { useArmed } from '../../lib/useArmed';
import StravaMark from './StravaMark';

// Account > Settings: a quiet line for Strava (it brings in workouts from watches). Connect, or sync / disconnect.
export default function StravaRow() {
  const { profile, reloadProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [menu, setMenu] = useState(false);
  const arm = useArmed();
  if (!STRAVA_ENABLED) return null;
  const connected = Boolean(profile?.strava_connected);

  async function run(fn, done) {
    setBusy(true); setError(''); setNote('');
    try { const out = await fn(); if (done) setNote(done(out)); } catch (e) { setError(e.message); }
    setBusy(false);
  }

  return (
    <div className="mt-3 text-center">
      <button
        disabled={busy}
        onClick={() => (connected ? setMenu((v) => !v) : run(connectStrava))}
        style={{ color: TEXT_SOFT }}
        className="text-sm inline-flex items-center justify-center gap-2 py-1.5"
      >
        <StravaMark size={14} />
        {busy ? 'Opening…' : connected ? (<><span style={{ background: LIME }} className="w-1.5 h-1.5 rounded-full" /> Strava Connected</>) : 'Connect Strava (Optional)'}
      </button>
      {connected && menu && (
        <div style={{ background: INK_2 }} className="rounded-md mt-1 px-4 py-2 flex items-center justify-center gap-5">
          <button
            disabled={busy}
            onClick={() => run(syncStrava, (o) => (o.imported || o.removed ? `Added ${o.imported || 0}, tidied ${o.removed || 0} duplicate${o.removed === 1 ? '' : 's'}.` : 'Up to date.'))}
            style={{ color: TEXT_SOFT }}
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
            {arm.armed === 'strava' ? 'Tap again to disconnect' : 'Disconnect'}
          </button>
        </div>
      )}
      {note && <div style={{ color: TEXT_SOFT }} className="text-sm mt-1">{note}</div>}
      {error && <div style={{ color: BRICK }} className="text-sm mt-1">{error}</div>}
    </div>
  );
}
