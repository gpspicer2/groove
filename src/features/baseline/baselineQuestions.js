// Mirrors the "Personalized Exercise Mentorship - Getting Acquainted
// Form" content. Answers are stored as one JSONB blob keyed by these
// slugs (see `key` below), so new questions can be added later without
// a schema migration. Email isn't asked here — it's already known from
// the account itself.
export const BASELINE_SECTIONS = [
  {
    title: 'Basic Information',
    subtitle: 'Please enter the following information.',
    questions: [
      { key: 'name', label: 'Preferred first and last name', type: 'text', required: true },
      { key: 'age', label: 'Age', type: 'age', required: true, half: true },
      { key: 'bodyweight', label: 'Bodyweight (lb)', hint: 'For calorie estimates.', type: 'number', half: true },
      { key: 'phone', label: 'Phone', type: 'tel', required: true },
      {
        key: 'preferred_contact',
        label: 'Preferred way to reach you',
        type: 'radio',
        required: true,
        options: ['Email', 'Text', 'Phone call', 'Facetime', 'Other'],
      },
    ],
  },
  {
    title: 'Goals & Background',
    questions: [
      { key: 'goals', label: 'What are your primary exercise goals?', placeholder: 'e.g., weight loss, muscle gain, make exercise fun, run a race', type: 'textarea' },
      { key: 'relationship_with_exercise', label: 'What has your relationship with exercise and your body been like?', type: 'textarea' },
      { key: 'barriers', label: 'What barriers or discouragement have you faced with exercise?', type: 'textarea' },
      { key: 'motivation', label: "What's motivating you to improve your fitness?", type: 'textarea' },
    ],
  },
  {
    title: 'Health & Injury History',
    questions: [
      { key: 'injuries', label: 'Any injuries or operations that limit your movement?', placeholder: 'e.g., back pain, knee surgery', type: 'textarea' },
      { key: 'medical_conditions', label: 'Any medical conditions relevant to exercise?', placeholder: 'e.g., heart disease, diabetes', type: 'textarea' },
      { key: 'other_conditions', label: 'Anything else that affects your performance in daily life?', placeholder: 'e.g., ADHD, anxiety, depression, OCD', type: 'textarea' },
    ],
  },
  {
    title: 'Movement & Schedule',
    subtitle: 'What do you enjoy, and when can we do it?',
    questions: [
      { key: 'enjoyed_movement', label: 'Which kinds of movement do you enjoy now?', placeholder: "If you don't enjoy movement, that's okay! Tell me why.", type: 'textarea' },
      { key: 'formerly_enjoyed_movement', label: 'Which movement did you used to enjoy but no longer do? What happened?', type: 'textarea' },
      { key: 'schedule', label: 'Which days and times work for you?', placeholder: 'Anything I should know about your schedule? (e.g., weekends, evenings)', type: 'textarea' },
      { key: 'equipment', label: 'What equipment do you have?', placeholder: 'e.g., gym membership, free weights, yoga mat', type: 'textarea' },
    ],
  },
  {
    title: 'How We Work',
    questions: [
      {
        key: 'coaching_style',
        label: 'Preferred mentorship style',
        type: 'radio',
        options: ['Gentle', 'Detailed (down to every last rep)', 'Authoritative (drop and give me 20)', 'Educational', 'Other (e.g., a mix of a couple styles — please explain)'],
      },
      {
        key: 'decision_involvement',
        label: 'How involved do you want to be in program decisions?',
        type: 'radio',
        options: ['I want very little involvement (<20%)', 'I want some involvement (40-60%)', 'I really want to be involved (>80%)', 'Other'],
      },
    ],
  },
  {
    title: 'Expectations',
    questions: [
      { key: 'expectations', label: 'What do you want from me as your Personal Exercise Physiologist?', type: 'textarea', required: true },
      { key: 'accountability', label: 'What level of accountability feels right for you?', placeholder: 'What does this look like in an ideal world?', type: 'textarea' },
      { key: 'anything_else', label: 'Anything else you want me to know?', type: 'textarea' },
    ],
  },
];

// Roughly 30-45 seconds per short-answer question, ~10s per multiple
// choice — just enough to give a believable "X min left" estimate on
// the progress bar, not a precise timer.
export function estimateSecondsRemaining(pages, pageIndex) {
  let seconds = 0;
  for (let i = pageIndex; i < pages.length; i++) {
    const p = pages[i];
    if (p.type !== 'section') { seconds += 60; continue; }
    for (const q of p.section.questions) {
      seconds += q.type === 'radio' ? 10 : q.type === 'textarea' ? 40 : 15;
    }
  }
  return seconds;
}
