import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import Wordmark from '../../Wordmark';
import { startCheckout } from '../../lib/api';
import { MEMBERSHIP_PRICE } from '../../lib/membership';
import { INK, INK_2, PAPER, PAPER_DIM, TEXT_SOFT, PLUM, BRICK } from '../../theme';

const INCLUDED = [
  'Your own movement plan from Greg',
  'Weekly goals, tracking, and progress',
  'Short lessons on how to move well',
];

// Shown when membership is required and this person doesn't have one yet.
export default function MembershipGate() {
  const { profile, signOut, reloadProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const justPaid = new URLSearchParams(window.location.search).get('checkout') === 'success';
  const [waiting, setWaiting] = useState(justPaid);

  // After paying, Stripe tells us a moment later. Check a few times.
  useEffect(() => {
    if (!waiting) return undefined;
    let tries = 0;
    const id = setInterval(async () => {
      tries += 1;
      await reloadProfile();
      if (tries >= 15) { clearInterval(id); setWaiting(false); }
    }, 2000);
    return () => clearInterval(id);
  }, [waiting]);

  async function join() {
    setBusy(true); setError('');
    try { window.location.href = await startCheckout(); }
    catch (e) { setError(e.message); setBusy(false); }
  }

  const pastDue = profile?.membership_status === 'past_due';
  const canceled = profile?.membership_status === 'canceled';

  return (
    <div style={{ background: INK, fontFamily: 'Manrope, sans-serif' }} className="min-h-[100svh] flex items-center justify-center px-4 py-8">
      <div style={{ background: INK_2, borderTop: `2px solid ${PLUM}` }} className="w-full max-w-sm rounded-lg px-6 py-7 text-center">
        <Wordmark height={40} className="mb-4 mx-auto block" />
        {waiting ? (
          <>
            <h1 style={{ color: PLUM }} className="text-xl font-medium mb-2">Finishing up…</h1>
            <p style={{ color: PAPER_DIM }} className="text-sm">Confirming your payment. This takes a few seconds.</p>
          </>
        ) : (
          <>
            <h1 style={{ color: PLUM }} className="text-xl font-medium mb-1">
              {pastDue ? 'Payment needs attention' : canceled ? 'Welcome back' : 'Join Groove'}
            </h1>
            <div style={{ color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }} className="text-4xl font-semibold mt-3">
              ${MEMBERSHIP_PRICE}<span style={{ color: TEXT_SOFT }} className="text-base font-normal"> / month</span>
            </div>
            <div style={{ color: TEXT_SOFT }} className="text-sm mb-4">Cancel anytime.</div>
            <div className="space-y-1.5 mb-5">
              {INCLUDED.map((t) => <p key={t} style={{ color: PAPER_DIM }} className="text-sm">{t}</p>)}
            </div>
            {error && <div style={{ color: BRICK }} className="text-sm mb-3">{error}</div>}
            <button onClick={join} disabled={busy} style={{ background: PLUM, color: INK }} className="w-full rounded-md py-3 text-sm font-medium mb-2">
              {busy ? 'Opening secure checkout…' : pastDue || canceled ? 'Update membership' : 'Join'}
            </button>
            <p style={{ color: TEXT_SOFT }} className="text-xs mb-3">Payment is handled securely by Stripe.</p>
          </>
        )}
        <button onClick={signOut} style={{ color: TEXT_SOFT }} className="w-full text-sm text-center mt-1">Sign out</button>
      </div>
    </div>
  );
}
