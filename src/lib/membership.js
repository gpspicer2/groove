// Plan prices shown in the app. The real prices are set on the Stripe prices
// (see api/billing); change these numbers to match when they change.
export const MEMBERSHIP_PRICE = Number(import.meta.env.VITE_MEMBERSHIP_PRICE) || 14.99; // Groove (app)
export const MENTOR_PRICE = Number(import.meta.env.VITE_MENTOR_PRICE) || 94.99; // Groove (with Greg)
export const PLANS = [
  { id: 'app', name: 'Groove', price: MEMBERSHIP_PRICE, line: 'Logging, goals, programs and learning tools' },
  { id: 'mentor', name: 'Groove (with Greg)', price: MENTOR_PRICE, line: 'Everything in Groove, plus regular mentorship and check-ins with Greg' },
];
export const money = (n) => `$${Number(n).toFixed(2)}`;

// Statuses that give someone full access.
export function hasAccess(profile) {
  if (!profile) return false;
  if (profile.role === 'trainer') return true;
  return ['active', 'trialing', 'comped'].includes(profile.membership_status);
}

// Set VITE_REQUIRE_MEMBERSHIP=true in Vercel when you're ready to start
// charging. Until then everyone keeps full access.
export const MEMBERSHIP_REQUIRED = import.meta.env.VITE_REQUIRE_MEMBERSHIP === 'true';

// Sign-ups before this moment are free (same cutoff as COMP_SIGNUPS_UNTIL in api/_lib/promo.js; change both).
export const INVITE_PROMO_UNTIL = new Date('2026-10-29T23:59:00-04:00');
export const invitePromoActive = () => Date.now() < INVITE_PROMO_UNTIL.getTime();
