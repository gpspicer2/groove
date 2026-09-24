import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, BRICK } from '../theme';

export default function AuthScreen() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length >= 6 && !busy;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    setInfo('');

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) setError(error.message);
    }
    setBusy(false);
  }

  return (
    <div style={{ background: INK, fontFamily: 'Inter, sans-serif' }} className="min-h-[100svh] flex items-center justify-center px-4">
      <div style={{ background: INK_2, borderTop: `2px solid ${LIME}` }} className="w-full max-w-sm rounded-lg px-6 py-8 text-center">
        <div style={{ color: LIME, fontFamily: "'Segoe UI', Manrope, sans-serif" }} className="text-3xl font-extrabold tracking-wide italic mb-6">
          GROOVE
        </div>
        <h1 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-2xl font-medium mb-6">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>

        <form onSubmit={handleSubmit}>
          <label style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ background: INK_3, color: PAPER }}
            className="w-full rounded-md px-3 py-3 mt-1 mb-4 text-sm outline-none"
            autoComplete="email"
          />

          <label style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            style={{ background: INK_3, color: PAPER }}
            className="w-full rounded-md px-3 py-3 mt-1 mb-4 text-sm outline-none"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />

          {error && <div style={{ color: BRICK }} className="text-sm mb-4">{error}</div>}
          {info && <div style={{ color: PAPER_DIM }} className="text-sm mb-4">{info}</div>}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{ background: canSubmit ? LIME : INK_3, color: canSubmit ? INK : TEXT_SOFT }}
            className="w-full rounded-md py-3 text-sm font-medium mb-4"
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <button
          onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); setInfo(''); }}
          style={{ color: TEXT_SOFT }}
          className="w-full text-sm text-center"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
