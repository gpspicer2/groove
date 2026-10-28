import React, { useState } from 'react';
import { Send } from '../../lib/icons';
import { shareInvite } from '../../lib/invite';
import InviteQR from './InviteQR';
import { INK_2, PAPER, TEXT_SOFT, BRICK } from '../../theme';

// Account: one tap opens the phone's share sheet with a ready-made note and the invite link.
export default function InviteRow() {
  const [note, setNote] = useState('');
  const [qr, setQr] = useState(false);
  async function go() {
    const result = await shareInvite();
    setNote(result === 'copied' ? 'Copied. Paste it into a message.' : result === 'failed' ? "Couldn't share. Try again." : '');
  }
  return (
    <div className="mb-2">
      <button onClick={go} style={{ background: INK_2, color: PAPER }} className="w-full flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium">
        <Send size={16} /> Invite a Friend
      </button>
      <button onClick={() => setQr(true)} style={{ color: TEXT_SOFT }} className="w-full text-sm underline py-1.5">Show a QR Code Instead</button>
      {qr && <InviteQR onClose={() => setQr(false)} />}
      {note && <div style={{ color: note.startsWith("Couldn't") ? BRICK : TEXT_SOFT }} className="text-sm text-center mt-1">{note}</div>}
    </div>
  );
}
