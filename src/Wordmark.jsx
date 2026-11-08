import React from 'react';
import useDarkMode from './useDarkMode';

// The GROOVE logo artwork (pine-tree G, runner, bike wheel, sun, barbell-V, heartbeat E), cropped from the brand
// reference image. It is a still picture; dark mode uses the neon version (made by scripts/make-dark-logo.py).
// (The runner used to take bursts of strides; Greg found it tacky and it was removed 2026-11-08. The `running`
// prop is still passed by a couple of screens and is ignored.)
const FULL_W = 1135;

export default function Wordmark({ className = '', height = 28 }) {
  const dark = useDarkMode();
  return (
    <span
      role="img"
      aria-label="GROOVE"
      className={`${className} groove-logo${/\bblock\b/.test(className) ? '' : ' inline-block'}`}
      style={{ position: 'relative', height, width: (height * FULL_W) / 231, aspectRatio: `${FULL_W} / 231` }}
    >
      <img src={dark ? '/wordmark-dark.png' : '/wordmark.png'} alt="" style={{ display: 'block', height: '100%', width: '100%' }} />
    </span>
  );
}
