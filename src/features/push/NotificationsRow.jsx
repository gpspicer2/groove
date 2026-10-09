import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { PUSH_CONFIGURED, pushSupported, pushStatus, enablePush, disablePush, isIos, isInstalled } from '../../lib/push';
import { INK_2, INK_3, PAPER, TEXT_SOFT, LIME, BRICK } from '../../theme';

// The Reminders switch in Account. Hidden until push is set up in Vercel.
export default function NotificationsRow() {
  const { user, isTrainer } = useAuth();
  const [status, setStatus] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { pushStatus(user.id).then(setStatus); }, [user.id]);
  if (!PUSH_CONFIGURED) return null;

  const needsInstall = isIos() && !isInstalled();
  const on = status === 'on';

  async function toggle() {
    setBusy(true); setError('');
    try {
      if (on) { await disablePush(); setStatus('off'); }
      else { await enablePush(user.id); setStatus('on'); }
    } catch (e) { setError(e.message); setStatus(await pushStatus(user.id)); }
    setBusy(false);
  }

  const blurb = isTrainer
    ? 'A morning summary of who needs you, and an alert when someone felt off.'
    : 'A nudge for planned workouts, and after 3 days without moving.';

  return (
    <>
      <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide block text-center mb-2 mt-4">Reminders</div>
      {needsInstall || !pushSupported() ? (
        <div style={{ background: INK_2, color: TEXT_SOFT }} className="rounded-md px-4 py-2.5 mb-2 text-sm text-center">
          {needsInstall
            ? 'On iPhone, first add Groove to your Home Screen (Share, then Add to Home Screen). Then come back here to turn reminders on.'
            : 'This browser can’t show reminders.'}
        </div>
      ) : (
        <>
          <button onClick={toggle} disabled={busy || status === 'loading' || status === 'blocked'} style={{ background: INK_2 }} className="w-full rounded-md px-4 py-2.5 mb-1 flex items-center justify-between text-left">
            <span style={{ color: PAPER }} className="text-sm">{status === 'blocked' ? 'Blocked in phone settings' : 'Push notifications'}</span>
            <span style={{ background: on ? LIME : INK_3 }} className="relative shrink-0 w-10 h-6 rounded-full">
              <span style={{ background: PAPER, transform: on ? 'translateX(16px)' : 'translateX(2px)' }} className="absolute top-0.5 w-5 h-5 rounded-full transition-transform" />
            </span>
          </button>
          <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-2">{blurb}</div>
          {error && <div style={{ color: BRICK }} className="text-sm text-center mb-2">{error}</div>}
        </>
      )}
    </>
  );
}
