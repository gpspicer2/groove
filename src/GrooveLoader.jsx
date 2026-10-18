import React from 'react';
import useDarkMode from './useDarkMode';

// The loading screen is simply the logo (neon version in dark mode), fading in softly.
const W = 1135;
const H = 231;

export default function GrooveLoader({ width = 200, label = 'Loading' }) {
  const dark = useDarkMode();
  return (
    <img
      src={dark ? '/wordmark-dark.png' : '/wordmark.png'}
      alt={label}
      width={width}
      height={Math.round((H * width) / W)}
      className="groove-loader"
      style={{ display: 'block', height: 'auto' }}
    />
  );
}
