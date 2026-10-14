# Garmin Connect Developer Program: application draft

Apply at developer.garmin.com (Garmin Connect Developer Program, "Request access"). Fields vary; adapt these answers.
Garmin requires a real business or app (not a personal project), so have the business basics ready (name, website, contact).

- App name: Groove
- Website: https://groove-rho.vercel.app
- Contact: Greg Spicer, gpspicer2@gmail.com
- Business type: sole proprietor, exercise science professional
- APIs requested: Activity API (workout summaries: type, start time, duration, distance, average and max heart rate, calories). Optional: Health API (resting heart rate, VO2 max).
- What Groove is: a movement mentorship app. Members log workouts, follow ACSM weekly activity goals (150 min moderate aerobic activity, resistance and flexibility days), keep a private journal, and read short educational tips. A credentialed exercise science professional mentors members.
- Why Garmin data: members who train with a Garmin watch would see their real workouts counted toward their own weekly goals automatically, instead of entering them by hand. Heart rate is used to classify minutes as light, moderate or vigorous intensity.
- How data is used: shown only to the member and (with their agreement) to their mentor to support coaching. Never sold, never used for advertising, never shared with third parties.
- Users: friends, family and clients of the owner; under 50 at launch, growing slowly.
- Consent: each member connects their own Garmin account with OAuth and can disconnect at any time inside Groove, which also stops syncing.
- Data handling: stored in a Supabase (Postgres) database with row level security, hosted on Vercel; tokens are server-side only. Members can delete their account and all data inside the app.
- Privacy policy and terms URLs: needed (to be added to the app).
