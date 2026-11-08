import React, { useEffect, useRef, useState } from 'react';
import useDarkMode from './useDarkMode';

// The loading screen is simply the logo (neon version in dark mode), fading in softly. It stays invisible until the
// picture has really loaded, so the alt text or a half-drawn logo never flashes first.
const W = 1829;
const H = 343;

export default function GrooveLoader({ width = 200, label = 'Loading' }) {
  const dark = useDarkMode();
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth > 0) setReady(true);
  }, []);
  return (
    <img
      ref={ref}
      src={dark ? '/wordmark-dark.png' : '/wordmark.png'}
      alt=""
      aria-label={label}
      width={width}
      height={Math.round((H * width) / W)}
      onLoad={() => setReady(true)}
      onError={() => setReady(true)}
      decoding="sync"
      fetchpriority="high"
      className={ready ? 'groove-loader' : undefined}
      style={{ display: 'block', height: 'auto', opacity: ready ? undefined : 0 }}
    />
  );
}
