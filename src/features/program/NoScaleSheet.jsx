import React from 'react';
import Portal from '../../Portal';
import { X } from '../../lib/icons';
import { useSwipeDown, GRAB_BAR_CLASS } from '../../lib/swipeDown';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY } from '../../theme';

const Point = ({ children }) => <li style={{ color: PAPER_DIM }} className="text-sm text-left">{children}</li>;

// Why the Weight Loss program does not track scale weight, and what it watches instead.
export default function NoScaleSheet({ onClose }) {
  const sheet = useSwipeDown(onClose);
  return (
    <Portal>
      <div style={{ background: 'rgba(0,0,0,0.5)' }} className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
        <div ref={sheet.ref} {...sheet.handlers} style={{ background: INK_2, ...sheet.style }} className="w-full max-w-md rounded-t-2xl px-5 py-4 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div style={{ background: TEXT_SOFT, opacity: 0.45 }} className={GRAB_BAR_CLASS} />
          <div className="flex items-center justify-between mb-2">
            <span className="w-6" />
            <h2 style={{ color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="text-lg font-medium">About weighing in</h2>
            <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-1 -m-1" aria-label="Close"><X size={20} /></button>
          </div>
          <ul className="space-y-2 list-disc pl-5 mb-3">
            <Point>Scale weight moves with water, salt, food and hormones, so day to day it mostly measures noise.</Point>
            <Point>Strength training builds muscle while fat comes off. You can get leaner and healthier while the number stays flat, or even goes up.</Point>
            <Point>You can still log your weight whenever you like. Once a month is plenty.</Point>
          </ul>
          <div style={{ background: INK_3 }} className="rounded-md px-3.5 py-3 mb-3 text-left">
            <div style={{ color: SKY }} className="text-sm font-medium mb-1">What we watch instead</div>
            <div style={{ color: PAPER_DIM }} className="text-sm">Weekly cardio minutes, resting heart rate, VO2max, how much you lift, strength and fitness tests (chair stands, push-ups, plank), and how you feel. They are all under Trends and Your Fitness on Birdseye.</div>
          </div>
          <button onClick={onClose} style={{ background: SKY, color: INK }} className="w-full rounded-md py-2.5 text-sm font-medium">Got it</button>
        </div>
      </div>
    </Portal>
  );
}
