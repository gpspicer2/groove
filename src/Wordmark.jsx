import React, { useEffect } from 'react';

// The actual GROOVE logo artwork (pine-tree G, runner, bike wheel, sun,
// barbell-V, heartbeat E), cropped from the brand reference image.
//
// While `running` (a workout is in progress) the runner is lifted out of
// the picture and animated on its own: every so often he takes a few
// strides — arms and legs swinging from their own joints — then stands
// still again. wordmark-still.png is the logo with the runner erased;
// wordmark-runner.png is just the runner, which slots back into exactly
// the same spot. Otherwise the original single image is used.
const FULL_W = 1135;
const RUNNER_LEFT = 204;
const RUNNER_W = 186;
const RUNNER_H = 231;

// The runner image cut into body parts (polygons in the image's own pixels).
// Neighbouring parts overlap by a few pixels so no seam shows at rest.
// origin = the joint each part swings from.
const PARTS = [
  // Head, torso, shoulders, upper arm and pelvis stay put (and bob).
  { key: 'body', origin: [88, 134],
    pts: [[62, 0], [186, 0], [186, 70], [139, 70], [139, 150], [100, 156], [60, 150], [62, 46]] },
  // The swinging back arm, hinged where it leaves the shoulder.
  { key: 'back-arm', origin: [62, 62],
    pts: [[15, 46], [65, 46], [65, 106], [15, 106]] },
  // The front forearm, hinged at the elbow.
  { key: 'front-arm', origin: [140, 108],
    pts: [[137, 70], [186, 70], [186, 130], [137, 130]] },
  { key: 'back-leg', origin: [88, 134],
    pts: [[0, 125], [98, 125], [91, 134], [80, 150], [73, 170], [60, 190], [40, 232], [0, 232]] },
  { key: 'front-leg', origin: [88, 134],
    pts: [[92, 125], [186, 125], [186, 232], [74, 232], [74, 150], [85, 134]] },
];

const pct = (v, total) => `${(v / total) * 100}%`;

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
        style={{ position: 'absolute', top: 0, height: '100%', left: pct(RUNNER_LEFT, FULL_W), width: pct(RUNNER_W, FULL_W) }}
      >
        <span className="groove-run-lean">
          {PARTS.map((part) => (
            <img
              key={part.key}
              src="/wordmark-runner.png"
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
