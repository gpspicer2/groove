import React from 'react';

// Strava's brand orange stays the same in light and dark.
export const STRAVA_ORANGE = '#FC4C02';

// The Strava mark (two chevrons).
export default function StravaMark({ size = 18, title }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : 'true'} style={{ display: 'inline-block', flexShrink: 0 }}>
      <path fill={STRAVA_ORANGE} d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}
