# Groove

A movement-coaching web app run by Greg (gpspicer2), an exercise-science professional, for his clients — friends and family first. The goal is to make his background and ACSM-based guidance accessible: clients log workouts, track ACSM weekly goals, journal privately, and read short tidbits. Greg's own account is the coach ("trainer") view.

## Working with Greg
- Greg isn't a developer. Explain in plain words, one step at a time, no jargon. Say exactly where to tap/click.
- Take initiative on small, obvious consistency fixes without asking (Greg doesn't want back-and-forth over them). When changing one screen, sweep for the same issue elsewhere.
- Give advice and recommendations, not just execution. Apply obvious "intuitive" improvements app-wide; run anything uncertain past him first.
- Push finished changes straight to `main` (that's what goes live). No PRs unless asked.
- Commit as `gpspicer2 <gpspicer2@gmail.com>` — Vercel's Hobby plan won't deploy commits by other authors.
- Verify changes yourself rather than asking him to: `npm run build` before every push (an unescaped apostrophe in a tour string once broke a deploy), and drive the UI when behavior changes.
- Update the app tour (`src/features/onboarding/AppTour.jsx`) whenever a feature it describes changes.

## Design taste
- Colors: each tab has its own (Birdseye green `LIME`, Move teal `SKY`, Journal amber `AMBER`, Learn mauve `VIOLET`). App-wide and onboarding screens (sign-in, consent, health check, tour intro/Account/exit cards, Getting to Know You, fitness assessment) use plum `PLUM`, matching the logo's G — never a tab's color.
- Compact, consistent, clean. No wasted vertical space, no repeated titles.
- Wording: Greg offers "mentorship", never "coaching"; refer to him as Greg rather than "your coach".
- No walls of text anywhere. Short explanations only on demand ((i) popups, one-time swipe tips).
- Merge overlapping content into one place. Favor one-tap shortcuts.
- No stray symbols in labels. Keep forms tidy and unjumbled.
- Logged sets keep a visible, distinct delete control. "Resume workout" stays a link (making it a button is undecided).

## Stack & deploy
- React 18 + Vite + Tailwind v4, Supabase (auth, Postgres, storage), hosted on Vercel; every push to `main` deploys.
- Live app: https://groove-rho.vercel.app (Vercel team Spicer_Apps, project `groove`). Long `groove-xxxx-spicer-apps.vercel.app` URLs are private per-build previews behind a Vercel login — never give those to clients.
- Supabase Auth → URL Configuration: Site URL and Redirect URLs point at the live app (needed for reset/confirm emails).
- `schema.sql` is a reference copy of what was run in Supabase's SQL editor; the app doesn't run it. Schema changes must be run by Greg in the SQL editor — give him the exact SQL and where to paste it.
- `/api/*` are Vercel serverless functions (account deletion uses the service key).

## Layout
- `src/ClientApp.jsx` — client shell: four swipe tabs Birdseye / Move / Journal / Learn, tour, account menu. No tab titles under the tabs; during a workout the Move tab reads "Moving" (letter ripple) and a right-aligned "lb lifted · kcal" tally sits under the tabs.
- `src/TrainerApp.jsx` — Greg's coach view (clients, programs, baseline data).
- `src/features/birdseye` — weekly goals, calendar, Science Supported Strategy (merged with the ACSM block), Movement Library.
- `src/features/move/MoveTab.jsx` (~3,200 lines) — most workout logic. `exerciseLibrary.js` — exercises, training styles, `workoutTitle`/`plural` helpers.
- `src/features/journal`, `src/features/baseline`, `src/features/learn`.
- `src/MetBrowser.jsx` — Movement Library. `src/lib/calories.js` — kcal estimates.
- `src/features/message/MessageTab.jsx` — in-app chat, currently unused. "Message Greg" in Account is an `sms:` link to Greg's phone.

## Decisions and why
- "Log Workout" (not "Start"): open-ended, covers past sessions too.
- Resistance workouts open with an "Aerobic Warm-up" card (the client picks the activity; never assume a treadmill) and a Dynamic Warm-up, both removable. Exercises start collapsed.
- Combined mode: Serial = blocks back to back (a single "Add Aerobic" at the end, no cardio buttons between exercises); Integrated = aerobic woven between exercises or sets. Between-sets aerobic logs as a set inside the exercise, not its own card; tap a logged burst to edit or remove it, and "Other" logs something different from the one-tap preset.
- "Use bodyweight" is available on every resistance exercise (default on only for pull-ups, dips, chin-ups).
- Weekly goals follow ACSM: aerobic in moderate-equivalent minutes (vigorous counts double), resistance/flexibility in days.
- Calories: ACSM kcal/min = METs × 3.5 × kg ÷ 200. Resistance sets ≈ 2.5 min at 3.5–6.5 METs by lift; aerobic uses per-activity METs scaled by intensity. Estimates only, no load weighting. Shown live, in History, and on Birdseye.
- Movement Library: three intensity buttons (Light/Moderate/Vigorous), each a short list of everyday activities, plus the client's bpm range when resting HR is set. Simplified from a 6-level slider over the full compendium — Greg found that too long. Activities from the 2024 Adult Compendium of Physical Activities (not Greg's old METs.pdf, which is © Wellsource).
- Learn categories are a title prefix (`[Benefits]`, `[Strategy]`, `[Adherence]`) rather than a column.
- Journals are author-only: every entry is private, no trainer RLS policy (SQL already run in Supabase). The Journal tab tells clients Greg never sees it and to message him if there's something he should know.
- First run for clients: consent screen → ACSM health screening → tour (gated in `src/App.jsx`). Consent wording lives in `src/features/screening/ConsentScreen.jsx`; bump `CONSENT_VERSION` when it changes. Not yet reviewed by a lawyer.
- Health screening follows the ACSM preparticipation algorithm (Riebe et al., 2015): activity status, symptoms, known CV/metabolic/renal disease; symptom-positive people skip the disease question. Logic and wording in `src/features/screening/screening.js`. Results are stored in `profiles.screening` (jsonb); "doctor cleared me" is self-reported. It informs (banner on Birdseye, Account, coach view) but doesn't block logging. An "other conditions" step (hypertension, obesity, etc.) is recorded for future condition-specific guidance.
- Birdseye calendar: tapping an empty past day (or today) goes straight to Move with that date chosen; tapping a day that has workouts asks "View workout" or "Log another workout". (The old separate quick-log form was removed.)
- Planned workouts (`planned_workouts` table): tap an empty future day on the Birdseye calendar; a friendly "Plan a workout?" yes/no leads to emoji tiles (no keyboard unless "Something else" or a note) for a vague workout (title + optional notes) or "Add workout details", which runs Move's normal start flow in planning mode (button reads "Save Plan"). Planned days show a gently blinking icon of the plan type (aerobic unless the plan says Resistance/Flexibility/Combined) with a small timer on it (`PlannedMark`, `.groove-plan-blink`, off for reduced-motion); any plan can get full details later via Add/Edit details. Tapping one opens "Planned Workout" with Edit/Delete, and "Start Workout" when it's today (prefills Move; the plan is deleted once the workout starts). Past plans are not shown. Plans don't count toward goals.
- Move history shows 3 workouts, then 5 more per Show More.
- Baseline intake is optional (prompted from Birdseye, not a gate); it now also asks bodyweight. The tour is the only first-run step and only counts as done after its final "get to know you" prompt.

## Known problems and ideas
- Two of Greg's workouts were lost; cause never found. `groove:liveBackup` + a restore banner is a safety net, not a fix.
- Learn long-press highlight fix is iOS-specific and unverified outside iOS.
- Ideas: weight calorie estimates by load/effort; possibly make Resume a button.

## Code gotchas
- Every React hook must run before any early return (otherwise React error #300).
- Drag-to-reorder uses raw window touch listeners (`passive: false`); swipe drawers fire buttons on touch end.
- The same exercise can appear in two muscle groups — card keys carry a `#n` suffix.
- localStorage keys: `groove:combinedLayout:<id>`, `groove:combinedActivity:<id>`, `groove:liveBackup`, `groove:swipeHint:<id>`, `groove:autoStartRestTimer`.
- `workouts.plan` is a JSON array, so new entry types need no migration.
