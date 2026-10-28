// Launch promo: anyone who signs up before this moment gets a free ("comped") membership automatically.
// Open-ended (since 2026-10-28, Greg: comped "for the time being"). To end it, set this to the real cutoff date, and set INVITE_PROMO_UNTIL in src/lib/membership.js to the same moment.
export const COMP_SIGNUPS_UNTIL = new Date('2099-12-31T23:59:00-05:00');
