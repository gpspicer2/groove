import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, PLUM, SKY, BRICK } from '../theme';
import Wordmark from '../Wordmark';
import { isReturningDevice } from './AuthContext';
import { Eye, EyeOff } from '../lib/icons';

// "Continue with Google" shows only once Google sign-in is switched on (VITE_GOOGLE_LOGIN=true in Vercel).
const GOOGLE_LOGIN = import.meta.env.VITE_GOOGLE_LOGIN === 'true';

// Google's four-color "G" (brand colors stay as Google defines them, in light and dark mode).
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function AuthScreen({ recovering = false, onRecovered }) {
  const [mode, setMode] = useState(recovering ? 'newpassword' : isReturningDevice() ? 'signin' : 'signup'); // 'signin' | 'signup' | 'reset' | 'newpassword'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const needsEmail = mode !== 'newpassword';
  const needsPassword = mode !== 'reset';
  // New passwords are typed twice so a typo can't lock someone out.
  const needsConfirm = mode === 'signup' || mode === 'newpassword';
  const mismatch = needsConfirm && confirm.length > 0 && confirm !== password;
  const canSubmit = (!needsEmail || email.trim().length > 0) && (!needsPassword || password.length >= 6) && (!needsConfirm || (confirm === password && confirm.length > 0)) && !busy;
  // Creating an account gets its own color so it never looks like signing in.
  const accent = mode === 'signup' ? SKY : PLUM;
  const TITLES = { signin: '', signup: 'Create your account', reset: 'Reset your password', newpassword: 'Choose a new password' };
  const SUBMIT = { signin: 'Sign in', signup: 'Sign up', reset: 'Email me a reset link', newpassword: 'Save password' };

  async function handleGoogle() {
    setError(''); setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) { setError(error.message); setBusy(false); }
  }

  function switchMode(next) { setMode(next); setError(''); setInfo(''); setConfirm(''); setShowPw(false); }

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
      else if (!data?.session) { setMode('signin'); setPassword(''); setConfirm(''); setInfo('Almost there! Check your email to confirm your account, then sign in.'); }
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

        {GOOGLE_LOGIN && (mode === 'signin' || mode === 'signup') && (
          <>
            <button type="button" onClick={handleGoogle} disabled={busy} style={{ background: INK_3, color: PAPER }} className="w-full rounded-md py-3 text-sm font-medium mb-3 flex items-center justify-center gap-3">
              <GoogleG />
              Continue with Google
            </button>
            <div style={{ color: TEXT_SOFT }} className="text-sm mb-3">or</div>
          </>
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
          <div className="relative mb-3">
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              type={showPw ? 'text' : 'password'}
              name="password"
              id="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signin' ? 'Password' : 'Password (6+ characters)'}
              style={{ background: INK_3, color: PAPER }}
              className="w-full rounded-md pl-3 pr-10 py-3 text-sm outline-none"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              style={{ color: TEXT_SOFT }}
              className="absolute right-0 top-0 bottom-0 px-3 flex items-center"
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {needsConfirm && (
            <div className="mb-3">
              <label htmlFor="confirm" className="sr-only">Confirm Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                name="confirm"
                id="confirm"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Confirm password"
                style={{ background: INK_3, color: PAPER, outline: mismatch ? `1px solid ${BRICK}` : 'none' }}
                className="w-full rounded-md px-3 py-3 text-sm outline-none"
                autoComplete="new-password"
              />
              {mismatch && <div style={{ color: BRICK }} className="text-sm mt-1">Passwords don't match yet</div>}
            </div>
          )}
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
