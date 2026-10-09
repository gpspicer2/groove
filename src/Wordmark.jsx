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

// The stride is a strip of pre-drawn frames (public/runner-sprites*.png,
// made by scripts/make-runner-sprites.py) that CSS flips through. The logo
// is always the same two layers (the artwork with the runner erased, plus
// the runner picture), so starting a stride never swaps images or moves
// anything; only the runner layer changes to the sprite while he runs.
const SPRITE_FRAME_W = 326;   // sprite frame size in the runner image's pixels
const SPRITE_FRAME_H = 311;
const SPRITE_MARGIN_X = 70;   // room around the runner for swinging limbs
const SPRITE_MARGIN_Y = 40;
const SPRITE_FRAMES = 12;

export default function Wordmark({ className = '', height = 28, running = false }) {
  // Dark mode uses neon versions of the artwork (made by scripts/make-dark-logo.py).
  const dark = useDarkMode();
  const sfx = dark ? '-dark' : '';
  // Load the sprite ahead of time so the first stride never stutters.
  useEffect(() => {
    const img = new Image();
    img.src = `/runner-sprites${sfx}.png`;
    img.decode?.().catch(() => {});
  }, [sfx]);

  // The runner takes a quick burst of strides now and then: every 6 seconds
  // during a workout, and every 10-20 seconds the rest of the time.
  const [burst, setBurst] = useState(false);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let t;
    const wait = (first) => {
      const gap = running ? (first ? 1200 : 4700) : (first ? 3000 + Math.random() * 4000 : 10000 + Math.random() * 10000);
      t = setTimeout(() => {
        setBurst(true);
        t = setTimeout(() => { setBurst(false); wait(false); }, 1250);
      }, gap);
    };
    wait(true);
    return () => { clearTimeout(t); setBurst(false); };
  }, [running]);

  return (
    <span
      role="img"
      aria-label="GROOVE"
      className={`${className} groove-logo${/\bblock\b/.test(className) ? '' : ' inline-block'}`}
      style={{ position: 'relative', height, width: (height * FULL_W) / 231, aspectRatio: `${FULL_W} / 231` }}
    >
      <img src={`/wordmark-still${sfx}.png`} alt="" style={{ display: 'block', height: '100%', width: '100%' }} />
      <span
        className="groove-run-body"
        style={{ position: 'absolute', top: 0, height: '100%', left: pct(RUNNER_LEFT, FULL_W), width: pct(RUNNER_W, FULL_W) }}
      >
        <img
          src={`/wordmark-runner${sfx}.png`}
          alt=""
          style={{ display: 'block', width: '100%', height: '100%', opacity: burst ? 0 : 1 }}
        />
        <span
          className={`gr-sprite${burst ? ' on' : ''}`}
          style={{
            left: `-${(SPRITE_MARGIN_X / RUNNER_W) * 100}%`,
            top: `-${(SPRITE_MARGIN_Y / RUNNER_H) * 100}%`,
            width: `${(SPRITE_FRAME_W / RUNNER_W) * 100}%`,
            height: `${(SPRITE_FRAME_H / RUNNER_H) * 100}%`,
            backgroundImage: `url(/runner-sprites${sfx}.png)`,
            backgroundSize: `100% ${SPRITE_FRAMES * 100}%`,
          }}
        />
      </span>
    </span>
  );
}
