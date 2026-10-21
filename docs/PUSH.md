# Push notifications

Reminders that arrive even when Groove is closed (Web Push).

- Members: a morning nudge for a planned workout, or after 3 days without activity.
- Greg: an alert right away when someone felt off after a workout, plus a morning summary of who needs him (5+ days quiet, health flags, failed payments).
- `public/sw.js` is the service worker. `src/lib/push.js` + Account > Settings > Reminders turn it on per device.
- `api/push/daily.js` runs every morning at 13:00 UTC (about 9am Eastern; Vercel's free plan allows one run a day and may drift within the hour). Triggered by Vercel Cron, protected by `CRON_SECRET`.
- `api/push/event.js` handles two "tell Greg" events (the client posts `{ type }`). `felt-off` is sent from the check-in sheet. `new-member` is sent when a new member agrees on the consent screen (their first step): Greg gets "<name> just joined Groove". Only members who joined in the last two days can trigger it, so re-agreeing after a wording change does not count. Without push set up, Today still lists them as "Just joined" (green dot) for 7 days or until Greg opens their page.
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

Coach notifications open `/?view=coach`: if the phone is on the personal account, `AuthContext` flips to the linked coach account (the account must be linked on that device).
