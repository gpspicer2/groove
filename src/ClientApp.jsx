import React, { useState, useRef } from 'react';
import { useAuth } from './auth/AuthContext';
import { INK, INK_2, PAPER, PAPER_DIM, LIME, SKY, AMBER, VIOLET } from './theme';
import AccountMenu from './AccountMenu';
import SwipeTabs from './SwipeTabs';
import BirdseyeTab from './features/birdseye/BirdseyeTab';
import MoveTab from './features/move/MoveTab';
import JournalTab from './features/journal/JournalTab';
import LearnTab from './features/learn/LearnTab';
import GrooveSheet from './GrooveSheet';

const TABS = ['birdseye', 'move', 'journal', 'learn'];
const TAB_LABELS = { birdseye: 'Birdseye', move: 'Move', journal: 'Journal', learn: 'Learn' };
const TAB_COLORS = { birdseye: LIME, move: SKY, journal: AMBER, learn: VIOLET };

export default function ClientApp() {
  const { user } = useAuth();
  const [tab, setTab] = useState('birdseye');
  const [deepLinkWorkoutId, setDeepLinkWorkoutId] = useState(null);
  const [showGroove, setShowGroove] = useState(false);
  const scrollRef = useRef(null);

  function openWorkout(workoutId) {
    setDeepLinkWorkoutId(workoutId);
    setTab('move');
  }

  const activeIndex = TABS.indexOf(tab);

  return (
    <div style={{ background: INK, fontFamily: 'Inter, sans-serif' }} className="h-[100svh] flex flex-col">
      <div style={{ background: INK }} className="flex-none max-w-md mx-auto w-full px-4 pt-safe">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center mb-4">
          {tab === 'birdseye' ? (
            <button
              onClick={() => setShowGroove(true)}
              style={{ color: LIME, fontFamily: 'Manrope, sans-serif' }}
              className="justify-self-start text-lg font-bold w-8 h-8 flex items-center justify-center -ml-1"
              aria-label="Groove"
            >
              G
            </button>
          ) : <div />}
          <span style={{ color: LIME, fontFamily: 'Manrope, sans-serif' }} className="text-base font-medium tracking-wide text-center italic">
            GROOVE
          </span>
          <AccountMenu />
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
        <h1 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-2xl font-medium mb-4 text-center">
          {TAB_LABELS[tab]}
        </h1>
      </div>

      <div ref={scrollRef} id="app-scroll" className="flex-1 min-h-0 overflow-y-auto">
        <SwipeTabs
          index={activeIndex}
          onChangeIndex={(i) => setTab(TABS[i])}
          onEdgeSwipeRight={tab === 'birdseye' ? () => setShowGroove(true) : null}
          scrollContainerRef={scrollRef}
          pages={[
            <BirdseyeTab key="birdseye" userId={user.id} onOpenWorkout={openWorkout} onOpenGroove={() => setShowGroove(true)} active={tab === 'birdseye'} />,
            <MoveTab key="move" deepLinkWorkoutId={deepLinkWorkoutId} onConsumeDeepLink={() => setDeepLinkWorkoutId(null)} />,
            <JournalTab key="journal" />,
            <LearnTab key="learn" />,
          ]}
        />
      </div>

      {showGroove && <GrooveSheet onClose={() => setShowGroove(false)} />}
    </div>
  );
}
