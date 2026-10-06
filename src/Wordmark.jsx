import React, { useEffect } from 'react';

// The actual GROOVE logo artwork (pine-tree G, runner, bike wheel, sun,
// barbell-V, heartbeat E), cropped from the brand reference image.
//
// While `running` (a workout is in progress) the runner is lifted out of
// the picture and animated on its own: the whole figure bounces and the
// legs swing from the hip. wordmark-still.png is the logo with the runner
// erased; wordmark-runner.png is just the runner, which slots back into
// exactly the same spot. Otherwise the original single image is used.
const FULL_W = 1135;
const RUNNER_LEFT = 204;
const RUNNER_W = 186;

export default function Wordmark({ className = '', height = 28, running = false }) {
  // Warm the cache so the swap to the animated version never flashes.
  useEffect(() => {
    ['/wordmark-still.png', '/wordmark-runner.png'].forEach((src) => { new Image().src = src; });
  }, []);

  if (!running) {
    return (
      <img
        src="/wordmark.png"
        alt="GROOVE"
        height={height}
        className={className}
        style={{ height, width: 'auto' }}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label="GROOVE"
      className={className}
      style={{ position: 'relative', display: 'inline-block', height, aspectRatio: `${FULL_W} / 231` }}
    >
      <img src="/wordmark-still.png" alt="" style={{ display: 'block', height: '100%', width: '100%' }} />
      <span
        className="groove-run-body"
        style={{ position: 'absolute', top: 0, height: '100%', left: `${(RUNNER_LEFT / FULL_W) * 100}%`, width: `${(RUNNER_W / FULL_W) * 100}%` }}
      >
        <img src="/wordmark-runner.png" alt="" className="groove-run-upper" />
        <img src="/wordmark-runner.png" alt="" className="groove-run-legs" />
      </span>
    </span>
  );
}
