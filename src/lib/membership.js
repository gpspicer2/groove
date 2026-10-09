// Membership price shown in the app. The real price is set on the Stripe
// price (see api/billing); change this number to match when it changes.
export const MEMBERSHIP_PRICE = Number(import.meta.env.VITE_MEMBERSHIP_PRICE) || 49;

// Statuses that give someone full access.
export function hasAccess(profile) {
  if (!profile) return false;
  if (profile.role === 'trainer') return true;
  return ['active', 'trialing', 'comped'].includes(profile.membership_status);
}

// Set VITE_REQUIRE_MEMBERSHIP=true in Vercel when you're ready to start
// charging. Until then everyone keeps full access.
export const MEMBERSHIP_REQUIRED = import.meta.env.VITE_REQUIRE_MEMBERSHIP === 'true';
