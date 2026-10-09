// Title Case for Learn titles: every word capitalized except small joining
// words (a, of, the...) in the middle. Words that already carry a capital
// (ACSM, VO2max) and a leading "[Category]" tag are left alone, and *word*
// emphasis markers survive.
const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'up', 'vs', 'via']);

export function titleCase(text) {
  if (!text) return text;
  const tag = text.match(/^\[[^\]]+\]\s*/);
  const head = tag ? tag[0] : '';
  const words = text.slice(head.length).split(' ');
  const out = words.map((word, i) => {
    const at = word.search(/[A-Za-z]/);
    if (at === -1) return word;
    const core = word.slice(at);
    if (core !== core.toLowerCase()) return word; // already has a capital
    const bare = core.replace(/[^a-z]/g, '');
    const first = i === 0;
    const last = i === words.length - 1;
    if (!first && !last && SMALL.has(bare)) return word;
    return word.slice(0, at) + core.charAt(0).toUpperCase() + core.slice(1);
  });
  return head + out.join(' ');
}
