// The GROOVE logo: each letter in its own brand-palette color, carrying
// a small illustrated glyph that echoes the full brand mark (tree-G,
// runner-R, wheel-O, sun-O, dumbbell-V, heartbeat-E) — inline SVG so it
// stays crisp at any size without shipping a raster asset.
export default function Wordmark({ className = '', height = 28 }) {
  return (
    <svg
      viewBox="0 0 980 180"
      height={height}
      className={className}
      role="img"
      aria-label="GROOVE"
    >
      <g>
        <path
          d="M 90 30 A 60 60 0 1 0 150 90 L 150 100 L 112 100 L 112 84 L 138 84 A 42 42 0 1 1 90 54 Z"
          fill="#4B3854"
        />
        <g fill="#4B3854">
          <path d="M 138 44 L 150 44 L 144 32 Z" />
          <path d="M 135 52 L 153 52 L 144 36 Z" />
          <rect x="141" y="52" width="6" height="7" />
        </g>
      </g>

      <g fill="#6A7B48">
        <text x="180" y="140" fontFamily="Manrope, sans-serif" fontSize="150" fontWeight="800" fontStyle="italic">R</text>
        <g transform="translate(196,18)">
          <circle cx="10" cy="4" r="5" />
          <path d="M8 12 L14 12 L20 26 L14 34 L18 46 L11 46 L7 34 L1 40 L-4 36 L4 28 L0 20 Z" />
        </g>
      </g>

      <g>
        <text x="300" y="140" fontFamily="Manrope, sans-serif" fontSize="150" fontWeight="800" fontStyle="italic" fill="#8FA17A">O</text>
        <g transform="translate(345,72)" stroke="#1E3D4F" strokeWidth="3" fill="none">
          <circle r="17" />
          <line x1="0" y1="-17" x2="0" y2="17" />
          <line x1="-17" y1="0" x2="17" y2="0" />
          <line x1="-12" y1="-12" x2="12" y2="12" />
          <line x1="-12" y1="12" x2="12" y2="-12" />
        </g>
      </g>

      <g>
        <text x="430" y="140" fontFamily="Manrope, sans-serif" fontSize="150" fontWeight="800" fontStyle="italic" fill="#1E3D4F">O</text>
        <g transform="translate(475,72)" stroke="#F2A029" strokeWidth="4" strokeLinecap="round">
          <circle r="12" fill="#F2A029" stroke="none" />
          <line x1="0" y1="-22" x2="0" y2="-16" />
          <line x1="0" y1="22" x2="0" y2="16" />
          <line x1="-22" y1="0" x2="-16" y2="0" />
          <line x1="22" y1="0" x2="16" y2="0" />
          <line x1="-15.5" y1="-15.5" x2="-11.5" y2="-11.5" />
          <line x1="15.5" y1="15.5" x2="11.5" y2="11.5" />
          <line x1="-15.5" y1="15.5" x2="-11.5" y2="11.5" />
          <line x1="15.5" y1="-15.5" x2="11.5" y2="-11.5" />
        </g>
      </g>

      <g>
        <text x="560" y="140" fontFamily="Manrope, sans-serif" fontSize="150" fontWeight="800" fontStyle="italic" fill="#D86A2A">V</text>
        <g transform="translate(627,58)" fill="#D86A2A">
          <rect x="-24" y="-3" width="48" height="6" rx="2" />
          <rect x="-32" y="-10" width="8" height="20" rx="2" />
          <rect x="24" y="-10" width="8" height="20" rx="2" />
          <rect x="-38" y="-6" width="6" height="12" rx="2" />
          <rect x="32" y="-6" width="6" height="12" rx="2" />
        </g>
      </g>

      <g>
        <text x="700" y="140" fontFamily="Manrope, sans-serif" fontSize="150" fontWeight="800" fontStyle="italic" fill="#3FA7A0">E</text>
        <polyline
          points="785,72 805,72 812,58 820,86 828,68 834,72 855,72"
          fill="none" stroke="#3FA7A0" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
