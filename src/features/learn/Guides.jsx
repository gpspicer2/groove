import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Info } from '../../lib/icons';
import { supabase } from '../../lib/supabaseClient';
import { useRevealOnOpen } from '../../lib/reveal';
import { predictedMaxHR, computeHrZones } from '../../lib/heartRate';
import MetBrowser from '../../MetBrowser';
import FitnessAssessmentFlow from '../baseline/FitnessAssessmentFlow';
import { INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, SKY, MOSS, AMBER, BRICK, VIOLET } from '../../theme';

// Learn > Guides: the two reference cards that used to sit at the bottom of Birdseye. Scientific Support is your
// individual prescription (from your goals, heart rate and Greg's zone) plus the ACSM guidelines behind it; Movement
// Library lists everyday activities by intensity. Both stay closed until tapped.
export default function Guides({ userId, active = true, openSupport = false }) {
  const [data, setData] = useState({ assessmentDone: true, prescribedZone: null, restingHrNum: null, maxHrNum: null, maxHrIsPredicted: false, resistanceGoal: 3, aerobicGoalMinutes: 150 });
  const [showAssessment, setShowAssessment] = useState(false);

  async function load() {
    if (!userId) return;
    const [baselineRes, profileRes] = await Promise.all([
      supabase.from('baseline_responses').select('fitness_assessment, form_answers').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('age, resting_hr_bpm, max_hr_bpm, prescribed_hr_zone, resistance_goal, aerobic_goal_minutes').eq('id', userId).maybeSingle(),
    ]);
    const baseline = baselineRes.data;
    const row = profileRes.data;
    const age = row?.age != null ? Number(row.age) : (baseline?.form_answers?.age ? Number(baseline.form_answers.age) : null);
    const resting = row?.resting_hr_bpm != null ? Number(row.resting_hr_bpm) : null;
    const maxMeasured = row?.max_hr_bpm != null ? Number(row.max_hr_bpm) : null;
    const maxResolved = maxMeasured != null ? maxMeasured : predictedMaxHR(age);
    setData({
      assessmentDone: Boolean(baseline?.fitness_assessment && Object.keys(baseline.fitness_assessment).length > 0),
      prescribedZone: row?.prescribed_hr_zone || null,
      restingHrNum: resting,
      maxHrNum: maxResolved || null,
      maxHrIsPredicted: maxMeasured == null && maxResolved != null,
      resistanceGoal: row?.resistance_goal || 2,
      aerobicGoalMinutes: row?.aerobic_goal_minutes || 150,
    });
  }
  useEffect(() => { if (active) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId, active]);

  return (
    <div className="space-y-3">
      <ScienceStrategy dataTour="birdseye-science" defaultOpen={openSupport} {...data} onStartAssessment={() => setShowAssessment(true)} />
      <MovementLibrary hrZones={computeHrZones(data.restingHrNum, data.maxHrNum)} />
      {showAssessment && (
        <FitnessAssessmentFlow
          userId={userId}
          onClose={() => setShowAssessment(false)}
          onComplete={async () => { setShowAssessment(false); await load(); }}
        />
      )}
    </div>
  );
}

const MOVEMENT_INFO = {
  Aerobic: 'Anything that gets your heart rate up counts: walking, cycling, dancing, even yard work.',
  Resistance: 'No gym needed. Bodyweight moves, bands, carrying groceries, and yard work all count.',
  Flexibility: 'Stretching, yoga, and mobility work all count.',
  ACSM: 'ACSM is the American College of Sports Medicine, one of the largest sports medicine and exercise science organizations in the world. These targets come from its published exercise guidelines, which line up with the U.S. Physical Activity Guidelines: 150 to 300 minutes of moderate aerobic activity a week, strength work on 2 or more days, and regular stretching. Treat them as a solid starting point, not a rulebook. Message Greg if you want help tailoring them to you.',
  RPE: 'Rating of perceived exertion (RPE) is how hard it feels, from 1 (sitting still) to 10 (all out). Light is about 2-4, moderate 5-6 (you can talk but not sing), and vigorous 7-8 (only a few words at a time). It is the same scale as your check-in after a workout, and it works without a heart rate monitor.',
};
// ACSM's 0-10 effort scale mapped to the three intensity bands.
const RPE_BY_ZONE = { Light: '2–4', Moderate: '5–6', Vigorous: '7–8' };

// Your individualized exercise prescription and the ACSM guidelines it's
// built on, as one dropdown — they said nearly the same thing twice.
function ScienceStrategy({ assessmentDone, onStartAssessment, resistanceGoal, aerobicGoalMinutes, restingHrNum, maxHrNum, maxHrIsPredicted, prescribedZone, dataTour, defaultOpen = false }) {
  const zones = computeHrZones(restingHrNum, maxHrNum);
  const [open, setOpen] = useState(defaultOpen);
  const revealRef = useRevealOnOpen(open);
  const [openInfo, setOpenInfo] = useState(null);
  const infoBtn = (label) => (
    <button onClick={() => setOpenInfo((v) => (v === label ? null : label))} style={{ color: TEXT_SOFT }} className="p-1 -m-1">
      <Info size={13} />
    </button>
  );
  const infoBox = (label) => openInfo === label && (
    <div style={{ background: INK_3, color: PAPER_DIM }} className="rounded-md px-3 py-2.5 text-sm mt-2">{MOVEMENT_INFO[label]}</div>
  );

  return (
    <div ref={revealRef} data-tour={dataTour} style={{ background: INK_2, borderTop: `2px solid ${VIOLET}` }} className="rounded-lg px-5 py-4 text-center">
      <div onClick={() => setOpen((v) => !v)} className="w-full grid grid-cols-[24px_1fr_24px] items-center cursor-pointer">
        <span />
        <span style={{ color: VIOLET }} className="text-base uppercase tracking-wide font-bold">
          Scientific Support{' '}
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(true); setOpenInfo((v) => (v === 'ACSM' ? null : 'ACSM')); }}
            aria-label="About This Plan"
            style={{ color: TEXT_SOFT }}
            className="inline-block align-middle p-1 -m-1"
          >
            <Info size={14} />
          </button>
        </span>
        <span className="justify-self-end">{open ? <ChevronUp size={16} color={TEXT_SOFT} /> : <ChevronDown size={16} color={TEXT_SOFT} />}</span>
      </div>

      {open && (
        <div style={{ borderTop: `1px dashed ${INK_3}` }} className="mt-3 pt-3 space-y-4">
          {infoBox('ACSM')}

          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span style={{ color: MOSS }} className="text-lg font-bold">Aerobic</span>{infoBtn('Aerobic')}
            </div>
            <p style={{ color: TEXT_SOFT }} className="text-sm mb-1">
              {aerobicGoalMinutes} min/week of moderate-intensity activity, over 3+ days. Vigorous minutes count double.
            </p>
            {prescribedZone && zones && <div style={{ color: SKY }} className="text-sm mb-1">Greg recommends: {prescribedZone} zone</div>}
            <div style={{ color: TEXT_SOFT }} className="text-sm mb-1">
              {zones ? `Heart-rate ranges${maxHrIsPredicted ? ' (est.)' : ''} and rating of perceived exertion (RPE)` : 'Effort by feel: rating of perceived exertion (RPE)'}{' '}
              <span className="inline-block align-middle">{infoBtn('RPE')}</span>
            </div>
            <div className="space-y-1">
              {(zones || Object.keys(RPE_BY_ZONE).map((label) => ({ label }))).map((z) => (
                <div key={z.label} className="flex items-center justify-center gap-2">
                  <span style={{ color: PAPER_DIM }} className="text-sm">{z.label}:</span>
                  <span style={{ color: PAPER, fontFamily: 'Outfit, sans-serif' }} className="text-sm">
                    {z.lowBpm != null ? `${z.lowBpm}–${z.highBpm} bpm · ` : ''}RPE {RPE_BY_ZONE[z.label]}
                  </span>
                </div>
              ))}
            </div>
            {!zones && <p style={{ color: TEXT_SOFT }} className="text-sm mt-1">Add your resting heart rate in Account to see heart-rate ranges too.</p>}
            {infoBox('RPE')}
            {infoBox('Aerobic')}
          </div>

          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span style={{ color: SKY }} className="text-lg font-bold">Resistance</span>{infoBtn('Resistance')}
            </div>
            <p style={{ color: TEXT_SOFT }} className="text-sm">
              {resistanceGoal} day{resistanceGoal === 1 ? '' : 's'}/week, all major muscles, 2–4 sets of 8–12 reps.
            </p>
            {infoBox('Resistance')}
          </div>

          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span style={{ color: BRICK }} className="text-lg font-bold">Flexibility</span>{infoBtn('Flexibility')}
            </div>
            <p style={{ color: TEXT_SOFT }} className="text-sm">
              2–3 days/week. Hold each stretch 10–30 sec.
            </p>
            {infoBox('Flexibility')}
          </div>

          {!assessmentDone && (
            <button onClick={onStartAssessment} style={{ color: MOSS }} className="text-sm underline">
              Complete your fitness baseline for a fuller picture →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function MovementLibrary({ hrZones }) {
  const [open, setOpen] = useState(false);
  const revealRef = useRevealOnOpen(open);
  return (
    <div ref={revealRef} data-tour="birdseye-library" style={{ background: INK_2, borderTop: `2px solid ${VIOLET}` }} className="rounded-lg px-5 py-4">
      <button onClick={() => setOpen((v) => !v)} className="w-full grid grid-cols-[24px_1fr_24px] items-center">
        <span />
        <span style={{ color: VIOLET }} className="text-base uppercase tracking-wide font-bold">Movement Library</span>
        <span className="justify-self-end">{open ? <ChevronUp size={16} color={TEXT_SOFT} /> : <ChevronDown size={16} color={TEXT_SOFT} />}</span>
      </button>
      {open && (
        <div style={{ borderTop: `1px dashed ${INK_3}` }} className="mt-3 pt-3">
          <p style={{ color: TEXT_SOFT }} className="text-sm italic text-center mb-3">
            Gardening counts. So does dancing.
          </p>
          <MetBrowser hrZones={hrZones} />
        </div>
      )}
    </div>
  );
}
