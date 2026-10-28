import React, { useState } from 'react';
import { Send, QrCode } from '../../lib/icons';
import { shareInvite } from '../../lib/invite';
import InviteQR from './InviteQR';
import { INK_2, PAPER, TEXT_SOFT, BRICK } from '../../theme';

// Account (members and the coach): invite from the phone's share sheet, or show a QR code to scan in person.
export default function InviteRow() {
  const [note, setNote] = useState('');
  const [qr, setQr] = useState(false);
  async function go() {
    const result = await shareInvite();
    setNote(result === 'copied' ? 'Copied. Paste it into a message.' : result === 'failed' ? "Couldn't share. Try again." : '');
  }
  const btn = 'flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium';
  return (
    <div className="mb-2">
      <div className="flex gap-2">
        <button onClick={go} style={{ background: INK_2, color: PAPER }} className={btn}><Send size={16} /> Invite a Friend</button>
        <button onClick={() => setQr(true)} style={{ background: INK_2, color: PAPER }} className={btn}><QrCode size={16} /> Show QR Code</button>
      </div>
      {note && <div style={{ color: note.startsWith("Couldn't") ? BRICK : TEXT_SOFT }} className="text-sm text-center mt-1">{note}</div>}
      {qr && <InviteQR onClose={() => setQr(false)} />}
    </div>
  );
}
