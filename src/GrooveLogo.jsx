import React from 'react';

// The GROOVE wordmark, letter by letter: G = a chainring with a crank arm
// and pedal, R = a seated stretch/meditation figure, O = a 45lb plate
// with grip holes, O = a sun, V = an EKG pulse line, E = a plain, fully
// legible letter with a separate musical note (and three rewind-style
// arrows) beside it. Monoline strokes throughout so the motifs still read
// as one consistent mark.
export default function GrooveLogo({ className, style, title = 'GROOVE' }) {
  return (
    <svg
      viewBox="-20 -20 870 195"
      className={className}
      style={style}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round">
        {/* G: chainring + crank + pedal */}
        <g>
          <path d="M 96 100 A 48 48 0 1 1 96 50" />
          <path d="M 96 75 L 72 75" />
          <line x1="55" y1="75" x2="92" y2="108" strokeWidth="9" />
          <circle cx="55" cy="75" r="7" fill="currentColor" stroke="none" />
          <rect x="76" y="98" width="34" height="15" rx="7.5" transform="rotate(48 93 105.5)" fill="currentColor" stroke="none" />
        </g>

        {/* R: seated stretch figure */}
        <g transform="translate(124,0)">
          <circle cx="55" cy="20" r="13" fill="currentColor" stroke="none" />
          <path d="M 55 33 L 55 62" />
          <path d="M 55 45 L 20 85" />
          <path d="M 55 45 L 90 85" />
          <path d="M 55 62 L 15 125" />
          <path d="M 55 62 L 95 125" />
          <path d="M 15 125 L 95 125" />
        </g>

        {/* O: 45lb plate with grip holes */}
        <g transform="translate(248,0)">
          <path
            fill="currentColor" stroke="none" fillRule="evenodd"
            d="M 3 75 A 52 52 0 1 1 107 75 A 52 52 0 1 1 3 75 Z
               M 35 75 A 20 20 0 1 1 75 75 A 20 20 0 1 1 35 75 Z
               M 48 111 A 7 7 0 1 1 62 111 A 7 7 0 1 1 48 111 Z
               M 16.8 57 A 7 7 0 1 1 30.8 57 A 7 7 0 1 1 16.8 57 Z
               M 79.2 57 A 7 7 0 1 1 93.2 57 A 7 7 0 1 1 79.2 57 Z"
          />
        </g>

        {/* O: sun */}
        <g transform="translate(372,0)">
          <circle cx="55" cy="75" r="26" />
          <g strokeWidth="8">
            <line x1="85" y1="75" x2="103" y2="75" />
            <line x1="77.6" y1="97.6" x2="88.9" y2="108.9" />
            <line x1="55" y1="105" x2="55" y2="123" />
            <line x1="32.4" y1="97.6" x2="21.1" y2="108.9" />
            <line x1="25" y1="75" x2="7" y2="75" />
            <line x1="32.4" y1="52.4" x2="21.1" y2="41.1" />
            <line x1="55" y1="45" x2="55" y2="27" />
            <line x1="77.6" y1="52.4" x2="88.9" y2="41.1" />
          </g>
        </g>

        {/* V: EKG pulse */}
        <g transform="translate(496,15)" strokeWidth="10">
          <path d="M0,60 L20,60 L28,50 L36,70 L46,5 L56,115 L64,60 L74,60 L82,45 L90,75 L110,60" />
        </g>

        {/* E: plain, fully legible */}
        <g transform="translate(624,0)">
          <path d="M 82 10 L 15 10" />
          <path d="M 15 10 L 15 130" />
          <path d="M 15 70 L 65 70" />
          <path d="M 15 130 L 82 130" />
        </g>
      </g>

      {/* Musical note + rewind arrows, standalone beside the E */}
      <g transform="translate(700,15)">
        <g fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 90 15 L 90 90" />
          <path d="M 90 15 C 112 20, 111 40, 92 41" />
        </g>
        <ellipse cx="78" cy="96" rx="16" ry="12" fill="currentColor" stroke="none" transform="rotate(-18 78 96)" />
        <g fill="currentColor" stroke="none">
          <path d="M 50 60 L 65 50 L 65 70 Z" />
          <path d="M 30 60 L 45 50 L 45 70 Z" />
          <path d="M 10 60 L 25 50 L 25 70 Z" />
        </g>
      </g>
    </svg>
  );
}
