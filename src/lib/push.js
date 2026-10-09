import { supabase } from './supabaseClient';

// Reminders that arrive even when Groove is closed (Web Push). They need a
// public key from Vercel (VITE_VAPID_PUBLIC_KEY); without it the Account
// screen simply doesn't offer the switch.
const PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export const PUSH_CONFIGURED = Boolean(PUBLIC_KEY);

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function keyToBytes(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// 'unsupported' | 'blocked' | 'on' | 'off'
const OWNER_KEY = 'groove:pushUser';

// A phone can send reminders to one account at a time; remember which.
export async function pushStatus(userId) {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  try {
    if (userId && localStorage.getItem(OWNER_KEY) !== userId) return 'off';
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return sub && Notification.permission === 'granted' ? 'on' : 'off';
  } catch { return 'off'; }
}

export async function enablePush(userId) {
  if (!pushSupported()) throw new Error('This browser does not support reminders.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. You can allow them in your phone settings.');
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(PUBLIC_KEY) });
  const json = sub.toJSON();
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || null }),
  });
  if (!res.ok) throw new Error('Could not save your reminder setting. Try again.');
  try { localStorage.setItem(OWNER_KEY, userId); } catch { /* storage blocked */ }
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  }
  try { localStorage.removeItem(OWNER_KEY); } catch { /* storage blocked */ }
}

// Tells Greg right away that someone felt off (the server sends the push).
export async function notifyFeltOff() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch('/api/push/felt-off', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } });
  } catch { /* the check-in is already saved; the daily summary will still catch it */ }
}
