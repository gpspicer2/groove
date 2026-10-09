import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { INK_2, INK_3, PAPER_DIM, TEXT_SOFT } from '../../theme';
import ScreeningFlow, { TONE_COLOR } from './ScreeningFlow';
import { RESULT_COPY, needsClearance } from './screening';

// Short reminder while a doctor's okay is still recommended. Used on
// Birdseye (only when clearance is pending) and in Account (always).
export default function ScreeningStatus({ alwaysShow = false, inset = false, compact = false }) {
  const { profile, updateProfile } = useAuth();
  const [retaking, setRetaking] = useState(false);
  const screening = profile?.screening;
  if (!screening) return null;
  const pending = needsClearance(screening);
  if (!pending && !alwaysShow) return null;

  const copy = RESULT_COPY[screening.result];
  const color = pending ? TONE_COLOR[copy.tone] : TONE_COLOR.good;

  function markCleared() {
    if (!window.confirm('Has your doctor cleared you for exercise?')) return;
    updateProfile({ screening: { ...screening, cleared_at: new Date().toISOString() } });
  }

  const status = pending
    ? copy.banner
    : screening.cleared_at ? 'Cleared by your doctor.' : copy.title + '.';

  return (
    <>
      <div style={{ background: inset ? INK_3 : INK_2, borderTop: `2px solid ${color}` }} className={`rounded-${inset ? 'md' : 'lg'} ${compact ? 'px-3 py-2.5 flex flex-col justify-center' : 'px-5 py-4'} text-center ${inset && !compact ? 'mb-2' : ''}`}>
        <div style={{ color }} className={`text-sm uppercase tracking-wide font-bold ${compact ? '' : 'mb-1'}`}>Health check</div>
        <div style={{ color: PAPER_DIM }} className="text-sm">{status}</div>
        <div className={`flex justify-center ${compact ? 'flex-col items-center gap-0.5 mt-1' : 'gap-4 mt-2'}`}>
          {pending && (
            <button onClick={markCleared} style={{ color: TEXT_SOFT }} className="text-sm underline">My doctor cleared me</button>
          )}
          <button onClick={() => setRetaking(true)} style={{ color: TEXT_SOFT }} className="text-sm underline">Update</button>
        </div>
      </div>
      {retaking && <ScreeningFlow onClose={() => setRetaking(false)} onDone={() => setRetaking(false)} />}
    </>
  );
}
