import { supabaseAdmin } from './supabaseAdmin.js';
import { stripe } from './stripe.js';

// Removes one account and everything it owns. Used when someone deletes
// their own account and when Greg removes a member.
export async function deleteUserCompletely(uid) {
  // Stop billing first so a deleted account is never charged again.
  const { data: billing } = await supabaseAdmin.from('profiles').select('stripe_subscription_id').eq('id', uid).single();
  if (billing?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
    // If this fails we stop, so nobody is deleted while still being billed.
    await stripe('DELETE', `/subscriptions/${billing.stripe_subscription_id}`);
  }
  // Delete everything this account owns before the account itself: several
  // of these tables reference auth.users without ON DELETE CASCADE, so the
  // user row can't go first. (Tables added later may not exist yet if their
  // SQL hasn't been run; a "missing table" error from those is fine to ignore.)
  await supabaseAdmin.from('baseline_responses').delete().eq('user_id', uid);
  await supabaseAdmin.from('workout_sets').delete().eq('user_id', uid);
  await supabaseAdmin.from('workouts').delete().eq('user_id', uid);
  await supabaseAdmin.from('journal_entries').delete().eq('user_id', uid);
  await supabaseAdmin.from('planned_workouts').delete().eq('user_id', uid);
  await supabaseAdmin.from('fitness_measurements').delete().eq('user_id', uid);
  await supabaseAdmin.from('estimated_1rms').delete().eq('user_id', uid);
  await supabaseAdmin.from('article_favorites').delete().eq('user_id', uid);
  await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', uid);
  await supabaseAdmin.from('coach_notes').delete().eq('client_id', uid);
  await supabaseAdmin.from('programs').delete().eq('client_id', uid);
  await supabaseAdmin.from('messages').delete().or(`sender_id.eq.${uid},recipient_id.eq.${uid}`);
  await supabaseAdmin.from('profiles').delete().eq('id', uid);

  const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
  if (error) throw error;
}
