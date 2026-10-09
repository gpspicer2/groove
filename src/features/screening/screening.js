// Exercise preparticipation health screening, following the ACSM algorithm
// (Riebe et al., Med Sci Sports Exerc 2015; ACSM's Guidelines for Exercise
// Testing and Prescription). Three inputs decide whether medical clearance
// is recommended: signs/symptoms of cardiovascular, metabolic, or renal
// disease; known disease; and current exercise participation. Questions
// branch so each person only answers what can change their result.

export const SCREENING_VERSION = 'acsm-2015-v1';

// Signs and symptoms suggestive of cardiovascular, metabolic, or renal
// disease, in plain language.
export const SYMPTOMS = [
  { key: 'chest_pain', label: 'Chest, neck, jaw, or arm pain or tightness' },
  { key: 'breathless', label: 'Short of breath at rest or light activity' },
  { key: 'dizziness', label: 'Dizziness or fainting' },
  { key: 'orthopnea', label: 'Breathless lying flat or waking at night' },
  { key: 'ankle_swelling', label: 'Swelling in both ankles' },
  { key: 'palpitations', label: 'Racing, pounding, or fluttering heartbeat' },
  { key: 'claudication', label: 'Leg cramping when walking that eases with rest' },
  { key: 'murmur', label: 'A heart murmur' },
  { key: 'unusual_fatigue', label: 'Unusual tiredness with everyday activities' },
];

// Known cardiovascular (cardiac, cerebrovascular, peripheral vascular),
// metabolic (type 1 or 2 diabetes), or renal disease.
export const DISEASES = [
  { key: 'heart', label: 'Heart disease, stent, or bypass' },
  { key: 'stroke_vascular', label: 'Stroke or poor leg circulation' },
  { key: 'diabetes', label: 'Type 1 or type 2 diabetes' },
  { key: 'kidney', label: 'Kidney disease' },
];

// Not part of the clearance decision. Recorded so Greg (and later,
// condition-specific guidance) can account for them.
export const OTHER_CONDITIONS = [
  { key: 'hypertension', label: 'High blood pressure' },
  { key: 'cholesterol', label: 'High cholesterol' },
  { key: 'prediabetes', label: 'Prediabetes' },
  { key: 'obesity', label: 'Obesity' },
  { key: 'lung', label: 'Asthma or COPD' },
  { key: 'arthritis', label: 'Arthritis or joint pain' },
  { key: 'osteoporosis', label: 'Osteoporosis' },
  { key: 'pregnancy', label: 'Pregnant or baby in the past year' },
  { key: 'cancer', label: 'Cancer, now or in the past' },
];

// 'clear'               no clearance needed
// 'moderate_ok'         active + known disease, no symptoms: fine at moderate, clearance before vigorous
// 'clearance_first'     inactive with known disease and/or symptoms: clearance before starting
// 'stop_and_clearance'  active with symptoms: stop and get clearance before continuing
export function screeningResult({ symptoms = [], diseases = [], active }) {
  if (symptoms.length > 0) return active ? 'stop_and_clearance' : 'clearance_first';
  if (diseases.length > 0) return active ? 'moderate_ok' : 'clearance_first';
  return 'clear';
}

export const RESULT_COPY = {
  clear: {
    tone: 'good',
    title: "You're good to go",
    body: (active) => active
      ? 'Keep up your current activity and build up gradually.'
      : 'Start with light to moderate activity and build up gradually.',
  },
  moderate_ok: {
    tone: 'caution',
    title: 'Good to go at moderate intensity',
    body: () => 'Check with your doctor before doing vigorous exercise.',
    banner: 'Check with your doctor before vigorous exercise.',
  },
  clearance_first: {
    tone: 'caution',
    title: 'Check with your doctor first',
    body: () => 'Get the okay from your doctor before starting. Then begin with light to moderate activity.',
    banner: 'Check with your doctor before starting to exercise.',
  },
  stop_and_clearance: {
    tone: 'stop',
    title: 'Please see your doctor',
    body: () => 'Pause exercise and talk with your doctor about these symptoms before continuing.',
    banner: 'Pause exercise until your doctor clears you.',
  },
};

// After a doctor's okay, clearance-type results no longer need a warning.
export function needsClearance(screening) {
  return Boolean(screening && screening.result !== 'clear' && !screening.cleared_at);
}

export function labelsFor(list, keys = []) {
  return keys.map((k) => list.find((x) => x.key === k)?.label).filter(Boolean);
}
