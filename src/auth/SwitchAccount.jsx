import React, { useState } from 'react';
import { Repeat, X } from '../lib/icons';
import Portal from '../Portal';
import { useAuth } from './AuthContext';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, PLUM, BRICK } from '../theme';

function viewName(role) {
  return role === 'trainer' ? 'Coach view' : 'Client view';
}

function LinkPopup({ onClose, onDone }) {
  const { linkAccount } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    const { error: err } = await linkAccount(email, password);
    setBusy(false);
    if (err) setError(err.message); else onDone();
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center px-4" onClick={onClose}>
        <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" />
        <form onSubmit={submit} onClick={(e) => e.stopPropagation()} style={{ background: INK_2, borderTop: `2px solid ${PLUM}` }} className="relative w-full max-w-xs rounded-2xl px-5 py-5 text-center">
          <div className="flex items-start justify-between mb-2">
            <div style={{ color: PAPER }} className="text-base font-medium text-left">Link your other account</div>
            <button type="button" onClick={onClose} style={{ color: TEXT_SOFT }} className="p-1 -m-1" aria-label="Close"><X size={18} /></button>
          </div>
          <p style={{ color: TEXT_SOFT }} className="text-sm text-left mb-3">Sign in once, then flip between both accounts with one tap on this device.</p>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoCapitalize="none" autoCorrect="off" style={{ background: INK_3, color: PAPER }} className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center mb-2" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" style={{ background: INK_3, color: PAPER }} className="w-full rounded-md px-3 py-2.5 text-sm outline-none text-center mb-3" />
          {error && <div style={{ color: BRICK }} className="text-sm mb-2">{error}</div>}
          <button type="submit" disabled={busy || !email.trim() || !password} style={{ background: email.trim() && password ? PLUM : INK_3, color: email.trim() && password ? INK : TEXT_SOFT }} className="w-full rounded-md py-2.5 text-sm font-medium">
            {busy ? 'Linking…' : 'Link account'}
          </button>
        </form>
      </div>
    </Portal>
  );
}

// One-tap flip between the coach and personal accounts. For a coach who
// hasn't linked yet it opens the link form first.
export function ViewToggle({ className = '' }) {
  const { isTrainer, linkedOthers, switchTo } = useAuth();
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState('');
  const other = linkedOthers[0];
  if (!other && !isTrainer) return null;

  async function go() {
    if (!other) { setLinking(true); return; }
    const { error: err } = await switchTo(other.id);
    if (err) setError(err.message);
  }

  return (
    <>
      <button
        onClick={go}
        style={{ background: INK_3, color: PAPER_DIM }}
        className={`rounded-full px-3 py-1.5 text-sm font-medium inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}
      >
        <Repeat size={14} /> {other ? viewName(other.role) : 'Client view'}
      </button>
      {error && <span style={{ color: BRICK }} className="text-sm ml-2">{error}</span>}
      {linking && <LinkPopup onClose={() => setLinking(false)} onDone={() => setLinking(false)} />}
    </>
  );
}

// The same control inside the Account menu, with the option to unlink.
export function SwitchAccountSection() {
  const { isTrainer, linkedOthers, unlinkAccount } = useAuth();
  if (!isTrainer && linkedOthers.length === 0) return null;
  const other = linkedOthers[0];
  return (
    <div style={{ background: INK_3 }} className="rounded-md px-4 py-3 mb-2 text-center">
      <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide font-bold mb-2">Switch view</div>
      <ViewToggle className="mx-auto" />
      {other && (
        <div style={{ color: TEXT_SOFT }} className="text-sm mt-2">
          Linked: {other.email}{' '}
          <button onClick={() => unlinkAccount(other.id)} className="underline">Unlink</button>
        </div>
      )}
    </div>
  );
}
