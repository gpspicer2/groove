import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import Wordmark from '../../Wordmark';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, PLUM, BRICK } from '../../theme';

// First step for every new member (and anyone who somehow has no name yet): Greg needs to know who is who.
// Google sign-in already knows a name, so it is filled in for them to confirm.
export default function NameScreen() {
  const { user, updateProfile, signOut } = useAuth();
  const meta = user?.user_metadata || {};
  const full = String(meta.full_name || meta.name || '').trim();
  const [first, setFirst] = useState(full.split(/\s+/)[0] || '');
  const [last, setLast] = useState(full.split(/\s+/).slice(1).join(' '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const ok = first.trim().length > 0 && last.trim().length > 0;
  const tidy = (s) => s.trim().replace(/\s+/g, ' ');

  async function save(e) {
    e.preventDefault();
    if (!ok || saving) return;
    setSaving(true); setError('');
    const err = (await updateProfile({ full_name: `${tidy(first)} ${tidy(last)}` }))?.error;
    if (err) { setError(err.message); setSaving(false); }
  }

  const box = { background: INK_3, color: PAPER };
  return (
    <div style={{ background: INK, fontFamily: 'Outfit, sans-serif' }} className="min-h-[100svh] flex items-start justify-center px-4 pt-[8svh]">
      <form onSubmit={save} style={{ background: INK_2, borderTop: `2px solid ${PLUM}` }} className="w-full max-w-sm rounded-lg px-6 py-6 text-center">
        <Wordmark height={40} className="mb-4 mx-auto block" />
        <h1 style={{ color: PLUM }} className="text-lg font-medium mb-1">What's Your Name?</h1>
        <p style={{ color: PAPER_DIM }} className="text-sm mb-4">So Greg knows who is who.</p>
        <input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="First name" autoComplete="given-name" autoCapitalize="words" style={box} className="w-full rounded-md px-3 py-3 mb-3 text-sm outline-none text-center" />
        <input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Last name" autoComplete="family-name" autoCapitalize="words" style={box} className="w-full rounded-md px-3 py-3 mb-3 text-sm outline-none text-center" />
        {error && <div style={{ color: BRICK }} className="text-sm mb-3">{error}</div>}
        <button type="submit" disabled={!ok || saving} style={{ background: ok ? PLUM : INK_3, color: ok ? INK : TEXT_SOFT }} className="w-full rounded-md py-3 text-sm font-medium mb-3">
          {saving ? 'Saving…' : 'Continue'}
        </button>
        <button type="button" onClick={signOut} style={{ color: TEXT_SOFT }} className="text-sm underline">Sign Out</button>
      </form>
    </div>
  );
}
