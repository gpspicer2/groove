import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { notifyMessage } from '../../lib/push';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, PLUM, BRICK } from '../../theme';

// Greg writes a personal note to one member. It shows on their Birdseye until they tap Got It, and (if their
// Reminders are on) arrives as a notification. Needs the `messages` table (SQL in schema.sql).
export default function MessageComposer({ client, defaultText = '', startOpen = false, onClose }) {
  const first = (client.full_name || client.email || '').split(/[ @]/)[0];
  const [open, setOpen] = useState(startOpen);
  const [text, setText] = useState(defaultText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function send() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true); setError('');
    const { error: err } = await supabase.from('messages').insert({ recipient_id: client.id, body });
    if (err) {
      setError(/relation|does not exist|schema cache/i.test(err.message) ? 'Messages are not set up yet. Run the messages SQL in Supabase.' : err.message);
      setBusy(false);
      return;
    }
    notifyMessage(client.id);
    setBusy(false); setSent(true); setText(''); setOpen(false); onClose?.();
  }

  if (!open) {
    return (
      <div className="mb-3">
        <button onClick={() => { setOpen(true); setSent(false); }} style={{ background: INK_2, color: PAPER }} className="w-full rounded-2xl px-4 py-3 text-sm font-medium text-left">
          {sent ? `Sent. Write Another to ${first}` : `Message ${first}`}
        </button>
        {sent && <div style={{ color: TEXT_SOFT }} className="text-sm px-1 mt-1">They'll see it the next time they open Groove, and get a notification if their Reminders are on.</div>}
      </div>
    );
  }
  return (
    <div style={{ background: INK_2 }} className="rounded-2xl px-4 py-3.5 mb-3">
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-2">Message {first}</div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={600}
        autoFocus
        placeholder={`Write a note to ${first}`}
        style={{ background: INK_3, color: PAPER }}
        className="w-full rounded-md px-3 py-2.5 text-base outline-none resize-none"
      />
      {error && <div style={{ color: BRICK }} className="text-sm mt-1">{error}</div>}
      <div className="flex items-center gap-3 mt-2">
        <button onClick={() => { setOpen(false); onClose?.(); }} style={{ color: TEXT_SOFT }} className="text-sm px-2 py-2">Cancel</button>
        <button onClick={send} disabled={!text.trim() || busy} style={{ background: text.trim() ? PLUM : INK_3, color: text.trim() ? INK : TEXT_SOFT }} className="flex-1 rounded-md py-2.5 text-sm font-medium">
          {busy ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

// One tap, nothing to type: a warm welcome note for someone who has just set up. They see it as a card on Birdseye.
export function SendWelcome({ client, onWrite }) {
  const key = `groove:welcomeSent:${client.id}`;
  const [sent, setSent] = useState(() => { try { return localStorage.getItem(key) === '1'; } catch { return false; } });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const first = (client.full_name || '').split(' ')[0];

  async function send() {
    setBusy(true); setError('');
    const body = `Hi ${first}! I see you're all set up. Welcome to Groove, so glad you're here. - Greg`;
    const { error: err } = await supabase.from('messages').insert({ recipient_id: client.id, body });
    if (err) {
      setError(/relation|does not exist|schema cache/i.test(err.message) ? 'Messages are not set up yet. Run the messages SQL in Supabase.' : err.message);
      setBusy(false);
      return;
    }
    notifyMessage(client.id);
    try { localStorage.setItem(key, '1'); } catch { /* storage blocked */ }
    setSent(true); setBusy(false);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {sent ? (
        <span style={{ color: TEXT_SOFT }} className="text-sm py-2">Welcome sent</span>
      ) : (
        <button onClick={send} disabled={busy} style={{ background: PLUM, color: INK }} className="rounded-md px-4 py-2 text-sm font-medium">{busy ? 'Sending…' : 'Send Welcome'}</button>
      )}
      <button onClick={onWrite} style={{ background: INK_3, color: PAPER }} className="rounded-md px-4 py-2 text-sm font-medium">Write a Note</button>
      {error && <span style={{ color: BRICK }} className="text-sm block w-full">{error}</span>}
    </div>
  );
}
