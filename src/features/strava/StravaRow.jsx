import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { STRAVA_ENABLED, connectStrava, disconnectStrava, syncStrava } from '../../lib/strava';
import { INK_3, PAPER, TEXT_SOFT, LIME, BRICK } from '../../theme';
import { useArmed } from '../../lib/useArmed';

// Account: connect Strava so Garmin / Apple Watch workouts arrive on their own. One slim row.
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
    <div className="mb-2">
      {connected ? (
        <div style={{ background: INK_3 }} className="rounded-md px-4 py-2.5 flex items-center justify-between gap-3">
          <span style={{ color: PAPER }} className="text-sm flex items-center gap-2 min-w-0">
            <span style={{ background: LIME }} className="w-2 h-2 rounded-full shrink-0" /> Strava connected
          </span>
          <span className="flex items-center gap-3 shrink-0">
            <button
              disabled={busy}
              onClick={() => run(syncStrava, (o) => (o.imported ? `Added ${o.imported} workout${o.imported === 1 ? '' : 's'}.` : 'Up to date.'))}
              style={{ color: TEXT_SOFT }}
              className="text-sm underline"
            >
              {busy ? 'Syncing…' : 'Sync'}
            </button>
            <button
              disabled={busy}
              onClick={() => arm.press('strava', () => run(async () => { await disconnectStrava(); await reloadProfile(); }, () => 'Disconnected.'))}
              data-armed={arm.armed === 'strava'}
              style={arm.armed === 'strava' ? { background: BRICK, color: PAPER } : { color: TEXT_SOFT }}
              className={`text-sm ${arm.armed === 'strava' ? 'rounded-md px-2 py-0.5' : 'underline'}`}
            >
              {arm.armed === 'strava' ? 'Sure?' : 'Disconnect'}
            </button>
          </span>
        </div>
      ) : (
        <button disabled={busy} onClick={() => run(connectStrava)} style={{ background: INK_3 }} className="w-full rounded-md px-4 py-2.5 flex items-center justify-between text-left">
          <span style={{ color: PAPER }} className="text-sm">{busy ? 'Opening Strava…' : 'Connect Strava'}</span>
          <span style={{ color: TEXT_SOFT }} className="text-sm">Garmin · Apple Watch</span>
        </button>
      )}
      {note && <div style={{ color: TEXT_SOFT }} className="text-sm text-center mt-1">{note}</div>}
      {error && <div style={{ color: BRICK }} className="text-sm text-center mt-1">{error}</div>}
    </div>
  );
}
