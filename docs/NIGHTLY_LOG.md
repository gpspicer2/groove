# Nightly Log

## 2026-10-27 (first night the sweep really ran)
**Fixed**
- Coach Health tab went blank (a missing date formatter). Fixed this evening, already live.
- A member whose health check had no "known disease" or "other conditions" list (older or symptom-first answers) crashed that same Health tab. It now shows "None" instead.
- The nightly sweep itself failed last night (the scheduled worker could not change the repo). It now runs inside the main Groove session.

**Design tweaks**
- The small (i) next to each weekly goal is easier to tap (bigger touch area, same look).

**Found but left for Greg**
- Nothing needing a decision. The Learn tidbits for the nature and Physical Activity Guidelines articles are in.

**Checked, all good**
- No undefined names anywhere in src/api (lint), 12 api functions (limit 12).
- Every coach tab and member tab loads with no errors, light and dark (Today, Members, member Overview/Plan/Health/Workouts/Notes, Learn, Billing).
- 1,200 program weeks (every goal and blend, 2-6 days): no empty weeks, duplicate ids, or NaN.
- About 2,000 generated workouts: no duplicates, no double deadlifts, every exercise has a guide, none over the cap.
- Race plans for all distances and levels: earlier checks clean.
