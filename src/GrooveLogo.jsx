import React from 'react';

// The GROOVE wordmark, letter by letter: G = bike wheel + crank, R = a
// strung racket, O = a 45lb plate with a bar through it, O = a sun,
// V = a jump rope with handles, E = a letter with a musical note beside
// it. Monoline strokes throughout so the six motifs still read as one
// consistent mark rather than icons stapled together.
export default function GrooveLogo({ className, style, title = 'GROOVE' }) {
  return (
    <svg
      viewBox="-20 -20 800 195"
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

        {/* O: 45lb plate with a bar through the hole */}
        <g transform="translate(248,0)">
          <path
            fill="currentColor" stroke="none" fillRule="evenodd"
            d="M 3 75 A 52 52 0 1 1 107 75 A 52 52 0 1 1 3 75 Z
               M 35 75 A 20 20 0 1 1 75 75 A 20 20 0 1 1 35 75 Z"
          />
          <line x1="2" y1="75" x2="108" y2="75" strokeWidth="12" />
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

        {/* V: jump rope, handles at the top */}
        <g transform="translate(496,0)">
          <path d="M 14 20 Q 55 150 96 20" />
          <circle cx="14" cy="14" r="13" fill="currentColor" stroke="none" />
          <circle cx="96" cy="14" r="13" fill="currentColor" stroke="none" />
        </g>

        {/* E, with a musical note beside it */}
        <g transform="translate(624,0)">
          <path d="M 82 10 L 15 10" />
          <path d="M 15 10 L 15 130" />
          <path d="M 15 70 L 65 70" />
          <path d="M 15 130 L 82 130" />
          <g strokeWidth="8">
            <path d="M 118 20 L 118 78" />
            <path d="M 118 20 C 135 24, 136 40, 122 42" />
          </g>
          <ellipse cx="107" cy="82" rx="14" ry="10" fill="currentColor" stroke="none" transform="rotate(-18 107 82)" />
        </g>
      </g>
    </svg>
  );
}
