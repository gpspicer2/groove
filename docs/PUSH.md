# Push notifications

Reminders that arrive even when Groove is closed (Web Push).

- Members: a morning nudge for a planned workout, or after 3 days without activity.
- Greg: an alert right away when someone felt off after a workout, plus a morning summary of who needs him (5+ days quiet, health flags, failed payments).
- `public/sw.js` is the service worker. `src/lib/push.js` + Account > Settings > Reminders turn it on per device.
- `api/push/daily.js` runs every morning at 13:00 UTC (about 9am Eastern; Vercel's free plan allows one run a day and may drift within the hour). Triggered by Vercel Cron, protected by `CRON_SECRET`.
- `api/push/felt-off.js` is called from the check-in sheet.
- On iPhone, reminders only work after the app is added to the Home Screen (iOS 16.4+).

## Vercel environment variables
| Name | Value |
| --- | --- |
| `VAPID_PUBLIC_KEY` | public key (also set as `VITE_VAPID_PUBLIC_KEY`) |
| `VITE_VAPID_PUBLIC_KEY` | the same public key (the app reads this one) |
| `VAPID_PRIVATE_KEY` | private key (secret) |
| `VAPID_SUBJECT` | `mailto:gpspicer2@gmail.com` |
| `CRON_SECRET` | any long random string |

New keys: `node -e "console.log(require('web-push').generateVAPIDKeys())"`
