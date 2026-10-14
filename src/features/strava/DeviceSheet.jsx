import React from 'react';
import Portal from '../../Portal';
import { X } from '../../lib/icons';
import { useSwipeDown, GRAB_BAR_CLASS } from '../../lib/swipeDown';
import { INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, PLUM } from '../../theme';

const Step = ({ n, children }) => (
  <div className="flex gap-2.5 text-left">
    <span style={{ background: INK_3, color: PAPER_DIM }} className="shrink-0 w-5 h-5 rounded-full text-xs font-medium flex items-center justify-center mt-0.5">{n}</span>
    <span style={{ color: PAPER_DIM }} className="text-sm">{children}</span>
  </div>
);

// How to get a Garmin or Apple Watch talking to Strava (Groove then reads Strava).
export default function DeviceSheet({ onClose }) {
  const sheet = useSwipeDown(onClose);
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" onClick={onClose} />
        <div ref={sheet.ref} {...sheet.handlers} style={{ background: INK_2, borderTop: `2px solid ${PLUM}`, ...sheet.style }} className="relative w-full max-w-md rounded-t-xl px-5 pt-5 pb-6 max-h-[88vh] overflow-y-auto">
          <div style={{ background: TEXT_SOFT, opacity: 0.45 }} className={GRAB_BAR_CLASS} />
          <div className="flex items-center justify-between mb-1">
            <span className="w-6" />
            <div style={{ color: PAPER }} className="text-base font-medium">Connect your watch</div>
            <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-1 -m-1" aria-label="Close"><X size={18} /></button>
          </div>
          <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-4">Link your watch to Strava once. Groove then picks up every workout.</div>

          <div style={{ background: INK_3 }} className="rounded-md px-4 py-3 mb-2.5 space-y-2">
            <div style={{ color: PAPER }} className="text-sm font-medium text-left">Garmin</div>
            <Step n="1">Open the Strava app. Tap You, then the gear icon for Settings.</Step>
            <Step n="2">Choose Apps, Services and Devices, then Garmin, and sign in to your Garmin account.</Step>
            <Step n="3">Allow it to share your activities. New workouts sync on their own.</Step>
          </div>

          <div style={{ background: INK_3 }} className="rounded-md px-4 py-3 mb-3 space-y-2">
            <div style={{ color: PAPER }} className="text-sm font-medium text-left">Apple Watch</div>
            <Step n="1">Easiest: record workouts with the Strava app on your watch.</Step>
            <Step n="2">Or in the Strava app, open Settings, then Apps, Services and Devices, then Apple Health, and turn it on. Workouts from the Workout app then upload to Strava.</Step>
          </div>

          <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-3">Then tap the Strava button here and you are set. Strava’s menu wording can differ a little.</div>
          <a href="https://www.strava.com/settings/apps" target="_blank" rel="noreferrer" style={{ background: PLUM, color: INK_2 }} className="block w-full text-center rounded-md py-2.5 text-sm font-medium">Open Strava settings</a>
        </div>
      </div>
    </Portal>
  );
}
