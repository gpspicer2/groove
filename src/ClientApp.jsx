import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useAuth } from './auth/AuthContext';
import { INK, INK_2, PAPER, PAPER_DIM, LIME, SKY, AMBER, VIOLET, ON_AMBER } from './theme';
import Wordmark from './Wordmark';
import AccountMenu from './AccountMenu';
import SwipeTabs from './SwipeTabs';
import BirdseyeTab from './features/birdseye/BirdseyeTab';
import MoveTab from './features/move/MoveTab';
import JournalTab from './features/journal/JournalTab';
import LearnTab from './features/learn/LearnTab';
import { GrooveDrawerHost, openGrooveDrawer } from './GrooveSheet';
import AppTour from './features/onboarding/AppTour';
import LockedTab from './features/membership/LockedTab';
import { MEMBERSHIP_REQUIRED, hasAccess } from './lib/membership';

const TABS = ['birdseye', 'move', 'journal', 'learn'];
const TAB_LABELS = { birdseye: 'Birdseye', move: 'Move', journal: 'Journal', learn: 'Learn' };
const TAB_COLORS = { birdseye: LIME, move: SKY, journal: AMBER, learn: VIOLET };

function RippleText({ text }) {
  return (
    <span>
      {text.split('').map((ch, i) => (
        <span key={i} className="groove-ripple-letter" style={{ animationDelay: `${i * 0.06}s` }}>
          {ch}
        </span>
      ))}
    </span>
  );
}

export default function ClientApp() {
  const { user, profile, updateProfile, reloadProfile } = useAuth();
  // Without a membership, Birdseye, Move and Journal are locked; Learn stays open.
  const locked = MEMBERSHIP_REQUIRED && !hasAccess(profile);
  const [tab, setTab] = useState('birdseye');
  // Lets swipe-to-reveal rows in any tab close themselves when the tab changes.
  useEffect(() => { window.dispatchEvent(new Event('groove:tabchange')); }, [tab]);
  const [deepLinkWorkoutId, setDeepLinkWorkoutId] = useState(null);
  const [logDate, setLogDate] = useState(null); // YYYY-MM-DD picked on the Birdseye calendar
  const [planRequest, setPlanRequest] = useState(null); // { mode: 'plan' | 'start', date?, plan }
  // A local override alongside profile.tour_done: updateProfile()'s
  // round trip can lag a render behind, and without this the tour would
  // flash back on screen for a moment right after finishing it.
  const [tourJustFinished, setTourJustFinished] = useState(false);
  const [tabHighlight, setTabHighlight] = useState(null); // tour override: 'all' | 'none' | null
  const [openBaselineOnLoad, setOpenBaselineOnLoad] = useState(false);
  const [moveStatus, setMoveStatus] = useState(null); // { totalWeight } while a Move workout is active, else null
  const scrollRef = useRef(null);

  // On some devices the page can land scrolled partway down right after
  // login (e.g. a focused input from the auth screen still holding the
  // browser's scroll anchor) — force it back to the top once, before
  // the first paint, so login always opens on the top of Birdseye.
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, []);

  function openWorkout(workoutId) {
    setDeepLinkWorkoutId(workoutId);
    setTab('move');
  }
  function planWorkout({ date, plan }) {
    setPlanRequest({ mode: 'plan', date, plan });
    setTab('move');
  }
  function startPlan(plan, date) {
    setPlanRequest({ mode: 'start', plan, date });
    setTab('move');
  }
  function logWorkoutOn(dateStr) {
    setLogDate(dateStr);
    setTab('move');
  }

  const activeIndex = TABS.indexOf(tab);
  const showTour = !profile.tour_done && !tourJustFinished && !locked;

  // Coming back from Stripe, the payment takes a few seconds to arrive.
  const justPaid = new URLSearchParams(window.location.search).get('checkout') === 'success';
  useEffect(() => {
    if (!locked || !justPaid) return undefined;
    let tries = 0;
    const id = setInterval(async () => {
      tries += 1;
      await reloadProfile();
      if (tries >= 15) clearInterval(id);
    }, 2000);
    return () => clearInterval(id);
  }, [locked, justPaid]);

  return (
    <div style={{ background: INK, fontFamily: 'Outfit, sans-serif' }} className="h-[100svh] flex flex-col">
      <div data-tour="app-header" style={{ background: INK }} className="flex-none max-w-md mx-auto w-full px-4 pt-safe">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center mb-4">
          {tab === 'birdseye' ? (
            <button
              data-tour="groove-button"
              onClick={openGrooveDrawer}
              className="justify-self-start w-8 h-8 flex flex-col items-center justify-center gap-1.5 -ml-1"
              aria-label="What's a Groove?"
            >
              <span style={{ background: PAPER_DIM }} className="block w-5 h-0.5 rounded-full" />
              <span style={{ background: PAPER_DIM }} className="block w-5 h-0.5 rounded-full" />
            </button>
          ) : <div />}
          <Wordmark height={30} className="justify-self-center" running={Boolean(moveStatus)} />
          <AccountMenu />
        </div>
        <div data-tour="tab-bar" className="flex gap-1.5 pb-4">
          {TABS.map((key) => {
            const active = tabHighlight === 'all' || (tabHighlight !== 'none' && tab === key);
            const color = TAB_COLORS[key];
            return (
              <button
                key={key}
                data-tour={`tab-${key}`}
                onClick={() => setTab(key)}
                style={{ background: active ? color : INK_2, color: active ? (key === 'journal' ? ON_AMBER : INK) : PAPER_DIM }}
                className="flex-1 py-2.5 rounded-md text-sm font-medium transition-colors"
              >
                {key === 'move' && moveStatus ? <RippleText text="Moving" /> : TAB_LABELS[key]}
              </button>
            );
          })}
        </div>
        {moveStatus && (moveStatus.totalWeight > 0 || moveStatus.kcal > 0) && (
          <div className="flex justify-end gap-3 mb-3 -mt-1">
            <span style={{ color: SKY, fontFamily: 'Outfit, sans-serif' }} className="text-sm font-medium">
              {[
                moveStatus.totalWeight > 0 && `${moveStatus.totalWeight.toLocaleString()} lb lifted`,
                moveStatus.kcal > 0 && `~${moveStatus.kcal} kcal`,
              ].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}
      </div>

      <div ref={scrollRef} id="app-scroll" className="flex-1 min-h-0 overflow-y-auto">
        <SwipeTabs
          index={activeIndex}
          onChangeIndex={(i) => setTab(TABS[i])}
          onEdgeSwipeRight={tab === 'birdseye' ? openGrooveDrawer : null}
          scrollContainerRef={scrollRef}
          pages={[
            locked ? <LockedTab key="birdseye" showLibrary /> : <BirdseyeTab
              key="birdseye"
              userId={user.id}
              onOpenWorkout={openWorkout}
              onLogWorkout={logWorkoutOn}
              onPlanWorkout={planWorkout}
              onStartPlan={startPlan}
              onOpenGroove={openGrooveDrawer}
              active={tab === 'birdseye'}
              openBaselineOnLoad={openBaselineOnLoad}
              onBaselineAutoOpened={() => setOpenBaselineOnLoad(false)}
            />,
            locked ? <LockedTab key="move" /> : <MoveTab key="move" deepLinkWorkoutId={deepLinkWorkoutId} onConsumeDeepLink={() => setDeepLinkWorkoutId(null)} logDate={logDate} onConsumeLogDate={() => setLogDate(null)} planRequest={planRequest} onConsumePlanRequest={() => setPlanRequest(null)} onPlanSaved={() => setTab('birdseye')} onActiveWorkoutChange={setMoveStatus} />,
            locked ? <LockedTab key="journal" /> : <JournalTab key="journal" />,
            <LearnTab key="learn" />,
          ]}
        />
      </div>

      <GrooveDrawerHost />

      {showTour && (
        <AppTour
          tab={tab}
          onChangeTab={setTab}
          onTabHighlight={setTabHighlight}
          onComplete={(startBaseline) => {
            setTourJustFinished(true);
            updateProfile({ tour_done: true });
            if (startBaseline) {
              setTab('birdseye');
              setOpenBaselineOnLoad(true);
            }
          }}
        />
      )}
    </div>
  );
}
