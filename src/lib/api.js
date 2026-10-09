import { supabase } from './supabaseClient';

export async function deleteAccount() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');
  const res = await fetch('/api/account/delete', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Could not delete account');
  return body;
}

// Billing: both return the address of a secure Stripe page to send the
// member to (card details are entered there, never in Groove).
async function billingUrl(path) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');
  const res = await fetch(path, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } });
  let body = {};
  try { body = await res.json(); } catch { /* not JSON */ }
  if (!res.ok || !body.url) throw new Error(body.error || 'Could not reach billing. Try again in a moment.');
  return body.url;
}
export const startCheckout = () => billingUrl('/api/billing/checkout');
export const openBillingPortal = () => billingUrl('/api/billing/portal');

// Coach only: removes a member account and all of its data.
export async function deleteMember(id) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');
  const res = await fetch('/api/members/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ id }),
  });
  let body = {};
  try { body = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) throw new Error(body.error || 'Could not delete that member');
}

// Coach only: reads a link and drafts a Learn title, summary and category.
export async function summarizeLink(url) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');
  const res = await fetch('/api/learn/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ url }),
  });
  let body = {};
  try { body = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) throw new Error(body.error || 'Could not read that link');
  return body;
}
