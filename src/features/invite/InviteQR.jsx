import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Portal from '../../Portal';
import { X } from '../../lib/icons';
import { useSwipeDown, GRAB_BAR_CLASS } from '../../lib/swipeDown';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY } from '../../theme';
import { INVITE_URL } from '../../lib/invite';

// A scannable code for the invite link, shown on a white card in every theme so cameras read it reliably.
export default function InviteQR({ onClose }) {
  const sheet = useSwipeDown(onClose);
  const [src, setSrc] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    QRCode.toDataURL(INVITE_URL, { margin: 1, width: 640, errorCorrectionLevel: 'M', color: { dark: '#1a1a1a', light: '#ffffff' } }).then(setSrc).catch(() => setSrc(''));
  }, []);
  async function copy() {
    try { await navigator.clipboard.writeText(INVITE_URL); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  }
  return (
    <Portal>
      <div style={{ background: 'rgba(0,0,0,0.6)' }} className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
        <div ref={sheet.ref} {...sheet.handlers} style={{ background: INK_2, ...sheet.style }} className="w-full max-w-md rounded-t-2xl px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
          <div style={{ background: TEXT_SOFT, opacity: 0.45 }} className={GRAB_BAR_CLASS} />
          <div className="flex items-center justify-between mb-2">
            <span className="w-6" />
            <h2 style={{ color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="text-lg font-medium">Scan to Join Groove</h2>
            <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-1 -m-1" aria-label="Close"><X size={20} /></button>
          </div>
          <div className="mx-auto rounded-2xl p-3 bg-white" style={{ width: 'min(78vw, 300px)', aspectRatio: '1 / 1' }}>
            {src ? <img src={src} alt="QR code that opens the Groove invite page" className="w-full h-full" /> : <div className="w-full h-full" />}
          </div>
          <div style={{ color: PAPER_DIM }} className="text-sm mt-3">Open the camera on a phone and point it here.</div>
          <div style={{ color: TEXT_SOFT }} className="text-sm mt-0.5 break-all">{INVITE_URL.replace('https://', '')}</div>
          <button onClick={copy} style={{ background: INK_3, color: copied ? SKY : PAPER }} className="w-full rounded-md py-2.5 text-sm font-medium mt-3">{copied ? 'Link Copied' : 'Copy Link'}</button>
        </div>
      </div>
    </Portal>
  );
}
