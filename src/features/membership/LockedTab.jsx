import React, { useState } from 'react';
import { Lock } from '../../lib/icons';
import { useAuth } from '../../auth/AuthContext';
import { startCheckout } from '../../lib/api';
import { PLANS, money } from '../../lib/membership';
import { INK, INK_2, PAPER, PAPER_DIM, TEXT_SOFT, PLUM, BRICK } from '../../theme';
import { MovementLibrary } from '../learn/Guides';

// What Birdseye, Move and Journal show until someone joins. Learn and the
// Movement Library stay open so people can look around first.
export default function LockedTab({ children, showOverlay = true, showLibrary = false }) {
  const { profile } = useAuth();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const pastDue = profile?.membership_status === 'past_due';
  const canceled = profile?.membership_status === 'canceled';

  async function join(plan) {
    setBusy(plan); setError('');
    try { window.location.href = await startCheckout(plan); }
    catch (e) { setError(e.message); setBusy(''); }
  }

  const card = (
    <div style={{ background: INK_2, borderTop: `2px solid ${PLUM}`, boxShadow: '0 8px 30px color-mix(in srgb, black 25%, transparent)' }} className="rounded-lg px-6 py-6 text-center">
      <Lock size={22} color={PLUM} className="mx-auto mb-2" />
      <h2 style={{ color: PLUM }} className="text-xl font-medium mb-1">
        {pastDue ? 'Payment needs attention' : canceled ? 'Welcome back' : 'Members only'}
      </h2>
      <div className="space-y-2 mt-3 mb-3 text-left">
        {PLANS.map((p) => (
          <div key={p.id} style={{ background: INK, border: `1px solid color-mix(in srgb, ${PLUM} ${p.id === 'mentor' ? 60 : 25}%, transparent)` }} className="rounded-md px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <span style={{ color: PAPER }} className="text-base font-medium">{p.name}</span>
              <span style={{ color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="text-lg font-semibold">{money(p.price)}<span style={{ color: TEXT_SOFT }} className="text-sm font-normal"> / month</span></span>
            </div>
            <p style={{ color: PAPER_DIM }} className="text-sm mb-2">{p.line}</p>
            {p.bullets && (
              <ul style={{ color: TEXT_SOFT }} className="text-sm mb-2 space-y-0.5">
                {p.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            )}
            <button onClick={() => join(p.id)} disabled={!!busy} style={{ background: PLUM, color: INK }} className="w-full rounded-md py-2.5 text-sm font-medium">
              {busy === p.id ? 'Opening Secure Checkout…' : pastDue || canceled ? `Update with ${p.name}` : `Join ${p.name}`}
            </button>
          </div>
        ))}
      </div>
      {error && <div style={{ color: BRICK }} className="text-sm mb-2">{error}</div>}
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-1">Cancel anytime.</div>
      <p style={{ color: TEXT_SOFT }} className="text-xs">Payment is handled securely by Stripe.</p>
    </div>
  );

  // The real tab sits behind, blurred and untouchable. While the app tour
  // runs it's shown clearly (no popup yet) so the tour can point at it.
  return (
    <div className="relative">
      <div
        inert=""
        aria-hidden="true"
        className="pointer-events-none select-none"
        style={showOverlay ? { filter: 'blur(5px)', opacity: 0.55, maxHeight: '100svh', overflow: 'hidden' } : undefined}
      >
        {children}
      </div>
      {showOverlay && (
        <div className="absolute inset-x-0 top-0 max-w-md mx-auto px-4 pt-3 space-y-3">
          {card}
          {showLibrary && <MovementLibrary hrZones={null} />}
        </div>
      )}
    </div>
  );
}
