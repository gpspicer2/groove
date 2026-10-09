import React, { useState } from 'react';
import { Check } from '../../lib/icons';
import { useAuth } from '../../auth/AuthContext';
import Wordmark from '../../Wordmark';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, PLUM, BRICK } from '../../theme';

// Bump the version whenever the wording changes, so the date and text each
// person agreed to stay traceable.
export const CONSENT_VERSION = '2026-10-v3';

export const CONSENT_POINTS = [
  "Groove offers movement mentorship and education from Greg. It isn't medical care and doesn't replace your doctor.",
  'Physical activity carries some risk, including injury and, rarely, heart problems. Start where your health check suggests and build up gradually.',
  'If you feel chest pain, severe shortness of breath, dizziness, or faintness, stop right away and get help. Call 911 in an emergency.',
  'Answer the health check honestly, and tell Greg if your health changes.',
  'Greg can see your workouts and health answers. Your journal is private to you.',
  'You take part by choice, accept these risks, and release Greg from liability for injuries from your participation, to the extent the law allows.',
];

export default function ConsentScreen() {
  const { updateProfile, signOut } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleAgree() {
    setSaving(true);
    setError('');
    const err = (await updateProfile({ consented_at: new Date().toISOString(), consent_version: CONSENT_VERSION }))?.error;
    setSaving(false);
    if (err) setError(err.message);
  }

  return (
    <div style={{ background: INK, fontFamily: 'Outfit, sans-serif' }} className="h-[100svh] flex items-center justify-center px-4 py-4">
      <div style={{ background: INK_2, borderTop: `2px solid ${PLUM}` }} className="w-full max-w-sm max-h-full flex flex-col rounded-lg px-5 pt-4 pb-4">
        <Wordmark height={32} className="mb-2 mx-auto block shrink-0" />
        <h1 style={{ color: PLUM }} className="text-lg font-medium text-center mb-2 shrink-0">Before You Start</h1>
        <div className="space-y-2 mb-3 overflow-y-auto min-h-0 flex-1">
          {CONSENT_POINTS.map((p) => (
            <p key={p} style={{ color: PAPER_DIM }} className={`text-sm text-center ${p.startsWith('If you feel chest pain') ? 'font-bold' : ''}`}>{p}</p>
          ))}
        </div>
        <div className="shrink-0">
          <button onClick={() => setAgreed((v) => !v)} className="flex items-center justify-center gap-2.5 mb-3 mx-auto">
            <span
              style={{ background: agreed ? PLUM : INK_3, borderColor: agreed ? PLUM : TEXT_SOFT }}
              className="w-5 h-5 rounded border flex items-center justify-center shrink-0"
            >
              {agreed && <Check size={14} color={INK} strokeWidth={3} />}
            </span>
            <span style={{ color: PAPER }} className="text-sm">I've read this and agree.</span>
          </button>
          {error && <div style={{ color: BRICK }} className="text-sm mb-2 text-center">{error}</div>}
          <button
            onClick={handleAgree}
            disabled={!agreed || saving}
            style={{ background: agreed ? PLUM : INK_3, color: agreed ? INK : TEXT_SOFT }}
            className="w-full rounded-md py-3 text-sm font-medium mb-2"
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
          <button onClick={signOut} style={{ color: TEXT_SOFT }} className="w-full text-sm text-center">Sign out</button>
        </div>
      </div>
    </div>
  );
}
