// A tiny Stripe client: calls Stripe's REST API directly so no extra package
// is needed. Card details never touch Groove; people pay on Stripe's own
// hosted pages.
import crypto from 'node:crypto';

function flatten(value, prefix, out) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  } else if (typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => flatten(v, prefix ? `${prefix}[${k}]` : k, out));
  } else {
    out.push([prefix, String(value)]);
  }
}

export async function stripe(method, path, params = {}) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  const pairs = [];
  flatten(params, '', pairs);
  const body = new URLSearchParams(pairs).toString();
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'GET' || method === 'DELETE' ? undefined : body,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Stripe error ${res.status}`);
  return json;
}

// Confirms a webhook really came from Stripe (HMAC signature on the raw body).
export function verifyWebhook(rawBody, header, secret, toleranceSeconds = 300) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')));
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > toleranceSeconds) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${req.headers.host}`;
}
