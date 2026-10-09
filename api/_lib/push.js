import webpush from 'web-push';
import { supabaseAdmin } from './supabaseAdmin.js';

let configured = false;
function configure() {
  if (configured) return true;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:gpspicer2@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

// Sends one notification to every saved device in `subs`. Devices that have
// gone away (uninstalled, permission revoked) are cleaned up.
export async function sendPush(subs, payload) {
  if (!configure()) throw new Error('Push is not set up (missing VAPID keys).');
  const body = JSON.stringify(payload);
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
      sent += 1;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
      } else {
        console.error('push failed', err.statusCode, err.body);
      }
    }
  }));
  return sent;
}

// Today's date (YYYY-MM-DD) where this person lives.
export function todayIn(tz) {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'America/New_York' }).format(new Date()); }
  catch { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()); }
}
