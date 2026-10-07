import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import { INK_2, PAPER, TEXT_SOFT, PLUM } from '../../theme';
import { tipsFor } from './conditions';

// Short tips from Greg based on the health check. Renders nothing until
// there are reviewed tips for what the person reported.
export default function TailoredTips() {
  const { profile } = useAuth();
  const tips = tipsFor(profile?.screening);
  if (tips.length === 0) return null;
  return (
    <div style={{ background: INK_2, borderTop: `2px solid ${PLUM}` }} className="rounded-lg px-5 py-4">
      <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-2">Tailored to you</div>
      <div className="space-y-2">
        {tips.map((t) => <p key={t} style={{ color: PAPER }} className="text-sm">{t}</p>)}
      </div>
    </div>
  );
}
