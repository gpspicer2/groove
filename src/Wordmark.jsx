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

const pct = (v, total) => `${(v / total) * 100}%`;

// During a stride burst the runner is drawn as smooth shapes (round-capped
// limbs that bend at the hip, knee and shoulder) instead of the picture, so
// nothing can show a seam. This pose matches the artwork's runner (traced
// from wordmark-runner.png); the CSS (.gr-*) swings the joints. Colors are
// the logo artwork's own, not UI theme tokens.
const RUNNER_FILL = { light: 'rgb(96, 106, 66)', dark: 'rgb(150, 255, 90)' };

function VectorRunner({ dark }) {
  const c = dark ? RUNNER_FILL.dark : RUNNER_FILL.light;
  const limb = { stroke: c, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg viewBox="0 0 186 231" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }} aria-hidden="true">
      <g className="gr-lean">
        <circle cx="119" cy="28.5" r="22" fill={c} />
        <polygon points="96,62 122,64 143,104 136,116 104,100" fill={c} />
        <polygon points="64,100 58,140 40,176 52,176 74,140 80,100" fill={c} />
        <line x1="99" y1="70" x2="80" y2="128" {...limb} strokeWidth="36" />
        <line x1="53" y1="63" x2="118" y2="63" {...limb} strokeWidth="19" />
        <g className="gr-arm-b"><polyline points="86,64 47,67 32,95" {...limb} strokeWidth="17" /></g>
        <g className="gr-arm-f"><polyline points="110,72 138,112 169,87" {...limb} strokeWidth="19" /></g>
        <g className="gr-thigh-b">
          <line x1="82" y1="140" x2="48" y2="177" {...limb} strokeWidth="25" />
          <g className="gr-shin-b"><line x1="48" y1="177" x2="21" y2="211" {...limb} strokeWidth="25" /></g>
        </g>
        <g className="gr-thigh-f">
          <line x1="82" y1="140" x2="127" y2="158" {...limb} strokeWidth="24" />
          <g className="gr-shin-f">
            <polyline points="127,158 127,209 153,211" {...limb} strokeWidth="24" />
          </g>
        </g>
      </g>
    </svg>
  );
}

export default function Wordmark({ className = '', height = 28, running = false }) {
  // Dark mode uses neon versions of the artwork (made by scripts/make-dark-logo.py).
  const dark = useDarkMode();
  const sfx = dark ? '-dark' : '';
  // Warm the cache so the swap to the animated version never flashes.
  useEffect(() => {
    new Image().src = `/wordmark-still${sfx}.png`;
  }, [sfx]);

  // The runner takes a quick burst of strides now and then: every 8 seconds
  // during a workout, and every 25-50 seconds the rest of the time.
  const [burst, setBurst] = useState(false);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let t;
    const wait = (first) => {
      const gap = running ? (first ? 1200 : 6700) : (first ? 5000 + Math.random() * 7000 : 25000 + Math.random() * 25000);
      t = setTimeout(() => {
        setBurst(true);
        t = setTimeout(() => { setBurst(false); wait(false); }, 1300);
      }, gap);
    };
    wait(true);
    return () => { clearTimeout(t); setBurst(false); };
  }, [running]);

  if (!burst) {
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
      className={`${className} groove-logo`}
      style={{ position: 'relative', display: 'inline-block', height, aspectRatio: `${FULL_W} / 231` }}
    >
      <img src={`/wordmark-still${sfx}.png`} alt="" style={{ display: 'block', height: '100%', width: '100%' }} />
      <span
        className="groove-run-body"
        style={{ position: 'absolute', top: 0, height: '100%', left: pct(RUNNER_LEFT, FULL_W), width: pct(RUNNER_W, FULL_W) }}
      >
        <VectorRunner dark={dark} />
      </span>
    </span>
  );
}
