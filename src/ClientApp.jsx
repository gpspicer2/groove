import React, { useState, useRef } from 'react';
import { useAuth } from './auth/AuthContext';
import { INK, INK_2, PAPER, PAPER_DIM, LIME } from './theme';
import AccountMenu from './AccountMenu';
import BirdseyeTab from './features/birdseye/BirdseyeTab';
import MoveTab from './features/move/MoveTab';
import JournalTab from './features/journal/JournalTab';
import MessageTab from './features/message/MessageTab';

const TABS = ['birdseye', 'move', 'journal', 'message'];
const TAB_LABELS = { birdseye: 'Birdseye', move: 'Move', journal: 'Journal', message: 'Message' };

export default function ClientApp() {
  const { user } = useAuth();
  const [tab, setTab] = useState('birdseye');
  const touchStartX = useRef(null);

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 80) return;
    const i = TABS.indexOf(tab);
    if (dx < 0 && i < TABS.length - 1) setTab(TABS[i + 1]);
    else if (dx > 0 && i > 0) setTab(TABS[i - 1]);
  }

  return (
    <div style={{ background: INK, fontFamily: 'Inter, sans-serif' }} className="min-h-[100svh]">
      <div className="max-w-md mx-auto px-4 pt-safe">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center mb-4">
          <AccountMenu />
          <span style={{ color: LIME, fontFamily: 'Manrope, sans-serif' }} className="text-base font-medium tracking-wide text-center italic">
            GROOVE
          </span>
          <div />
        </div>
        <div className="flex gap-2 pb-4">
          {TABS.map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{ background: tab === key ? LIME : INK_2, color: tab === key ? INK : PAPER_DIM }}
              className="flex-1 py-2.5 rounded-md text-sm font-medium transition-colors"
            >
              {TAB_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {tab === 'birdseye' && <BirdseyeTab userId={user.id} />}
        {tab === 'move' && <MoveTab />}
        {tab === 'journal' && <JournalTab />}
        {tab === 'message' && <MessageTab userId={user.id} />}
      </div>
    </div>
  );
}
