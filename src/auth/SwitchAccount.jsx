import React, { useState } from 'react';
import { Repeat, X } from '../lib/icons';
import Portal from '../Portal';
import { useAuth } from './AuthContext';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, PLUM, BRICK } from '../theme';

function viewName(role) {
  return role === 'trainer' ? 'Coach view' : 'Client view';
}

// What carries over from the other login when someone asks to "load my info" (never roles or billing).
const COPY_FIELDS = [
  'full_name', 'avatar_url', 'age', 'gender', 'bodyweight_lb', 'resting_hr_bpm', 'max_hr_bpm', 'max_hr_measured',
  'resistance_goal', 'aerobic_goal', 'flexibility_goal', 'aerobic_goal_minutes', 'balance_goal',
  'track_aerobic_goal', 'track_resistance_goal', 'track_flexibility_goal', 'track_balance_goal',
  'week_start_day', 'custom_activities', 'program', 'screening', 'consented_at', 'consent_version', 'tour_done',
];

function LinkPopup({ onClose, onDone }) {
  const { linkAccount, updateProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [found, setFound] = useState(null); // { profile, email } once linked, offering to load their info

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await linkAccount(email, password);
    setBusy(false);
    if (res.error) { setError(res.error.message); return; }
    if (res.otherProfile && (res.otherProfile.full_name || res.otherProfile.avatar_url)) setFound({ profile: res.otherProfile, email: res.otherEmail });
    else onDone();
  }

  async function loadInfo() {
    setBusy(true); setError('');
    const fields = {};
    COPY_FIELDS.forEach((k) => { if (found.profile[k] !== undefined && found.profile[k] !== null) fields[k] = found.profile[k]; });
    const { error: err } = await updateProfile(fields);
    setBusy(false);
    if (err) setError(err.message); else onDone();
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center px-4" onClick={found ? undefined : onClose}>
        <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" />
        {found ? (
          <div onClick={(e) => e.stopPropagation()} style={{ background: INK_2, borderTop: `2px solid ${PLUM}` }} className="relative w-full max-w-xs rounded-2xl px-5 py-5 text-center">
            <div style={{ color: PAPER }} className="text-base font-medium mb-1">Linked!</div>
            <p style={{ color: TEXT_SOFT }} className="text-sm mb-3">Load your name, photo and settings from {found.email}{found.profile.full_name ? ` (${found.profile.full_name})` : ''} into this account?</p>
            {error && <div style={{ color: BRICK }} className="text-sm mb-2">{error}</div>}
            <button onClick={loadInfo} disabled={busy} style={{ background: PLUM, color: INK }} className="w-full rounded-md py-2.5 text-sm font-medium mb-1">{busy ? 'Loading…' : 'Load my info'}</button>
            <button onClick={onDone} disabled={busy} style={{ color: TEXT_SOFT }} className="w-full text-sm py-2">Skip</button>
          </div>
        ) : (
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} style={{ background: INK_2, borderTop: `2px solid ${PLUM}` }} className="relative w-full max-w-xs rounded-2xl px-5 py-5 text-center">
            <div className="flex items-start justify-between mb-2">
              <div style={{ color: PAPER }} className="text-base font-medium text-left">Link Your Other Account</div>
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
        )}
      </div>
    </Portal>
  );
}

// One-tap flip between the coach and personal accounts. For a coach who
// hasn't linked yet it opens the link form first.
export function ViewToggle({ className = '', compact = false }) {
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
      {compact ? (
        <button
          onClick={go}
          aria-label={`Switch to ${other ? viewName(other.role) : 'Client view'}`}
          title={`Switch to ${other ? viewName(other.role) : 'Client view'}`}
          style={{ background: INK_3, color: PLUM }}
          className={`w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0 ${className}`}
        >
          <Repeat size={15} />
        </button>
      ) : (
        <button
          onClick={go}
          style={{ background: INK_3, color: PAPER_DIM }}
          className={`rounded-full px-3 py-1.5 text-sm font-medium inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}
        >
          <Repeat size={14} /> {other ? viewName(other.role) : 'Client view'}
        </button>
      )}
      {error && <span style={{ color: BRICK }} className="text-sm ml-2">{error}</span>}
      {linking && <LinkPopup onClose={() => setLinking(false)} onDone={() => setLinking(false)} />}
    </>
  );
}

// Account menu: the switch itself lives in the top bar once two logins are linked. Here: one slim
// line showing the linked login (with Unlink), or a way to link another login if none is yet.
export function SwitchAccountSection() {
  const { linkedOthers, unlinkAccount } = useAuth();
  const [linking, setLinking] = useState(false);
  const other = linkedOthers[0];
  if (!other) {
    return (
      <>
        <div className="text-center mb-2">
          <button onClick={() => setLinking(true)} style={{ color: TEXT_SOFT }} className="text-sm underline">Link Another Account</button>
        </div>
        {linking && <LinkPopup onClose={() => setLinking(false)} onDone={() => setLinking(false)} />}
      </>
    );
  }
  return (
    <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-2 truncate">
      Linked: {other.email}{' '}
      <button onClick={() => unlinkAccount(other.id)} className="underline">Unlink</button>
    </div>
  );
}
