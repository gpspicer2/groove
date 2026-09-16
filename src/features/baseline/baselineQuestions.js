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
      { key: 'name', label: 'Preferred First and Last Name', type: 'text', required: true },
      { key: 'age', label: 'Age', type: 'age', required: true },
      { key: 'phone', label: 'Phone', type: 'tel', required: true },
      {
        key: 'preferred_contact',
        label: 'Preferred method of communication (check one)',
        type: 'radio',
        required: true,
        options: ['Email', 'Text', 'Phone call', 'Facetime', 'Other'],
      },
    ],
  },
  {
    title: 'Goals & Background',
    questions: [
      { key: 'goals', label: 'What are your primary exercise goals? (e.g., weight loss, muscle gain, make exercise fun, run a race, etc.)', type: 'textarea' },
      { key: 'relationship_with_exercise', label: 'What has your relationship with exercise and your body been like?', type: 'textarea' },
      { key: 'barriers', label: 'What barriers have you faced with exercise? What has discouraged you in the past?', type: 'textarea' },
      { key: 'motivation', label: "What's motivating you to improve your fitness?", type: 'textarea' },
    ],
  },
  {
    title: 'Health & Injury History',
    questions: [
      { key: 'injuries', label: 'Do you have any current or past injuries or operations that cause you limitations with movement? (e.g., back pain, knee surgery, etc.)', type: 'textarea' },
      { key: 'medical_conditions', label: 'Do you have any medical conditions that are relevant to exercise? (e.g., heart disease, diabetes, etc.)', type: 'textarea' },
      { key: 'other_conditions', label: 'Do you have any other conditions that impact your performance in other aspects of your life? (e.g., ADHD, anxiety, depression, OCD, etc.)', type: 'textarea' },
      { key: 'enjoyed_movement', label: "Which kinds of movement do you currently enjoy? If you don't enjoy movement, that's okay! Tell me why.", type: 'textarea' },
      { key: 'formerly_enjoyed_movement', label: 'Which types of movement did you used to enjoy but no longer find enjoyable? What happened?', type: 'textarea' },
    ],
  },
  {
    title: 'Logistics',
    subtitle: 'When and how are we going to do this?',
    questions: [
      { key: 'schedule', label: 'What are some days/times that work for you? What should I know about your schedule? (e.g., weekends, evenings)', type: 'textarea' },
      { key: 'equipment', label: 'Do you have any equipment available to you? (e.g., gym membership, free weights, yoga mat, etc.)', type: 'textarea' },
      {
        key: 'coaching_style',
        label: 'Do you have a preferred coaching, leading, or management style?',
        type: 'radio',
        options: ['Gentle', 'Detailed (down to every last rep)', 'Authoritative (drop and give me 20)', 'Educational', 'Other (e.g., a mix of a couple styles — please explain)'],
      },
    ],
  },
  {
    title: 'Expectations',
    questions: [
      { key: 'expectations', label: 'What do you want from me as your Personal Exercise Physiologist?', type: 'textarea', required: true },
      { key: 'accountability', label: 'What level of accountability feels right for you? What does this look like for you in an ideal world?', type: 'textarea' },
      {
        key: 'decision_involvement',
        label: 'How much involvement do you want to have in any program-based decision making?',
        type: 'radio',
        options: ['I want very little involvement (<20%)', 'I want some involvement (40-60%)', 'I really want to be involved (>80%)', 'Other'],
      },
      { key: 'anything_else', label: 'What else do you want me to know before we get started?', type: 'textarea' },
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
