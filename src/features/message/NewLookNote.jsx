import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, INK } from '../../theme';

// One-time note from Greg (2026-11-08): the new look, how to keep Groove on the home screen, and a friendly way to say what
// would make Groove worth opening. "Send to Greg" opens the member's text app with the message already typed, so no
// database is involved. Shown once per person per device; brand-new members skip it.
const GREG_SMS = '+16034754544';
const CHIPS = ['Haven\'t Had Time', 'Not Sure What to Do First', 'Not for Me Right Now'];
const keyFor = (id) => `groove:newLookNote:${id || ''}`;

function installed() {
  try { return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone); } catch { return false; }
}

export default function NewLookNote() {
  const { user, profile } = useAuth();
  const [gone, setGone] = useState(() => { try { return localStorage.getItem(keyFor(user?.id)) === '1'; } catch { return false; } });
  const [how, setHow] = useState(false);
  const [chip, setChip] = useState('');
  const [text, setText] = useState('');
  const isiPhone = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  const added = installed();

  const joinedRecently = profile?.created_at && Date.now() - new Date(profile.created_at).getTime() < 3 * 864e5;
  if (!user || gone || joinedRecently) return null;

  const close = () => {
    setGone(true);
    try { localStorage.setItem(keyFor(user.id), '1'); } catch { /* storage blocked */ }
  };
  const message = ['Groove feedback:', chip, text.trim()].filter(Boolean).join(' ');
  const canSend = Boolean(chip || text.trim());

  const steps = {
    iPhone: 'Open Groove in Safari, tap the Share button (the square with an arrow), scroll down, tap Add to Home Screen, then Add.',
    Android: 'Open Groove in Chrome, tap the three dots, then tap Add to Home screen (or Install app).',
  };
  const order = isiPhone ? ['iPhone', 'Android'] : ['Android', 'iPhone'];

  return (
    <div style={{ background: INK_2, borderTop: `2px solid ${LIME}` }} className="rounded-lg px-5 py-4 text-center">
      <div style={{ color: LIME }} className="text-sm uppercase tracking-wide font-bold mb-1">A Quick Note From Greg</div>
      <div style={{ color: PAPER }} className="text-base">
        Groove has a fresh new look (hello, disco ball!).{added ? '' : ' It works best from your home screen, like any other app.'}
      </div>
      {!added && (
        <>
          <button onClick={() => setHow(!how)} style={{ color: LIME }} className="text-base font-bold mt-2">{how ? 'Hide Steps' : 'Show Me How'}</button>
          {how && (
            <div className="text-left mt-2 space-y-2">
              {order.map((k) => (
                <div key={k} style={{ background: INK_3 }} className="rounded-md px-3 py-2">
                  <div style={{ color: PAPER }} className="text-sm font-bold">{k}</div>
                  <div style={{ color: PAPER_DIM }} className="text-sm leading-snug">{steps[k]}</div>
                </div>
              ))}
              <div style={{ color: TEXT_SOFT }} className="text-[13px] text-center">Already added it? Delete the old icon and add it again to get the new one.</div>
            </div>
          )}
        </>
      )}
      <div style={{ borderTop: `1px dashed ${INK_3}` }} className="mt-3 pt-3">
        <div style={{ color: PAPER }} className="text-base font-bold">I'd love your honest take.</div>
        <div style={{ color: PAPER_DIM }} className="text-sm mt-0.5">What would make Groove more useful to you, or what has kept you from opening it? No wrong answers.</div>
        <div className="flex flex-wrap justify-center gap-1.5 mt-2">
          {CHIPS.map((c) => (
            <button key={c} onClick={() => setChip(chip === c ? '' : c)} style={{ background: chip === c ? LIME : INK_3, color: chip === c ? INK : PAPER_DIM }} className="rounded-full px-3 py-1.5 text-sm">{c}</button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Anything else you want me to know"
          style={{ background: INK_3, color: PAPER }}
          className="w-full rounded-md px-3 py-2 mt-2 text-base outline-none resize-none"
        />
        <a
          href={canSend ? `sms:${GREG_SMS}?&body=${encodeURIComponent(message)}` : undefined}
          onClick={() => { if (canSend) setTimeout(close, 400); }}
          aria-disabled={!canSend}
          style={{ background: canSend ? LIME : INK_3, color: canSend ? INK : TEXT_SOFT, pointerEvents: canSend ? 'auto' : 'none' }}
          className="block w-full rounded-md py-2.5 mt-2 text-base font-medium"
        >
          Send to Greg
        </a>
      </div>
      <button onClick={close} style={{ color: TEXT_SOFT }} className="text-sm underline mt-2">Got It</button>
    </div>
  );
}
