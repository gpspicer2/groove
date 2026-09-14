import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME } from '../../theme';

function mapMessage(row) {
  return { id: row.id, senderId: row.sender_id, recipientId: row.recipient_id, body: row.body, createdAt: row.created_at };
}

// Chat between `userId` (whoever's looking at this screen) and `peerId`.
// On the client side, `peerId` is omitted and gets looked up automatically
// (there's only one trainer). On the trainer side, `peerId` is passed in
// explicitly — whichever client's thread is open.
export default function MessageTab({ userId, peerId }) {
  const [resolvedPeerId, setResolvedPeerId] = useState(peerId || null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let peer = peerId;
      if (!peer) {
        const { data: trainer } = await supabase.from('profiles').select('id').eq('role', 'trainer').limit(1).single();
        peer = trainer?.id || null;
      }
      if (cancelled) return;
      setResolvedPeerId(peer);
      if (!peer) { setLoading(false); return; }

      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${peer}),and(sender_id.eq.${peer},recipient_id.eq.${userId})`)
        .order('created_at', { ascending: true });
      if (cancelled) return;
      setMessages((data || []).map(mapMessage));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, peerId]);

  useEffect(() => {
    if (!resolvedPeerId) return;
    const channel = supabase
      .channel(`messages-${userId}-${resolvedPeerId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const m = mapMessage(payload.new);
        const relevant = (m.senderId === userId && m.recipientId === resolvedPeerId) || (m.senderId === resolvedPeerId && m.recipientId === userId);
        if (relevant) setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userId, resolvedPeerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend() {
    if (!draft.trim() || !resolvedPeerId) return;
    const body = draft.trim();
    setDraft('');
    const { data, error } = await supabase
      .from('messages')
      .insert({ recipient_id: resolvedPeerId, body })
      .select()
      .single();
    if (!error) setMessages((prev) => [...prev, mapMessage(data)]);
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <span style={{ color: TEXT_SOFT }} className="text-sm">Loading…</span>
      </div>
    );
  }

  if (!resolvedPeerId) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <span style={{ color: TEXT_SOFT }} className="text-sm">Messaging isn't set up yet — check back soon.</span>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto flex flex-col" style={{ height: 'calc(100svh - 220px)' }}>
      {!peerId && (
        <h1 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-2xl font-medium mb-4 px-4">
          Message
        </h1>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 mb-3 px-4">
        {messages.length === 0 ? (
          <div style={{ background: INK_2, color: TEXT_SOFT }} className="rounded-md px-4 py-6 text-center text-sm">
            No messages yet.
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === userId;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  style={{ background: mine ? LIME : INK_2, color: mine ? INK : PAPER }}
                  className="max-w-[80%] rounded-2xl px-3 py-2 text-sm"
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 pb-4 px-4">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Type a message…"
          style={{ background: INK_3, color: PAPER }}
          className="flex-1 rounded-full px-4 py-3 text-sm outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim()}
          style={{ background: draft.trim() ? LIME : INK_3, color: draft.trim() ? INK : TEXT_SOFT }}
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
