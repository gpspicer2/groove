import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { TEXT_SOFT, LIME, BRICK } from '../theme';
import GoogleG, { GOOGLE_LOGIN } from './GoogleG';

// Account > Settings: a quiet line to add Google as another way to sign in to this same account
// (even when the Google email differs from the account's email). Needs "Allow manual linking" on in Supabase.
export default function GoogleRow() {
  const [connected, setConnected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!GOOGLE_LOGIN) return;
    supabase.auth.getUserIdentities().then(({ data }) => {
      setConnected(Boolean(data?.identities?.some((i) => i.provider === 'google')));
    });
  }, []);

  if (!GOOGLE_LOGIN || connected === null) return null;

  async function connect() {
    setBusy(true); setError('');
    const { error: err } = await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (err) {
      setError(/manual linking/i.test(err.message) ? 'Google linking is not switched on yet. Please tell Greg.' : err.message);
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 text-center">
      {connected ? (
        <div style={{ color: TEXT_SOFT }} className="text-sm inline-flex items-center justify-center gap-2 py-1.5">
          <GoogleG size={14} />
          <span style={{ background: LIME }} className="w-1.5 h-1.5 rounded-full" /> Google Sign-In Connected
        </div>
      ) : (
        <button disabled={busy} onClick={connect} style={{ color: TEXT_SOFT }} className="text-sm inline-flex items-center justify-center gap-2 py-1.5">
          <GoogleG size={14} />
          {busy ? 'Opening…' : 'Sign In With Google Too'}
        </button>
      )}
      {error && <div style={{ color: BRICK }} className="text-sm mt-1">{error}</div>}
    </div>
  );
}
