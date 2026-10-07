// Short, plain-language exercise tips tied to the conditions people report
// in the health check (see screening.js). Based on ACSM guidance.
//
// Every tip stays hidden from clients until Greg reviews it and sets
// `reviewed: true`. Nothing here is medical advice; the app always tells
// people to follow their own care team.

export const CONDITION_TIPS = {
  hypertension: [
    { text: 'Breathe steadily when you lift. Holding your breath spikes blood pressure.', reviewed: false },
    { text: 'Moderate loads with more reps are a better fit than very heavy max lifts.', reviewed: false },
    { text: 'Stand up slowly after floor work or stretching.', reviewed: false },
  ],
  cholesterol: [
    { text: 'Regular aerobic activity helps most. Build toward 150+ minutes a week.', reviewed: false },
  ],
  prediabetes: [
    { text: 'A short walk after meals helps blood sugar.', reviewed: false },
    { text: 'Try not to go more than 2 days in a row without activity.', reviewed: false },
  ],
  obesity: [
    { text: 'Low-impact options like walking, cycling, or swimming are easy on your joints.', reviewed: false },
    { text: 'Build time first, then intensity. Add a few minutes each week.', reviewed: false },
  ],
  lung: [
    { text: 'Warm up a little longer, and keep your rescue inhaler close.', reviewed: false },
    { text: 'Cold, dry air can trigger symptoms. Cover your mouth outside in winter.', reviewed: false },
  ],
  arthritis: [
    { text: 'Move through ranges that feel comfortable. Low-impact cardio and lighter resistance often feel best.', reviewed: false },
    { text: 'Stiffness that eases within an hour is okay. Pain that lingers is a cue to ease back.', reviewed: false },
  ],
  osteoporosis: [
    { text: 'Weight-bearing and resistance work help protect bone.', reviewed: false },
    { text: 'Avoid forceful forward bending and twisting, especially under load.', reviewed: false },
  ],
  pregnancy: [
    { text: 'Moderate activity is usually encouraged. Stay cool and hydrated.', reviewed: false },
    { text: 'Check with your OB about what feels right at each stage, and skip lying flat on your back later in pregnancy.', reviewed: false },
  ],
  cancer: [
    { text: 'Go by how you feel each day. Easing off on hard days is fine.', reviewed: false },
    { text: 'Check with your care team about any limits.', reviewed: false },
  ],
  heart: [
    { text: 'Keep effort comfortable enough to talk, and follow your cardiac team\'s limits.', reviewed: false },
  ],
  stroke_vascular: [
    { text: 'Walking in short bouts with rests works well. Stop if your legs cramp, then resume.', reviewed: false },
  ],
  diabetes: [
    { text: 'Check your blood sugar before and after, and carry a fast-acting carb.', reviewed: false },
    { text: 'Stay hydrated, and look over your feet after activity.', reviewed: false },
  ],
  kidney: [
    { text: 'Moderate activity is usually fine. Check with your care team about fluids and limits.', reviewed: false },
  ],
};

// Reviewed tips for the conditions someone reported (health check answers).
export function tipsFor(screening) {
  if (!screening) return [];
  const keys = [...(screening.diseases || []), ...(screening.other || [])];
  const seen = new Set();
  const out = [];
  keys.forEach((k) => (CONDITION_TIPS[k] || []).forEach((t) => {
    if (t.reviewed && !seen.has(t.text)) { seen.add(t.text); out.push(t.text); }
  }));
  return out;
}
