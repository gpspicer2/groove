// GROOVE's palette — warm sand/sepia background with an earthy, outdoorsy
// accent set (deep plum, olive, sage, teal, amber, rust, mauve). Replaces
// the original dark eggplant theme with a light one built from the brand
// palette below. Semantic token names (INK, PAPER, SKY, ...) are kept
// so every component that already imports them gets the new theme for
// free — only the values changed, not what each token means.
export const SAND = '#EFE6D6';       // brand background — light tan/sepia
export const CREAM = '#F8F3E8';      // card background — a touch lighter than SAND for contrast
export const TAN_3 = '#E4D8C3';      // inputs, tracks, dividers-on-cards

export const PLUM = '#4B3854';       // deep plum — primary brand accent
export const OLIVE = '#6A7B48';      // olive green
export const SAGE = '#8FA17A';       // sage green
export const TEAL_DEEP = '#1E3D4F';  // deep teal/navy
export const TEAL = '#3FA7A0';       // teal
export const AMBER_C = '#F2A029';    // amber/orange
export const RUST = '#D86A2A';       // burnt orange/rust
export const MAUVE = '#9B6A8F';      // mauve/purple

export const INK = SAND;             // app background
export const INK_2 = CREAM;          // card background
export const INK_3 = TAN_3;          // inputs, tracks, dividers-on-cards

export const PAPER = '#2B2320';      // primary text — near-black warm brown
export const PAPER_DIM = '#6B5D52';  // secondary text
export const TEXT_SOFT = '#8C7F72';  // tertiary text, icons

export const SKY = TEAL;             // Move tab accent (was blue, now teal)
export const LIME = OLIVE;           // logging/progress accent (was lime, now olive)
export const GRAY = TEXT_SOFT;       // same as TEXT_SOFT, named for clarity when used as an accent rather than body text

export const MOSS = SAGE;            // positive / on-track
export const BRICK = RUST;           // negative / off-track / errors

// Per-tab accent colors, so each of the 4 client tabs reads as its own
// place rather than everything sharing one accent.
export const AMBER = AMBER_C;        // Journal
export const VIOLET = MAUVE;         // Learn — kept distinct from Move's teal
