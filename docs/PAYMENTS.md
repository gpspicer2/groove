# Membership payments (Stripe)

One flat monthly membership. Card details are entered on Stripe's own pages,
never in Groove. The app only learns "this person is paying".

## How it works
- `api/billing/checkout.js` starts a Stripe Checkout for the signed-in member.
- `api/billing/webhook.js` receives Stripe's confirmations (signature-checked)
  and sets `profiles.membership_status` (active, trialing, past_due, canceled).
- `api/billing/portal.js` opens Stripe's customer portal (update card, receipts, cancel).
- `comped` (set by Greg on the Billing tab) = free access.
- `MembershipGate` blocks the app for people without access, but only when
  `VITE_REQUIRE_MEMBERSHIP=true`. Until then everyone keeps full access.
- Deleting an account cancels its Stripe subscription first.

## Vercel environment variables
| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...` while testing, `sk_live_...` after) |
| `STRIPE_PRICE_ID` | The membership price's ID (`price_...`) |
| `STRIPE_WEBHOOK_SECRET` | The webhook's signing secret (`whsec_...`) |
| `VITE_MEMBERSHIP_PRICE` | Price shown in the app, e.g. `49` (must match the Stripe price) |
| `VITE_REQUIRE_MEMBERSHIP` | `true` to start requiring membership |

Webhook URL: `https://groove-rho.vercel.app/api/billing/webhook`
Events: `checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

## Before requiring membership
Comp everyone who is already in (friends, family, Greg's own client account):

    update public.profiles set membership_status = 'comped'
    where role = 'client' and membership_status is null;
