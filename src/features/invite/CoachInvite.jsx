import React, { useState } from 'react';
import { Send, QrCode } from '../../lib/icons';
import { shareInvite } from '../../lib/invite';
import InviteQR from './InviteQR';
import { INK_2, PAPER, TEXT_SOFT, BRICK, SKY } from '../../theme';

// Coach Members tab: send the invite from the share sheet, or show a QR code to scan in person.
export default function CoachInvite() {
  const [qr, setQr] = useState(false);
  const [note, setNote] = useState('');
  async function go() {
    const r = await shareInvite();
    setNote(r === 'copied' ? 'Copied. Paste it into a message.' : r === 'failed' ? "Couldn't share. Try again." : '');
  }
  const btn = 'flex-1 flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium';
  return (
    <div className="mb-3">
      <div className="flex gap-2">
        <button onClick={go} style={{ background: INK_2, color: PAPER }} className={btn}><Send size={16} color={SKY} /> Invite Someone</button>
        <button onClick={() => setQr(true)} style={{ background: INK_2, color: PAPER }} className={btn}><QrCode size={16} color={SKY} /> Show QR Code</button>
      </div>
      {note && <div style={{ color: note.startsWith("Couldn't") ? BRICK : TEXT_SOFT }} className="text-sm text-center mt-1">{note}</div>}
      {qr && <InviteQR onClose={() => setQr(false)} />}
    </div>
  );
}
