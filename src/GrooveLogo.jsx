import React from 'react';

// The GROOVE wordmark, letter by letter: G = a bike crankset with a
// pedal, R = a leaning stick figure whose circled arms form the letter's
// bowl, O = a 45lb plate with grip holes, O = a sun, V = a two-point V,
// E = a musical note (its own vertical stroke) with three arrows pointing
// outward to form the letter's bars.
export default function GrooveLogo({ className, style, title = 'GROOVE' }) {
  return (
    <svg
      viewBox="-20 -20 850 195"
      className={className}
      style={style}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* G: crankset + pedal */}
        <g strokeWidth="13">
          <path d="M 96 100 A 48 48 0 1 1 96 50" />
          <path d="M 96 75 L 72 75" />
          <g strokeWidth="7">
            <line x1="55" y1="19" x2="55" y2="31" />
            <line x1="55" y1="119" x2="55" y2="131" />
            <line x1="12" y1="38" x2="21" y2="45" />
            <line x1="12" y1="112" x2="21" y2="105" />
          </g>
          <line x1="55" y1="75" x2="95" y2="105" strokeWidth="9" />
          <circle cx="55" cy="75" r="7" fill="currentColor" stroke="none" />
          <rect x="86" y="97" width="34" height="15" rx="4" transform="rotate(48 103 104.5)" fill="currentColor" stroke="none" />
        </g>

        {/* R: leaning figure, circled arms form the bowl */}
        <g transform="translate(124,0)" strokeWidth="13">
          <circle cx="26" cy="20" r="12" fill="currentColor" stroke="none" />
          <path d="M 30 31 L 48 70" />
          <circle cx="66" cy="42" r="24" />
          <path d="M 48 70 L 18 140" />
          <path d="M 48 70 L 90 130" />
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
        <g transform="translate(372,0)" strokeWidth="13">
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

        {/* V: two-point V */}
        <g transform="translate(496,0)" strokeWidth="13">
          <path d="M 55 132 L 15 28" />
          <path d="M 55 132 L 95 28" />
        </g>
        <circle cx="511" cy="20" r="11" fill="currentColor" stroke="none" />
        <circle cx="591" cy="20" r="11" fill="currentColor" stroke="none" />

        {/* E: note stem + 3 outward arrows */}
        <g transform="translate(620,0)" strokeWidth="12">
          <path d="M 20 10 L 20 128" />
          <path d="M 20 10 C 42 15, 41 34, 23 35" strokeWidth="9" />
          <path d="M 20 10 L 68 10" />
          <path d="M 20 70 L 58 70" />
          <path d="M 20 128 L 72 128" />
        </g>
      </g>
      <ellipse cx="634" cy="134" rx="15" ry="11" fill="currentColor" stroke="none" transform="rotate(-18 634 134)" />
      <g fill="currentColor" stroke="none">
        <path d="M 688 3 L 704 10 L 688 17 Z" />
        <path d="M 678 63 L 694 70 L 678 77 Z" />
        <path d="M 692 121 L 708 128 L 692 135 Z" />
      </g>
    </svg>
  );
}
