import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { INK_2, PAPER, PAPER_DIM, TEXT_SOFT, LIME } from '../../theme';

// Member side: unread notes from Greg show at the top of Birdseye until they tap Got It.
export default function CoachMessages() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  async function load() {
    if (!user) return;
    const { data, error } = await supabase.from('messages').select('id, body, created_at').eq('recipient_id', user.id).is('read_at', null).order('created_at', { ascending: true }).limit(5);
    if (!error) setItems(data || []);
  }
  useEffect(() => {
    load();
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function seen(id) {
    setItems((prev) => prev.filter((m) => m.id !== id));
    await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', id);
  }

  if (items.length === 0) return null;
  return (
    <>
      {items.map((m) => (
        <div key={m.id} style={{ background: INK_2, borderTop: `2px solid ${LIME}` }} className="rounded-lg px-5 py-4 text-center">
          <div style={{ color: LIME }} className="text-sm uppercase tracking-wide font-bold mb-1">A Note From Greg</div>
          <div style={{ color: PAPER }} className="text-base whitespace-pre-wrap">{m.body}</div>
          <div style={{ color: TEXT_SOFT }} className="text-xs mt-2">Want to reach Greg? Tap Message Greg in your Account.</div>
          <button onClick={() => seen(m.id)} style={{ color: TEXT_SOFT }} className="text-sm underline mt-1">Got It</button>
        </div>
      ))}
    </>
  );
}
