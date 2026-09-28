// The GROOVE logo — a row of pictograms in place of letters (pine-tree
// G, running figure, bike wheel, sun, barbell bent into a V, heartbeat
// line), matching the brand mark: inline SVG so it stays crisp at any
// size without shipping a raster asset.
export default function Wordmark({ className = '', height = 28 }) {
  return (
    <svg
      viewBox="0 0 1150 180"
      height={height}
      className={className}
      role="img"
      aria-label="GROOVE"
    >
      <g>
        <path
          d="M 95 20 A 70 70 0 1 0 165 90 L 165 104 L 116 104 L 116 80 L 151 80 A 50 50 0 1 1 95 40 Z"
          fill="#4B3854"
        />
        <g fill="#4B3854">
          <path d="M 90 100 Q 112 90 138 100 L 138 106 Q 112 98 90 106 Z" />
          <path d="M 92 44 L 112 44 L 102 26 Z" />
          <path d="M 88 56 L 116 56 L 102 34 Z" />
          <rect x="98" y="56" width="8" height="10" />
          <path d="M 116 52 L 136 52 L 126 34 Z" />
          <path d="M 112 64 L 140 64 L 126 42 Z" />
          <rect x="122" y="64" width="8" height="10" />
        </g>
      </g>

      <g transform="translate(230,10)" fill="none" stroke="#6A7B48" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="68" cy="16" r="14" fill="#6A7B48" stroke="none" />
        <path d="M64 36 L52 64" />
        <path d="M52 64 L76 74 L72 102" />
        <path d="M52 64 L24 92" />
        <path d="M64 36 L42 42 L32 60" />
        <path d="M64 36 L96 54" />
      </g>

      <g transform="translate(430,90)">
        <circle r="62" fill="none" stroke="#8FA17A" strokeWidth="20" />
        <circle r="50" fill="none" stroke="#1E3D4F" strokeWidth="5" />
        <line x1="0" y1="-50" x2="0" y2="50" stroke="#1E3D4F" strokeWidth="4" />
        <line x1="-50" y1="0" x2="50" y2="0" stroke="#1E3D4F" strokeWidth="4" />
        <line x1="-35" y1="-35" x2="35" y2="35" stroke="#1E3D4F" strokeWidth="4" />
        <line x1="-35" y1="35" x2="35" y2="-35" stroke="#1E3D4F" strokeWidth="4" />
        <circle r="8" fill="#1E3D4F" />
      </g>

      <g transform="translate(590,90)" stroke="#F2A029" strokeWidth="8" strokeLinecap="round" fill="none">
        <circle r="34" />
        <line x1="0" y1="-62" x2="0" y2="-48" />
        <line x1="0" y1="62" x2="0" y2="48" />
        <line x1="-62" y1="0" x2="-48" y2="0" />
        <line x1="62" y1="0" x2="48" y2="0" />
        <line x1="-44" y1="-44" x2="-34" y2="-34" />
        <line x1="44" y1="44" x2="34" y2="34" />
        <line x1="-44" y1="44" x2="-34" y2="34" />
        <line x1="44" y1="-44" x2="34" y2="-34" />
      </g>

      <g fill="#D86A2A">
        <path d="M700 20 L730 20 L770 130 L810 20 L840 20 L785 160 L755 160 Z" />
        <g transform="translate(715,32) rotate(-24)">
          <rect x="-8" y="-26" width="16" height="52" rx="5" />
          <rect x="-20" y="-18" width="12" height="36" rx="4" />
        </g>
        <g transform="translate(825,32) rotate(24)">
          <rect x="-8" y="-26" width="16" height="52" rx="5" />
          <rect x="8" y="-18" width="12" height="36" rx="4" />
        </g>
      </g>

      <g transform="translate(880,90)">
        <polyline
          points="0,0 40,0 52,-38 68,44 82,-14 92,0 130,0"
          fill="none" stroke="#3FA7A0" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
