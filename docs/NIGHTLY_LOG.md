# Nightly Log

## 2026-11-10
**Fixed:** one small safety net. If a member's saved health-check result is an unknown or old value, Greg's member screen (Overview) used to crash. It now falls back to the "check with your doctor first" wording, so the screen always opens. No health-screening rules changed.

**Design tweaks:** none needed.

**Found but left for Greg**
- A few five-run-day novice marathon and half-marathon plans still jump about 3 miles in the week after a rest week (16 to 19 miles), because each easy run has a 2-mile minimum. It is mild and I left it alone.
- On a slow night my own test of last night was cut short by a tooling error, so nothing was checked then; tonight everything below was.

**Checked all good:** no undefined names (lint), build passes, 12 api functions, 540 suggested workouts, 1,260 program weeks (every goal, blend and Contest Prep layout), race plans, and every coach tab plus a member's Overview, Plan, Health, Workouts and Notes in light and dark with no errors. Move flows (warm-up tick and flip, timers, equipment chips, exercise menu, contest builder, Android Back, new-look note, dynamic drill info, New Suggestion, foam rolling, cancel) all pass.

## 2026-10-29
**Fixed:** nothing in the code tonight. The logo work (smoother dark-mode edges, a cleaner runner with a bent back arm) went live earlier and checks out in light and dark.

**Design tweaks:** none needed; Birdseye, Move and the coach screens looked clean at phone width.

**Found but left for Greg**
- Race plans for novice runners overshoot their own weekly mileage targets in hard-day weeks. Example: a novice 10K plan aims for about 12 miles in week 4, but the interval day (6.8 mi) plus the long run (6.5 mi) already add up to 17 miles, about 40% over the recent peak, while the plan advertises growth of about 10% a week. Same pattern, smaller, in peak weeks (target 14-16, plan shows 21-23). Beginners, intermediates and advanced runners top out around 25% over. My recommendation: cap how long a novice's hard day can be (roughly a third of that week's target, using fewer or shorter repeats) and let easy days shrink to match. This is in my own race-plan math, not ACSM numbers, but it changes what runners are told to do, so I held it for your OK. Say the word and I will fix it.

**Checked, all good:** no undefined names (lint), 12 api functions, every coach screen (Today, Members, member Overview/Plan/Health/Workouts/Notes, Learn, Billing) and every member tab loads with no errors in light and dark, 1,200 program weeks and 32 workout configs clean, 3,840 race configs have no crashes, missing days or missing race day.

## 2026-10-28
**Fixed:** nothing needed. No new code landed since last night's fixes.

**Checked, all good:** no undefined names (lint), 12 api functions, every coach and member screen loads with no errors in light and dark, 1,200 program weeks and all race plans clean.

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
