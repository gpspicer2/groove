import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY, BRICK } from '../theme';
import Wordmark from '../Wordmark';

export default function AuthScreen({ recovering = false, onRecovered }) {
  const [mode, setMode] = useState(recovering ? 'newpassword' : 'signin'); // 'signin' | 'signup' | 'reset' | 'newpassword'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const needsEmail = mode !== 'newpassword';
  const needsPassword = mode !== 'reset';
  const canSubmit = (!needsEmail || email.trim().length > 0) && (!needsPassword || password.length >= 6) && !busy;
  // Sign in and sign up look distinct at a glance — otherwise it takes a
  // beat to notice which mode you're actually in.
  const accent = mode === 'signup' ? SKY : LIME;
  const TITLES = { signin: 'Welcome back', signup: 'Create your account', reset: 'Reset your password', newpassword: 'Choose a new password' };
  const SUBMIT = { signin: 'Sign in', signup: 'Sign up', reset: 'Email me a reset link', newpassword: 'Save password' };

  function switchMode(next) { setMode(next); setError(''); setInfo(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    setInfo('');

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setError(error.message);
    } else if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) setError(error.message);
      // With email confirmation on, Supabase returns no session until the
      // link in the confirmation email is tapped.
      else if (!data?.session) { setMode('signin'); setPassword(''); setInfo('Almost there! Check your email to confirm your account, then sign in.'); }
    } else if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
      if (error) setError(error.message);
      else setInfo('Check your email for a link to reset your password.');
    } else {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setError(error.message);
      else { setBusy(false); onRecovered?.(); return; }
    }
    setBusy(false);
  }

  return (
    <div style={{ background: INK, fontFamily: 'Manrope, sans-serif' }} className="min-h-[100svh] flex items-center justify-center px-4">
      <div style={{ background: INK_2, borderTop: `2px solid ${accent}` }} className="w-full max-w-sm rounded-lg px-6 py-8 text-center">
        <Wordmark height={54} className="mb-6 mx-auto block" />
        <h1 style={{ color: accent, fontFamily: 'Manrope, sans-serif' }} className="text-2xl font-medium mb-6">
          {TITLES[mode]}
        </h1>

        <form onSubmit={handleSubmit}>
          {needsEmail && (<>
          <label htmlFor="email" style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide">Email</label>
          <input
            type="email"
            name="email"
            id="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ background: INK_3, color: PAPER }}
            className="w-full rounded-md px-3 py-3 mt-1 mb-4 text-sm outline-none"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
          />
          </>)}

          {needsPassword && (<>
          <label style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide">Password</label>
          <input
            type="password"
            name="password"
            id="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            style={{ background: INK_3, color: PAPER }}
            className="w-full rounded-md px-3 py-3 mt-1 mb-4 text-sm outline-none"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
          </>)}

          {error && <div style={{ color: BRICK }} className="text-sm mb-4">{error}</div>}
          {info && <div style={{ color: PAPER_DIM }} className="text-sm mb-4">{info}</div>}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{ background: canSubmit ? accent : INK_3, color: canSubmit ? INK : TEXT_SOFT }}
            className="w-full rounded-md py-3 text-sm font-medium mb-4"
          >
            {busy ? 'Please wait…' : SUBMIT[mode]}
          </button>
        </form>

        {mode === 'signin' && (
          <button onClick={() => switchMode('reset')} style={{ color: TEXT_SOFT }} className="w-full text-sm text-center mb-3">
            Forgot password?
          </button>
        )}
        {mode !== 'newpassword' && (
          <button
            onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
            style={{ color: TEXT_SOFT }}
            className="w-full text-sm text-center"
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : mode === 'signup' ? 'Already have an account? Sign in' : 'Back to sign in'}
          </button>
        )}
      </div>
    </div>
  );
}
