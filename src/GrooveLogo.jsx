import React from 'react';

// The GROOVE wordmark, letter by letter: G = a chainring with a crank arm
// and pedal, R = a person running, O = a 45lb plate with a bar through
// it, O = a sun, V = a checkmark, E = a musical note built from the
// letter's own stem (flag at the top, notehead at the bottom) rather than
// a separate glyph bolted on. Monoline strokes throughout so the motifs
// still read as one consistent mark.
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
        {/* G: chainring + crank + pedal */}
        <g>
          <path d="M 96 100 A 48 48 0 1 1 96 50" />
          <path d="M 96 75 L 72 75" />
          <line x1="55" y1="75" x2="92" y2="108" strokeWidth="9" />
          <circle cx="55" cy="75" r="7" fill="currentColor" stroke="none" />
          <rect x="76" y="98" width="34" height="15" rx="7.5" transform="rotate(48 93 105.5)" fill="currentColor" stroke="none" />
        </g>

        {/* R: running figure */}
        <g transform="translate(124,0)">
          <circle cx="62" cy="20" r="13" fill="currentColor" stroke="none" />
          <path d="M 55 34 L 40 72" />
          <path d="M 40 72 L 12 140" />
          <path d="M 40 72 L 85 135" />
          <path d="M 48 48 L 85 30" />
          <path d="M 44 58 L 8 75" />
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
          <circle cx="55" cy="75" r="26" />
          <g strokeWidth="9">
            <line x1="55" y1="8" x2="55" y2="24" />
            <line x1="55" y1="126" x2="55" y2="142" />
            <line x1="-12" y1="75" x2="4" y2="75" />
            <line x1="106" y1="75" x2="122" y2="75" />
            <line x1="4" y1="24" x2="15" y2="35" />
            <line x1="95" y1="115" x2="106" y2="126" />
            <line x1="106" y1="24" x2="95" y2="35" />
            <line x1="15" y1="115" x2="4" y2="126" />
          </g>
        </g>

        {/* V: checkmark */}
        <g transform="translate(496,0)" strokeWidth="16">
          <path d="M 10 75 L 45 115 L 105 15" />
        </g>

        {/* E: musical note built from the letter's own stem */}
        <g transform="translate(624,0)">
          <path d="M 88 10 L 22 10" />
          <path d="M 22 10 L 22 130" />
          <path d="M 22 70 L 75 70" />
          <path d="M 40 130 L 88 130" />
          <path d="M 88 10 C 110 15, 109 34, 90 35" strokeWidth="9" />
        </g>
        <ellipse cx="636" cy="136" rx="19" ry="14" fill="currentColor" stroke="none" transform="rotate(-20 636 136)" />
      </g>
    </svg>
  );
}
