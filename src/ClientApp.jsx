import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useAuth } from './auth/AuthContext';
import { INK, INK_2, PAPER, PAPER_DIM, LIME, SKY, AMBER, VIOLET, ON_AMBER } from './theme';
import Wordmark from './Wordmark';
import AccountMenu from './AccountMenu';
import { ViewToggle } from './auth/SwitchAccount';
import SwipeTabs from './SwipeTabs';
import BirdseyeTab from './features/birdseye/BirdseyeTab';
import MoveTab from './features/move/MoveTab';
import JournalTab from './features/journal/JournalTab';
import LearnTab from './features/learn/LearnTab';
import { GrooveDrawerHost, openGrooveDrawer } from './GrooveSheet';
import AppTour from './features/onboarding/AppTour';
import LockedTab from './features/membership/LockedTab';
import { supabase } from './lib/supabaseClient';
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
  // Opening the app mid-workout lands on Move (MoveTab writes this backup while a workout is active).
  const [tab, setTab] = useState(() => {
    try {
      const b = JSON.parse(localStorage.getItem('groove:liveBackup') || 'null');
      if (b && Date.now() - b.savedAt < 12 * 3600 * 1000) return 'move';
    } catch { /* ignore */ }
    return 'birdseye';
  });
  // Also ask the database: an unfinished workout from the last 12 hours sends a fresh open to Move,
  // even if this phone has no local backup. Only acts if the person hasn't already switched tabs.
  const touchedTab = useRef(false);
  const firstTab = useRef(tab);
  useEffect(() => { if (tab !== firstTab.current) touchedTab.current = true; }, [tab]);
  useEffect(() => {
    if (!user?.id) return;
    const since = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
    supabase.from('workouts').select('id').is('completed_at', null).is('deleted_at', null)
      .gte('started_at', since).limit(1)
      .then(({ data }) => { if (data?.length && !touchedTab.current) setTab('move'); });
  }, [user?.id]);
  // Lets swipe-to-reveal rows in any tab close themselves when the tab changes.
  useEffect(() => { window.dispatchEvent(new Event('groove:tabchange')); }, [tab]);
  const [deepLinkWorkoutId, setDeepLinkWorkoutId] = useState(null);
  const [logDate, setLogDate] = useState(null); // YYYY-MM-DD picked on the Birdseye calendar
  const [programRequest, setProgramRequest] = useState(null); // { session } from a training program
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
  function startProgramSession(session) {
    setProgramRequest({ session });
    setTab('move');
  }
  function logWorkoutOn(dateStr) {
    setLogDate(dateStr);
    setTab('move');
  }

  const activeIndex = TABS.indexOf(tab);
  const showTour = !profile.tour_done && !tourJustFinished;

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

  // Without a membership the real tabs still show (blurred, untouchable)
  // behind a Join popup, so people can see what they'd get.
  const birdseyeEl = (
    <BirdseyeTab
      key="birdseye"
      userId={user.id}
      onOpenWorkout={openWorkout}
      onLogWorkout={logWorkoutOn}
      onPlanWorkout={planWorkout}
      onStartPlan={startPlan}
      onStartProgramSession={startProgramSession}
      onOpenGroove={openGrooveDrawer}
      active={tab === 'birdseye'}
      openBaselineOnLoad={locked ? false : openBaselineOnLoad}
      onBaselineAutoOpened={() => setOpenBaselineOnLoad(false)}
    />
  );
  const moveEl = <MoveTab key="move" deepLinkWorkoutId={deepLinkWorkoutId} onConsumeDeepLink={() => setDeepLinkWorkoutId(null)} logDate={logDate} onConsumeLogDate={() => setLogDate(null)} planRequest={planRequest} onConsumePlanRequest={() => setPlanRequest(null)} programRequest={programRequest} onConsumeProgramRequest={() => setProgramRequest(null)} onPlanSaved={() => setTab('birdseye')} onActiveWorkoutChange={setMoveStatus} />;
  const journalEl = <JournalTab key="journal" />;

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
          <div className="justify-self-end flex items-center gap-2">
            <ViewToggle compact />
            <AccountMenu />
          </div>
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
        {moveStatus && (moveStatus.total > 0 || moveStatus.totalWeight > 0 || moveStatus.kcal > 0) && (
          <div className="flex items-center justify-between gap-3 mb-3 -mt-1">
            {moveStatus.total > 0 ? (
              <div className="flex items-center gap-2 min-w-0">
                <div style={{ background: INK_2 }} className="h-1.5 w-12 rounded-full overflow-hidden shrink-0">
                  <div style={{ width: `${Math.round((moveStatus.done / moveStatus.total) * 100)}%`, background: LIME, transition: 'width 0.3s ease' }} className="h-full rounded-full" />
                </div>
                <span style={{ color: LIME }} className="text-sm font-medium tabular-nums whitespace-nowrap">
                  {moveStatus.done}/{moveStatus.total} · {Math.round((moveStatus.done / moveStatus.total) * 100)}%
                </span>
              </div>
            ) : <span />}
            <span style={{ color: SKY, fontFamily: 'Outfit, sans-serif' }} className="text-sm font-medium whitespace-nowrap">
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
            locked ? <LockedTab key="birdseye" showOverlay={!showTour} showLibrary>{birdseyeEl}</LockedTab> : birdseyeEl,
            locked ? <LockedTab key="move" showOverlay={!showTour}>{moveEl}</LockedTab> : moveEl,
            locked ? <LockedTab key="journal" showOverlay={!showTour}>{journalEl}</LockedTab> : journalEl,
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
