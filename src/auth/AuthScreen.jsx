import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, PLUM, BRICK } from '../theme';
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
  const accent = PLUM;
  const TITLES = { signin: '', signup: 'Create your account', reset: 'Reset your password', newpassword: 'Choose a new password' };
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
    <div style={{ background: INK, fontFamily: 'Outfit, sans-serif' }} className="min-h-[100svh] flex items-start justify-center px-4 pt-[7svh]">
      <div style={{ background: INK_2, borderTop: `2px solid ${accent}` }} className="w-full max-w-sm rounded-lg px-6 py-6 text-center">
        {/* Compact on purpose: everything must fit above the phone keyboard. */}
        <Wordmark height={44} className="mb-4 mx-auto block" />
        {TITLES[mode] && (
          <h1 style={{ color: accent, fontFamily: 'Outfit, sans-serif' }} className="text-lg font-medium mb-3">
            {TITLES[mode]}
          </h1>
        )}

        <form onSubmit={handleSubmit}>
          {needsEmail && (<>
          <label htmlFor="email" className="sr-only">Email</label>
          <input
            type="email"
            name="email"
            id="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            style={{ background: INK_3, color: PAPER }}
            className="w-full rounded-md px-3 py-3 mb-3 text-sm outline-none"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
          />
          </>)}

          {needsPassword && (<>
          <label htmlFor="password" className="sr-only">Password</label>
          <input
            type="password"
            name="password"
            id="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password (6+ characters)"
            style={{ background: INK_3, color: PAPER }}
            className="w-full rounded-md px-3 py-3 mb-3 text-sm outline-none"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
          </>)}

          {error && <div style={{ color: BRICK }} className="text-sm mb-4">{error}</div>}
          {info && <div style={{ color: PAPER_DIM }} className="text-sm mb-4">{info}</div>}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{ background: canSubmit ? accent : INK_3, color: canSubmit ? INK : TEXT_SOFT }}
            className="w-full rounded-md py-3 text-sm font-medium mb-3"
          >
            {busy ? 'Please wait…' : SUBMIT[mode]}
          </button>
        </form>

        {mode === 'signin' && (
          <button onClick={() => switchMode('reset')} style={{ color: TEXT_SOFT }} className="w-full text-sm text-center mb-2 py-1">
            Forgot password?
          </button>
        )}
        {mode !== 'newpassword' && (
          <button
            onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
            style={{ color: TEXT_SOFT }}
            className="w-full text-sm text-center py-1"
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : mode === 'signup' ? 'Already have an account? Sign in' : 'Back to sign in'}
          </button>
        )}
      </div>
    </div>
  );
}
