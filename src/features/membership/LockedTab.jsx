import React, { useState } from 'react';
import { Lock } from '../../lib/icons';
import { useAuth } from '../../auth/AuthContext';
import { startCheckout } from '../../lib/api';
import { MEMBERSHIP_PRICE } from '../../lib/membership';
import { INK, INK_2, PAPER, PAPER_DIM, TEXT_SOFT, PLUM, BRICK } from '../../theme';
import { MovementLibrary } from '../birdseye/BirdseyeTab';

const INCLUDED = [
  'Your own movement plan from Greg',
  'Weekly goals, tracking, and progress',
  'Log workouts and journal privately',
];

// What Birdseye, Move and Journal show until someone joins. Learn and the
// Movement Library stay open so people can look around first.
export default function LockedTab({ showLibrary = false }) {
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pastDue = profile?.membership_status === 'past_due';
  const canceled = profile?.membership_status === 'canceled';

  async function join() {
    setBusy(true); setError('');
    try { window.location.href = await startCheckout(); }
    catch (e) { setError(e.message); setBusy(false); }
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-12 space-y-3">
      <div style={{ background: INK_2, borderTop: `2px solid ${PLUM}` }} className="rounded-lg px-6 py-6 text-center">
        <Lock size={22} color={PLUM} className="mx-auto mb-2" />
        <h2 style={{ color: PLUM }} className="text-xl font-medium mb-1">
          {pastDue ? 'Payment needs attention' : canceled ? 'Welcome back' : 'Members only'}
        </h2>
        <div style={{ color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="text-4xl font-semibold mt-2">
          ${MEMBERSHIP_PRICE}<span style={{ color: TEXT_SOFT }} className="text-base font-normal"> / month</span>
        </div>
        <div style={{ color: TEXT_SOFT }} className="text-sm mb-3">Cancel anytime.</div>
        <div className="space-y-1 mb-4">
          {INCLUDED.map((t) => <p key={t} style={{ color: PAPER_DIM }} className="text-sm">{t}</p>)}
        </div>
        {error && <div style={{ color: BRICK }} className="text-sm mb-2">{error}</div>}
        <button onClick={join} disabled={busy} style={{ background: PLUM, color: INK }} className="w-full rounded-md py-3 text-sm font-medium mb-2">
          {busy ? 'Opening secure checkout…' : pastDue || canceled ? 'Update membership' : 'Join'}
        </button>
        <p style={{ color: TEXT_SOFT }} className="text-xs">Payment is handled securely by Stripe.</p>
      </div>
      {showLibrary && <MovementLibrary hrZones={null} />}
    </div>
  );
}
