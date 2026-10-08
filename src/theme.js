// GROOVE's palette. Every color is a CSS variable (defined in index.css) so
// the whole app can switch between light and dark mode (Account > Settings >
// Appearance; "Auto" follows the phone). Semantic token names (INK, PAPER,
// SKY, ...) stay the same everywhere; only their values change by mode.
// Never append hex digits to these (e.g. `${color}33`); use color-mix().
export const SAND = 'var(--c-ink)';        // app background
export const CREAM = 'var(--c-ink-2)';     // card background
export const TAN_3 = 'var(--c-ink-3)';     // inputs, tracks, dividers-on-cards

export const PLUM = 'var(--c-plum)';       // deep plum, primary brand accent
export const OLIVE = 'var(--c-olive)';     // olive green
export const SAGE = 'var(--c-sage)';       // sage green
export const TEAL_DEEP = 'var(--c-teal-deep)';
export const TEAL = 'var(--c-teal)';       // teal
export const AMBER_C = 'var(--c-amber)';   // amber/orange
export const RUST = 'var(--c-rust)';       // burnt orange/rust
export const MAUVE = 'var(--c-mauve)';     // mauve/purple

export const INK = SAND;             // app background
export const INK_2 = CREAM;          // card background
export const INK_3 = TAN_3;          // inputs, tracks, dividers-on-cards

export const PAPER = 'var(--c-paper)';          // primary text
export const PAPER_DIM = 'var(--c-paper-dim)';  // secondary text
export const TEXT_SOFT = 'var(--c-text-soft)';  // tertiary text, icons

export const SKY = TEAL;             // Move tab accent
export const LIME = OLIVE;           // Birdseye / logging / progress accent
export const GRAY = TEXT_SOFT;

export const MOSS = SAGE;            // positive / on-track
export const BRICK = RUST;           // negative / off-track / errors

// Per-tab accent colors
export const AMBER = AMBER_C;        // Journal
export const VIOLET = MAUVE;         // Learn
