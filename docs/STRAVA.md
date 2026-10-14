# Strava sync

Garmin and Apple Watch workouts reach Groove through Strava (both sync to Strava on their own).

- Account > Connect Strava, one tap (on a phone it uses Strava's mobile authorize address, which opens the Strava app if installed). Groove then imports new activities when the app opens (at most every 10 minutes) and on "Sync now".
- `api/strava/auth-url.js` (start), `callback.js` (Strava sends the member back here), `sync.js`, `disconnect.js`; shared logic in `api/_lib/strava.js`.
- Each activity becomes a finished workout (`workouts.external_id = 'strava:<id>'`, so it is never added twice) with one set: aerobic (intensity from average heart rate as % of max HR, ACSM cutoffs 64% / 77%; without heart rate, runs/swims/rows count as vigorous, walks as light or moderate by pace, everything else moderate), Yoga/Pilates as flexibility, strength/CrossFit/HIIT as a resistance "Strength Session". Duplicates between hand-logged and Strava workouts are tidied on every sync (`findDuplicates`): a hand-logged cardio or stretching session within ~10 hours of a Strava one of the same kind is replaced by Strava's; a hand-logged lifting or mixed session (it has the sets and reps) stays and the Strava copy is dropped. Removed ones are soft-deleted (Birdseye > Deleted Workouts) and a deleted Strava workout is never re-imported.
- Tokens live in `strava_connections`, which has no client policies (server only). `profiles.strava_connected` tells the app to show "Connected".
- New Strava apps can connect only one athlete (the owner) until Strava approves the app for more. Submit it for review in Strava's API settings before inviting clients.

## Vercel environment variables
| Name | Value |
| --- | --- |
| `STRAVA_CLIENT_ID` | from strava.com/settings/api |
| `STRAVA_CLIENT_SECRET` | from strava.com/settings/api (secret, Vercel only) |
| `VITE_STRAVA_ENABLED` | `true` (shows the Strava row in Account) |

Strava app settings: Authorization Callback Domain `groove-rho.vercel.app`.
SQL: see the Strava block at the end of `schema.sql`.
