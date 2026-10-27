import React from 'react';
import Portal from '../../Portal';
import { X, Activity, Dumbbell, PersonStanding, Footprints, Trees } from '../../lib/icons';
import { useSwipeDown, GRAB_BAR_CLASS } from '../../lib/swipeDown';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY, PLUM, BRICK, VIOLET } from '../../theme';

// What each weekly goal means, why Groove pre-sets it where it does, and what meeting it can look like.
// Plain words on purpose; the Learn tab (Guides > Scientific Support) has the sources.
export const GOAL_INFO_TEXT = {
  Aerobic: {
    icon: Activity, color: PLUM, title: 'Aerobic',
    what: 'Minutes of movement that raise your heart rate: walking, cycling, dancing, mowing the lawn, a run. Moderate minutes count once, vigorous minutes count double.',
    why: 'The Physical Activity Guidelines for Americans (2nd edition) say adults should get at least 150 to 300 minutes a week of moderate activity, or 75 to 150 of vigorous, and that even modest increases help the least active people most. Groove starts you at 150, the low end, and your own number can grow. Light activity is real movement but does not count toward this number.',
    looks: 'About 30 minutes, 5 days a week. Or 10 minutes here and there: a brisk walk after dinner, the stairs, a bike ride with a friend. Everyday life counts, and so does a weekend hike.',
  },
  Resistance: {
    icon: Dumbbell, color: SKY, title: 'Resistance',
    what: 'Days you challenge your muscles: lifting, bands, or your own bodyweight.',
    why: 'The Physical Activity Guidelines for Americans and ACSM recommend muscle-strengthening on 2 or more days a week for every major muscle group. It protects muscle and bone as you age, helps blood sugar and keeps everyday tasks easy. New members start at 2 days because that is the proven minimum, and you add a third when it feels easy.',
    looks: 'Two shorter sessions, like a full-body workout on Tuesday and Saturday. It counts days, not workouts, so two sessions in one day count once.',
  },
  Flexibility: {
    icon: PersonStanding, color: BRICK, title: 'Flexibility',
    what: 'Days you stretch, do yoga or foam roll to keep your joints moving through their full range.',
    why: 'ACSM suggests flexibility work at least 2 to 3 days a week, held a bit past the point of tension. It keeps your range of motion, and it feels good. Yoga counts here and toward aerobic minutes.',
    looks: 'Ten relaxed minutes after a workout or before bed. A dynamic warm-up before lifting counts too.',
  },
  Balance: {
    icon: Footprints, color: VIOLET, title: 'Balance',
    what: 'Days you practice balance: Tai Chi, single-leg work or other balance training.',
    why: 'The Physical Activity Guidelines for Americans advise older adults to include balance training along with aerobic and strength work, and ACSM suggests at least 2 days a week, because it helps prevent falls. It is off by default for everyone else, so turn it on if it appeals to you.',
    looks: 'Standing on one foot while you brush your teeth, a Tai Chi class, or a balance drill at the end of a workout.',
  },
  Nature: {
    icon: Trees, color: LIME, title: 'Nature',
    what: 'Minutes spent outdoors in green or natural places, on top of whatever else you are doing there.',
    why: 'A large study of about 20,000 adults found that people with at least 120 minutes a week in nature were much more likely to report good health and wellbeing. Less than that showed no clear benefit, and it did not matter whether the time came in one visit or several. Groove sets 120 so your outdoor movement works double duty.',
    looks: 'Any outdoor workout counts: a walk, a ride, gardening, a hike. You can also log "Time in Nature" to count a quiet sit in the park.',
  },
};

export default function GoalInfo({ mode, modes = [], onPick, onChange, onLearn, onClose }) {
  const sheet = useSwipeDown(onClose);
  const g = GOAL_INFO_TEXT[mode];
  if (!g) return null;
  const Icon = g.icon;
  const Section = ({ label, children }) => (
    <div className="mb-3 text-left">
      <div style={{ color: g.color }} className="text-sm font-medium uppercase tracking-wide mb-0.5">{label}</div>
      <div style={{ color: PAPER_DIM }} className="text-[15px] leading-snug">{children}</div>
    </div>
  );
  return (
    <Portal>
      <div style={{ background: 'rgba(0,0,0,0.5)' }} className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
        <div ref={sheet.ref} {...sheet.handlers} style={{ background: INK_2, ...sheet.style }} className="w-full max-w-md rounded-t-2xl px-5 py-4 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div style={{ background: TEXT_SOFT, opacity: 0.45 }} className={GRAB_BAR_CLASS} />
          <div className="flex items-center justify-between mb-3">
            <span className="w-6" />
            <h2 style={{ color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="text-lg font-medium flex items-center gap-1.5"><Icon size={18} color={g.color} /> {g.title} Goal</h2>
            <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-1 -m-1" aria-label="Close"><X size={20} /></button>
          </div>
          {modes.length > 1 && (
            <div className="flex flex-wrap justify-center gap-1.5 mb-3">
              {modes.map((m) => <button key={m} onClick={() => onPick(m)} style={{ background: m === mode ? g.color : INK_3, color: m === mode ? INK : PAPER_DIM }} className="rounded-full px-3 py-1 text-sm font-medium">{m}</button>)}
            </div>
          )}
          <Section label="What It Is">{g.what}</Section>
          <Section label="Why This Number">{g.why}</Section>
          <Section label="What It Can Look Like">{g.looks}</Section>
          <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-3">Groove is about moving in ways you enjoy and showing up week after week. Missing a week is fine. Pick it back up.</div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onChange} style={{ background: INK_3, color: PAPER }} className="rounded-md py-2.5 text-sm font-medium">Change This Goal</button>
            <button onClick={onLearn} style={{ background: g.color, color: INK }} className="rounded-md py-2.5 text-sm font-medium">Learn More</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
