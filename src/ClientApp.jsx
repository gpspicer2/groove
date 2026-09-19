import React, { useState, useRef } from 'react';
import { useAuth } from './auth/AuthContext';
import { INK, INK_2, PAPER, PAPER_DIM, LIME, SKY, AMBER, VIOLET, TEAL } from './theme';
import AccountMenu from './AccountMenu';
import BirdseyeTab from './features/birdseye/BirdseyeTab';
import MoveTab from './features/move/MoveTab';
import JournalTab from './features/journal/JournalTab';
import MessageTab from './features/message/MessageTab';
import LearnTab from './features/learn/LearnTab';

const TABS = ['birdseye', 'move', 'journal', 'message', 'learn'];
const TAB_LABELS = { birdseye: 'Birdseye', move: 'Move', journal: 'Journal', message: 'Message', learn: 'Learn' };
const TAB_COLORS = { birdseye: LIME, move: SKY, journal: AMBER, message: VIOLET, learn: TEAL };

export default function ClientApp() {
  const { user } = useAuth();
  const [tab, setTab] = useState('birdseye');
  const [deepLinkWorkoutId, setDeepLinkWorkoutId] = useState(null);
  const touchStartX = useRef(null);

  function openWorkout(workoutId) {
    setDeepLinkWorkoutId(workoutId);
    setTab('move');
  }

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
        <div className="flex gap-1.5 pb-4 flex-wrap">
          {TABS.map((key) => {
            const active = tab === key;
            const color = TAB_COLORS[key];
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{ background: active ? color : INK_2, color: active ? INK : PAPER_DIM }}
                className="flex-1 py-2.5 rounded-md text-sm font-medium transition-colors min-w-[4.5rem]"
              >
                {TAB_LABELS[key]}
              </button>
            );
          })}
        </div>
      </div>

      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {tab === 'birdseye' && <BirdseyeTab userId={user.id} onOpenWorkout={openWorkout} />}
        {tab === 'move' && (
          <MoveTab
            deepLinkWorkoutId={deepLinkWorkoutId}
            onConsumeDeepLink={() => setDeepLinkWorkoutId(null)}
          />
        )}
        {tab === 'journal' && <JournalTab />}
        {tab === 'message' && <MessageTab userId={user.id} />}
        {tab === 'learn' && <LearnTab />}
      </div>
    </div>
  );
}
