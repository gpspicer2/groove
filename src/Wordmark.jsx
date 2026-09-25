import { PLUM, OLIVE, SAGE, TEAL_DEEP, RUST, TEAL } from './theme';

// The "GROOVE" wordmark, each letter in its own brand-palette color —
// a lightweight stand-in for the full illustrated logo (tree-G,
// runner-R, wheel-O, sun-O, dumbbell-V, heartbeat-E) that keeps the
// same multi-color rhythm without needing a raster asset per letter.
const LETTERS = [
  ['G', PLUM], ['R', OLIVE], ['O', SAGE], ['O', TEAL_DEEP], ['V', RUST], ['E', TEAL],
];

export default function Wordmark({ className = '' }) {
  return (
    <span style={{ fontFamily: "'Segoe UI', Manrope, sans-serif" }} className={`font-extrabold tracking-wide italic ${className}`}>
      {LETTERS.map(([letter, color], i) => (
        <span key={i} style={{ color }}>{letter}</span>
      ))}
    </span>
  );
}
