import React from 'react';
import useDarkMode from './useDarkMode';

// The logo as a loading screen: a smooth wave rolls through every letter, left to right, like a beat rolling through
// GROOVE. The artwork is cut at the six gaps between letters (columns where the letters barely touch).
const W = 1135;
const H = 231;
const CUTS = [0, 204, 387, 587, 777, 1000, 1135];

export default function GrooveLoader({ width = 200, label = 'Loading' }) {
  const dark = useDarkMode();
  const src = dark ? '/wordmark-dark.png' : '/wordmark.png';
  const scale = width / W;
  const h = Math.round(H * scale);
  return (
    <span role="img" aria-label={label} className="inline-flex items-end" style={{ width, height: h, paddingTop: Math.round(h * 0.2) }}>
      {CUTS.slice(0, -1).map((x0, i) => (
        <span
          key={x0}
          className="groove-hop"
          style={{
            display: 'block',
            width: (CUTS[i + 1] - x0) * scale,
            height: h,
            backgroundImage: `url(${src})`,
            backgroundSize: `${width}px ${h}px`,
            backgroundPosition: `${-x0 * scale}px 0`,
            backgroundRepeat: 'no-repeat',
            animationDelay: `${i * 0.14}s`,
          }}
        />
      ))}
    </span>
  );
}
