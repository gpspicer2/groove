import React from 'react';

// The GROOVE wordmark, letter by letter: G = bike wheel + crank, R = a
// strung racket, O = a 45lb plate, O = a sun, V = a figure with arms
// raised (head sitting in the gap), E = a musical note (flag + notehead).
// Monoline strokes throughout so the six very different motifs still read
// as one consistent mark rather than six unrelated icons stapled together.
export default function GrooveLogo({ className, style, title = 'GROOVE' }) {
  return (
    <svg
      viewBox="-20 -20 770 190"
      className={className}
      style={style}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round">
        {/* G: bike wheel + crossbar */}
        <g>
          <path d="M 96 100 A 48 48 0 1 1 96 50" />
          <path d="M 96 75 L 72 75" />
          <line x1="55" y1="75" x2="55" y2="35" strokeWidth="4" opacity="0.7" />
          <line x1="55" y1="75" x2="55" y2="115" strokeWidth="4" opacity="0.7" />
          <line x1="55" y1="75" x2="20" y2="52" strokeWidth="4" opacity="0.7" />
          <line x1="55" y1="75" x2="20" y2="98" strokeWidth="4" opacity="0.7" />
          <circle cx="55" cy="75" r="6" fill="currentColor" stroke="none" />
        </g>

        {/* R: strung racket */}
        <g transform="translate(124,0)">
          <line x1="15" y1="10" x2="15" y2="140" />
          <path d="M 15 10 L 42 10 A 30 30 0 0 1 42 70 L 15 70" />
          <line x1="27" y1="20" x2="27" y2="60" strokeWidth="4" opacity="0.7" />
          <line x1="18" y1="40" x2="40" y2="40" strokeWidth="4" opacity="0.7" />
          <path d="M 30 70 L 82 140" />
        </g>

        {/* O: 45lb barbell plate */}
        <g transform="translate(248,0)">
          <circle cx="55" cy="75" r="50" />
          <circle cx="55" cy="75" r="18" />
          <line x1="55" y1="25" x2="55" y2="38" strokeWidth="6" />
          <line x1="55" y1="112" x2="55" y2="125" strokeWidth="6" />
          <line x1="5" y1="75" x2="18" y2="75" strokeWidth="6" />
          <line x1="92" y1="75" x2="105" y2="75" strokeWidth="6" />
        </g>

        {/* O: sun */}
        <g transform="translate(372,0)">
          <circle cx="55" cy="75" r="34" />
          <line x1="55" y1="12" x2="55" y2="28" strokeWidth="7" />
          <line x1="55" y1="122" x2="55" y2="138" strokeWidth="7" />
          <line x1="4" y1="75" x2="20" y2="75" strokeWidth="7" />
          <line x1="90" y1="75" x2="106" y2="75" strokeWidth="7" />
          <line x1="19" y1="39" x2="30" y2="50" strokeWidth="7" />
          <line x1="80" y1="100" x2="91" y2="111" strokeWidth="7" />
          <line x1="91" y1="39" x2="80" y2="50" strokeWidth="7" />
          <line x1="30" y1="100" x2="19" y2="111" strokeWidth="7" />
        </g>

        {/* V: victory figure, head in the gap */}
        <g transform="translate(496,0)">
          <path d="M 55 135 L 10 15" />
          <path d="M 55 135 L 100 15" />
          <circle cx="55" cy="46" r="13" fill="currentColor" stroke="none" />
        </g>

        {/* E: musical note */}
        <g transform="translate(624,0)">
          <path d="M 92 10 L 15 10" />
          <path d="M 15 10 L 15 130" />
          <path d="M 15 70 L 72 70" />
          <path d="M 15 130 L 88 130" />
          <path d="M 92 10 C 114 16, 112 34, 94 34" strokeWidth="9" />
          <circle cx="8" cy="136" r="12" fill="currentColor" stroke="none" />
        </g>
      </g>
    </svg>
  );
}
