# Groove

A movement-coaching web app Greg (gpspicer2) runs for clients — friends and family first. Clients log workouts, track ACSM-based weekly goals, journal, and read short tidbits; Greg's account is the coach ("trainer") view.

## Working with Greg
- Greg isn't a developer. Explain in plain words, one step at a time, no jargon. Say exactly where to tap/click.
- Push finished changes straight to `main` (that's what goes live). No PRs unless asked.
- Commit as `gpspicer2 <gpspicer2@gmail.com>` — Vercel's Hobby plan won't deploy commits by other authors.
- Keep in-app text short. No long blocks of text anywhere; people don't read them.
- Verify changes before pushing (`npm run build`; drive the UI when it matters).

## Stack & deploy
- React 18 + Vite + Tailwind v4, Supabase (auth, Postgres, storage), hosted on Vercel.
- Live app: https://groove-rho.vercel.app (Vercel project `groove`, team Spicer_Apps). Long `groove-xxxx-spicer-apps.vercel.app` URLs are private per-build previews.
- Supabase Auth → URL Configuration: Site URL and Redirect URLs are set to the live app (needed for reset/confirm emails).
- `schema.sql` is a reference copy of what was run in Supabase's SQL editor — the app doesn't run it. Database changes have to be run by Greg in Supabase.
- `/api/*` are Vercel serverless functions (account deletion uses the service key).

## Layout
- `src/ClientApp.jsx` — client shell: four swipe tabs Birdseye / Move / Journal / Learn, app tour, account menu.
- `src/TrainerApp.jsx` — Greg's coach view (client list, programs, baseline data).
- `src/features/birdseye` — weekly goals, calendar, Science Supported Strategy, Movement Library.
- `src/features/move` — workout builder/logger (`MoveTab.jsx`, large), `exerciseLibrary.js` (exercises, styles, title/plural helpers).
- `src/features/journal` — guided check-in + freeform entries.
- `src/features/baseline` — intake form, fitness assessment, VO2max/1RM estimators.
- `src/features/onboarding/AppTour.jsx` — spotlight tour shown once after signup.
- `src/MetBrowser.jsx` — Movement Library (Light/Moderate/Vigorous everyday activities).
- `src/lib/calories.js` — ACSM kcal estimates.

## Decisions to keep
- Journals are author-only. Greg never sees them (no trainer RLS policy, every entry `is_private`). The app tells clients to message Greg if there's something he should know.
- Weekly goals follow ACSM: aerobic in moderate-equivalent minutes (vigorous counts double), resistance and flexibility in days.
- Resistance workouts open with an aerobic warm-up and a dynamic warm-up. Combined mode has Serial and Integrated layouts.
- Move history shows 3 workouts, then 5 more per Show More.
- Baseline intake is optional (prompted, not a gate); the tour is the only first-run step.

## Open items
- "Message Greg" not yet verified with a real second account (`profiles` RLS in `schema.sql` may block clients from finding the trainer).
