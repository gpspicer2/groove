import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { sendPush, todayIn } from '../_lib/push.js';
import { memberMessage, coachMessage } from '../_lib/pushMessages.js';
import { computeMemberStats, buildAttention } from '../../src/features/coach/stats.js';
import { calendarDaysBetween } from '../../src/lib/activityGap.js';

// Runs once a morning (see vercel.json). Vercel sends the CRON_SECRET with
// the request, so only Vercel can trigger it.
export default async function handler(req, res) {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Not allowed' });
  }
  try {
    const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('*');
    if (!subs || subs.length === 0) return res.status(200).json({ sent: 0 });

    const byUser = {};
    subs.forEach((s) => { (byUser[s.user_id] ||= []).push(s); });
    const userIds = Object.keys(byUser);
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, role, full_name, screening, created_at, email, membership_status, aerobic_goal_minutes, resistance_goal, flexibility_goal, track_aerobic_goal, track_resistance_goal, track_flexibility_goal').in('id', userIds);

    const since = new Date(Date.now() - 21 * 864e5).toISOString();
    let sent = 0;

    // Members: planned workout today, or a gap in activity.
    const members = (profiles || []).filter((p) => p.role !== 'trainer');
    if (members.length) {
      const ids = members.map((m) => m.id);
      const [{ data: workouts }, { data: plans }] = await Promise.all([
        supabaseAdmin.from('workouts').select('user_id, started_at').in('user_id', ids).is('deleted_at', null).order('started_at', { ascending: false }),
        supabaseAdmin.from('planned_workouts').select('user_id, planned_for, title').in('user_id', ids),
      ]);
      const lastBy = {};
      (workouts || []).forEach((w) => { if (!lastBy[w.user_id]) lastBy[w.user_id] = new Date(w.started_at); });
      for (const m of members) {
        const tz = byUser[m.id][0].tz;
        const today = todayIn(tz);
        const last = lastBy[m.id];
        const msg = memberMessage({
          planTitle: (plans || []).find((p) => p.user_id === m.id && p.planned_for === today)?.title,
          daysSince: last ? calendarDaysBetween(new Date(), last) : null,
          loggedToday: last ? calendarDaysBetween(new Date(), last) === 0 : false,
        });
        if (msg) sent += await sendPush(byUser[m.id], { ...msg, url: '/' });
      }
    }

    // Greg: who needs him.
    const trainers = (profiles || []).filter((p) => p.role === 'trainer');
    if (trainers.length) {
      const { data: clients } = await supabaseAdmin.from('profiles').select('*').eq('role', 'client');
      const ids = (clients || []).map((c) => c.id);
      if (ids.length) {
        const [{ data: w }, { data: s }] = await Promise.all([
          supabaseAdmin.from('workouts').select('*').in('user_id', ids).is('deleted_at', null).not('completed_at', 'is', null).gte('started_at', since),
          supabaseAdmin.from('workout_sets').select('workout_id, movement_type, exercise_name, muscle_group, light_minutes, moderate_minutes, vigorous_minutes').in('user_id', ids).gte('created_at', since),
        ]);
        const stats = computeMemberStats(clients, w || [], s || []);
        const msg = coachMessage(buildAttention(clients, stats));
        if (msg) for (const t of trainers) sent += await sendPush(byUser[t.id], { ...msg, url: '/?view=coach' });
      }
    }
    res.status(200).json({ sent });
  } catch (err) {
    console.error('daily push failed', err);
    res.status(500).json({ error: 'Daily push failed' });
  }
}
