import React, { useEffect } from 'react';
import Portal from '../../Portal';
import { X } from '../../lib/icons';
import { useSwipeDown, GRAB_BAR_CLASS } from '../../lib/swipeDown';
import { INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, PLUM } from '../../theme';

// "Learn more about Greg": a short bio in a bottom sheet (opens from the consent screen).
export default function GregBio({ onClose }) {
  const sheet = useSwipeDown(onClose);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <Portal>
      <div onClick={onClose} style={{ background: 'color-mix(in srgb, black 55%, transparent)' }} className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
        <div
          ref={sheet.ref}
          {...sheet.handlers}
          onClick={(e) => e.stopPropagation()}
          style={{ ...sheet.style, background: INK_2, borderTop: `2px solid ${PLUM}`, fontFamily: 'Outfit, sans-serif' }}
          className="w-full max-w-sm max-h-[92svh] overflow-y-auto relative rounded-t-2xl md:rounded-2xl px-5 pt-4 pb-4"
        >
          <div style={{ background: INK_3 }} className={GRAB_BAR_CLASS} />
          <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 p-1"><X size={20} color={TEXT_SOFT} /></button>
          <div className="flex items-center justify-center gap-3 mb-3">
            <img src="/greg.jpg" alt="Greg" style={{ objectPosition: '50% 20%' }} className="w-14 h-14 rounded-full object-cover shrink-0" />
            <h2 style={{ color: PLUM }} className="text-xl font-medium">Hi, I'm Greg! 🕺</h2>
          </div>
          <div style={{ color: PAPER_DIM }} className="text-sm space-y-1.5 text-center">
            <p>
              I'm an Assistant Professor of Exercise Science at Lasell University and a Senior Exercise Physiologist at Brigham and Women's Hospital. It started at Saint Anselm College, where I studied evolutionary biology and animal behavior until a research mentor introduced me to exercise physiology. I went on to earn my master's and Ph.D. in it, studying how physical activity affects nearly every organ in the body. One thing has become very clear: <b style={{ color: PAPER }}>most people don't like exercise.</b>
            </p>
            <p>That's why I'm here to advertise <b style={{ color: PAPER }}>movement</b>, not exercise.</p>
            <p>
              Exercise is planned, structured, repetitive movement performed to improve or maintain fitness. That's a lot of rules for something that's supposed to be good for you. Movement is anything that gets you going: a walk, gardening, playing with your kids, a bike ride. It all counts, and it all adds up.
            </p>
            <p>My job is to help you find the kind you'll actually keep doing, starting right where you are.</p>
            <p style={{ color: PAPER }} className="font-medium">Together, we'll get you in a groove.</p>
            <p style={{ color: TEXT_SOFT }}>Questions? Message me anytime from Account.</p>
          </div>
          <button onClick={onClose} style={{ background: PLUM, color: INK_2 }} className="w-full rounded-md py-2.5 text-sm font-medium mt-3">Close</button>
        </div>
      </div>
    </Portal>
  );
}
