import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { STRAVA_ENABLED, connectStrava, disconnectStrava, syncStrava } from '../../lib/strava';
import { INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, BRICK } from '../../theme';
import { useArmed } from '../../lib/useArmed';

// Account: connect Strava so Garmin / Apple Watch workouts arrive on their own.
export default function StravaRow() {
  const { profile, reloadProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const arm = useArmed();
  if (!STRAVA_ENABLED) return null;
  const connected = Boolean(profile?.strava_connected);

  async function run(fn, done) {
    setBusy(true); setError(''); setNote('');
    try { const out = await fn(); if (done) setNote(done(out)); } catch (e) { setError(e.message); }
    setBusy(false);
  }

  return (
    <>
      <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide block text-center mb-2 mt-4">Strava</div>
      {connected ? (
        <div style={{ background: INK_2 }} className="rounded-md px-4 py-3 mb-2 text-center">
          <div style={{ color: PAPER }} className="text-sm flex items-center justify-center gap-2">
            <span style={{ background: LIME }} className="w-2 h-2 rounded-full" /> Connected. New workouts come in automatically.
          </div>
          <div className="flex items-center justify-center gap-4 mt-2">
            <button
              disabled={busy}
              onClick={() => run(syncStrava, (o) => (o.imported ? `Added ${o.imported} workout${o.imported === 1 ? '' : 's'}.` : 'Up to date.'))}
              style={{ color: PAPER_DIM }}
              className="text-sm underline"
            >
              {busy ? 'Syncing…' : 'Sync now'}
            </button>
            <button
              disabled={busy}
              onClick={() => arm.press('strava', () => run(async () => { await disconnectStrava(); await reloadProfile(); }, () => 'Disconnected.'))}
              data-armed={arm.armed === 'strava'}
              style={arm.armed === 'strava' ? { background: BRICK, color: PAPER } : { color: TEXT_SOFT }}
              className={`text-sm ${arm.armed === 'strava' ? 'rounded-md px-2 py-0.5' : 'underline'}`}
            >
              {arm.armed === 'strava' ? 'Tap again to disconnect' : 'Disconnect'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <button disabled={busy} onClick={() => run(connectStrava)} style={{ background: INK_2 }} className="w-full rounded-md px-4 py-2.5 mb-1 flex items-center justify-between text-left">
            <span style={{ color: PAPER }} className="text-sm">{busy ? 'Opening Strava…' : 'Connect Strava'}</span>
            <span style={{ background: INK_3 }} className="relative shrink-0 w-10 h-6 rounded-full">
              <span style={{ background: PAPER }} className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full" />
            </span>
          </button>
          <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-2">Garmin and Apple Watch workouts show up here on their own.</div>
        </>
      )}
      {note && <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-2">{note}</div>}
      {error && <div style={{ color: BRICK }} className="text-sm text-center mb-2">{error}</div>}
    </>
  );
}
