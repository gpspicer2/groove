import React, { useEffect, useState } from 'react';
import useDarkMode from './useDarkMode';

// The actual GROOVE logo artwork (pine-tree G, runner, bike wheel, sun,
// barbell-V, heartbeat E), cropped from the brand reference image.
//
// While `running` (a workout is in progress) the runner is lifted out of
// the picture and animated on its own: every so often he takes a few
// strides (a bounce and a lean) then stands still again. wordmark-still.png is the logo with the runner erased;
// wordmark-runner.png is just the runner, which slots back into exactly
// the same spot. Otherwise the original single image is used.
const FULL_W = 1135;
const RUNNER_LEFT = 204;
const RUNNER_W = 186;
const RUNNER_H = 231;

// The runner is one piece (an earlier version cut him into swinging limbs,
// but the cut edges showed as glitches mid-stride). He bounces and leans
// into each stride instead, so his shape never changes.
const PARTS = [
  { key: 'body', origin: [88, 134], pts: [[0, 0], [186, 0], [186, 231], [0, 231]] },
];

const pct = (v, total) => `${(v / total) * 100}%`;

export default function Wordmark({ className = '', height = 28, running = false }) {
  // Dark mode uses neon versions of the artwork (made by scripts/make-dark-logo.py).
  const sfx = useDarkMode() ? '-dark' : '';
  // Warm the cache so the swap to the animated version never flashes.
  useEffect(() => {
    [`/wordmark-still${sfx}.png`, `/wordmark-runner${sfx}.png`].forEach((src) => { new Image().src = src; });
  }, [sfx]);

  // Even when no workout is going, the runner takes one quick burst of
  // strides every so often, just to be a little alive.
  const [burst, setBurst] = useState(false);
  useEffect(() => {
    if (running || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let t;
    const wait = (first) => {
      t = setTimeout(() => {
        setBurst(true);
        t = setTimeout(() => { setBurst(false); wait(false); }, 1300);
      }, first ? 5000 + Math.random() * 7000 : 25000 + Math.random() * 25000);
    };
    wait(true);
    return () => clearTimeout(t);
  }, [running]);

  if (!running && !burst) {
    return (
      <img
        src={`/wordmark${sfx}.png`}
        alt="GROOVE"
        height={height}
        className={`${className} groove-logo`}
        style={{ height, width: 'auto' }}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label="GROOVE"
      className={`${className} groove-logo${running ? '' : ' groove-run-once'}`}
      style={{ position: 'relative', display: 'inline-block', height, aspectRatio: `${FULL_W} / 231` }}
    >
      <img src={`/wordmark-still${sfx}.png`} alt="" style={{ display: 'block', height: '100%', width: '100%' }} />
      <span
        className="groove-run-body"
        style={{ position: 'absolute', top: 0, height: '100%', left: pct(RUNNER_LEFT, FULL_W), width: pct(RUNNER_W, FULL_W) }}
      >
        <span className="groove-run-lean">
          {PARTS.map((part) => (
            <img
              key={part.key}
              src={`/wordmark-runner${sfx}.png`}
              alt=""
              className={`groove-run-part groove-run-p-${part.key}`}
              style={{
                clipPath: `polygon(${part.pts.map(([x, y]) => `${pct(x, RUNNER_W)} ${pct(y, RUNNER_H)}`).join(', ')})`,
                transformOrigin: `${pct(part.origin[0], RUNNER_W)} ${pct(part.origin[1], RUNNER_H)}`,
              }}
            />
          ))}
        </span>
      </span>
    </span>
  );
}
