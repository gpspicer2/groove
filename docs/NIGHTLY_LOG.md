# Nightly Log

## 2026-11-23
**Fixed:** nothing needed tonight. No new problems turned up.

**Design tweaks:** none needed.

**Found but left for Greg**
- Still not live: the workout fixes from the last few days (bench and squat lead, no repeats, gym as the default place, suggested weight in the box, suggested-words bar, edit minutes in History). They are on the side branch only, because the privacy plugin still stops me committing as gpspicer2. When you are at your laptop, set the four GIT_AUTHOR / GIT_COMMITTER variables in Settings > Claude Code > Manage environments (or turn the plugin off) and I will push them to main.
- My old warm-up test script now fails on purpose (the half-weight warm-up is off); nothing in the app is wrong.

**Checked all good:** no undefined names (lint), build passes, 12 api functions, workout tests (4,000 random workouts: no repeats, no muscle dropped, chest leads with bench and legs with a squat), 1,260 program weeks, and Move flows plus every coach tab in light and dark with no errors.

## 2026-11-21
**Fixed:** on days with five or six muscles picked, Triceps was left out of the suggested workout about 1 time in 11 (it was already about 1 in 20 before last night's clean sweep). The Chest bench press was swapping out the lone Triceps close-grip bench. Now a muscle's only lift is never swapped away, and a second bench or squat is not stacked beside it. Tested on 4,000 random workouts: no repeated one-only movements, no muscle dropped.

**Design tweaks:** none needed.

**Found but left for Greg**
- The clean-sweep workout ordering (calves and core last, muscle areas together) and tonight's fix are NOT live yet. They sit on the side branch only, because the privacy plugin stops me committing as gpspicer2. When you are at your laptop, set the four GIT_AUTHOR / GIT_COMMITTER variables in Settings > Claude Code > Manage environments (or turn the plugin off) and I will push to main.
- Novice half and full marathon plans still jump about 3 miles after a rest week (16 to 19). Mild; left alone.

**Checked all good:** no undefined names (lint), build passes, 12 api functions, 1,260 program weeks, workout fuzz, and Move flows (count, add muscles, program start, warm-up tick, contest builder) plus every coach tab in light and dark, with no errors.

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
