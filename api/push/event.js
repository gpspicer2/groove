import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { getAuthedUser } from '../_lib/auth.js';
import { sendPush } from '../_lib/push.js';
import { COMP_SIGNUPS_UNTIL } from '../_lib/promo.js';

// One endpoint for the "tell Greg" events (Vercel's free plan allows only 12 serverless functions, so related
// endpoints share a file). The client posts { type }:
//   'felt-off'   a member said they felt off after a workout: tell Greg right away.
//   'new-member' a new member just agreed on the consent screen: launch-promo comp, starting goals, tell Greg.
// Everything shown is read from the database, never trusted from the request.

async function trainerSubs() {
  const { data: trainers } = await supabaseAdmin.from('profiles').select('id').eq('role', 'trainer');
  const ids = (trainers || []).map((t) => t.id);
  if (!ids.length) return [];
  const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('*').in('user_id', ids);
  return subs || [];
}

async function feltOff(user) {
  const { data: me } = await supabaseAdmin.from('profiles').select('full_name, email').eq('id', user.id).single();
  const { data: latest } = await supabaseAdmin.from('workouts').select('felt_off, felt_off_note, started_at').eq('user_id', user.id).eq('felt_off', true).order('started_at', { ascending: false }).limit(1);
  if (!latest || latest.length === 0) return { sent: 0 };
  const subs = await trainerSubs();
  if (!subs.length) return { sent: 0 };
  const sent = await sendPush(subs, {
    title: `${me?.full_name || me?.email || 'A member'} felt off after a workout`,
    body: latest[0].felt_off_note || 'Open Groove to check in.',
    tag: `feltoff-${user.id}`,
    url: '/?view=coach',
  });
  return { sent };
}

// Only members who joined in the last two days can trigger it (people re-agreeing after a wording change don't count).
async function newMember(user) {
  const { data: me } = await supabaseAdmin.from('profiles').select('full_name, email, role, created_at, membership_status, resistance_goal').eq('id', user.id).single();
  if (!me || me.role !== 'client') return { sent: 0 };
  if (!me.created_at || Date.now() - new Date(me.created_at).getTime() > 2 * 864e5) return { sent: 0 };
  const fresh = {};
  // New members start on ACSM's minimum of 2 strength days a week (the database default is 3, which they can raise).
  if (Number(me.resistance_goal) === 3) fresh.resistance_goal = 2;
  // Launch promo: anyone joining before the cutoff is comped (never overrides a status that is already set).
  if (!me.membership_status && Date.now() < COMP_SIGNUPS_UNTIL.getTime() && new Date(me.created_at) < COMP_SIGNUPS_UNTIL) {
    fresh.membership_status = 'comped';
  }
  let comped = false;
  if (Object.keys(fresh).length) {
    const { error } = await supabaseAdmin.from('profiles').update(fresh).eq('id', user.id);
    comped = !error && fresh.membership_status === 'comped';
  }
  let sent = 0;
  try {
    const subs = await trainerSubs();
    if (subs.length) {
      sent = await sendPush(subs, {
        title: `${me.full_name || me.email || 'Someone'} just joined Groove`,
        body: comped ? 'Comped automatically. Open Groove to say hi.' : 'Open Groove to say hi.',
        tag: `joined-${user.id}`,
        url: '/?view=coach',
      });
    }
  } catch (pushErr) {
    console.error('new-member push not sent', pushErr.message); // push may not be set up; the comp above still stands
  }
  return { sent, comped };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  const type = req.body && req.body.type;
  try {
    if (type === 'felt-off') return res.status(200).json(await feltOff(user));
    if (type === 'new-member') return res.status(200).json(await newMember(user));
    return res.status(400).json({ error: 'Unknown event' });
  } catch (err) {
    console.error('push event failed', type, err);
    return res.status(500).json({ error: 'Could not send' });
  }
}
