import React, { useState } from 'react';
import { useAuth } from './auth/AuthContext';
import { INK, INK_2, PAPER_DIM, LIME, SKY, AMBER, VIOLET } from './theme';
import AccountMenu from './AccountMenu';
import SwipeTabs from './SwipeTabs';
import BirdseyeTab from './features/birdseye/BirdseyeTab';
import MoveTab from './features/move/MoveTab';
import JournalTab from './features/journal/JournalTab';
import LearnTab from './features/learn/LearnTab';

const TABS = ['birdseye', 'move', 'journal', 'learn'];
const TAB_LABELS = { birdseye: 'Birdseye', move: 'Move', journal: 'Journal', learn: 'Learn' };
const TAB_COLORS = { birdseye: LIME, move: SKY, journal: AMBER, learn: VIOLET };

export default function ClientApp() {
  const { user } = useAuth();
  const [tab, setTab] = useState('birdseye');
  const [deepLinkWorkoutId, setDeepLinkWorkoutId] = useState(null);

  function openWorkout(workoutId) {
    setDeepLinkWorkoutId(workoutId);
    setTab('move');
  }

  function openJournal() {
    setTab('journal');
  }

  const activeIndex = TABS.indexOf(tab);

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
        <div className="flex gap-1.5 pb-4">
          {TABS.map((key) => {
            const active = tab === key;
            const color = TAB_COLORS[key];
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{ background: active ? color : INK_2, color: active ? INK : PAPER_DIM }}
                className="flex-1 py-2.5 rounded-md text-sm font-medium transition-colors"
              >
                {TAB_LABELS[key]}
              </button>
            );
          })}
        </div>
      </div>

      <SwipeTabs
        index={activeIndex}
        onChangeIndex={(i) => setTab(TABS[i])}
        pages={[
          <BirdseyeTab userId={user.id} onOpenWorkout={openWorkout} onOpenJournal={openJournal} />,
          <MoveTab deepLinkWorkoutId={deepLinkWorkoutId} onConsumeDeepLink={() => setDeepLinkWorkoutId(null)} />,
          <JournalTab />,
          <LearnTab />,
        ]}
      />
    </div>
  );
}
