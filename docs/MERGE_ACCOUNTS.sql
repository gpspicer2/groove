-- Moves everything from Greg's old personal login (gspicer@lasell.edu) onto his one Google login (gpspicer2@gmail.com).
-- Run once in Supabase > SQL Editor. It is all-or-nothing: if anything goes wrong, nothing changes.
do $$
declare
  old_id uuid;
  new_id uuid;
  t text;
  c text;
begin
  select id into old_id from auth.users where lower(email) = 'gspicer@lasell.edu';
  select id into new_id from auth.users where lower(email) = 'gpspicer2@gmail.com';
  if old_id is null or new_id is null then raise exception 'Could not find both accounts'; end if;
  if old_id = new_id then raise exception 'These are the same account'; end if;

  -- Rows that have one-per-person rules: keep the personal account's copy.
  if to_regclass('public.baseline_responses') is not null and exists (select 1 from baseline_responses where user_id = old_id) then
    delete from baseline_responses where user_id = new_id;
  end if;
  if to_regclass('public.strava_connections') is not null and exists (select 1 from strava_connections where user_id = old_id) then
    delete from strava_connections where user_id = new_id;
  end if;
  if to_regclass('public.article_favorites') is not null then
    delete from article_favorites where user_id = old_id and article_id in (select article_id from article_favorites where user_id = new_id);
  end if;

  -- Everything that belongs to a person moves over.
  foreach t in array array['baseline_responses','workouts','workout_sets','journal_entries','planned_workouts','fitness_measurements','estimated_1rms','article_favorites','strava_connections'] loop
    if to_regclass('public.' || t) is not null then
      execute format('update public.%I set user_id = $1 where user_id = $2', t) using new_id, old_id;
    end if;
  end loop;
  if to_regclass('public.messages') is not null then
    update messages set recipient_id = new_id where recipient_id = old_id;
    update messages set sender_id = new_id where sender_id = old_id;
  end if;

  -- Name, photo, goals and settings come across too (never the role or billing).
  foreach c in array array['full_name','avatar_url','age','gender','bodyweight_lb','resting_hr_bpm','max_hr_bpm','max_hr_measured',
    'resistance_goal','aerobic_goal','flexibility_goal','aerobic_goal_minutes','balance_goal','track_aerobic_goal','track_resistance_goal',
    'track_flexibility_goal','track_balance_goal','week_start_day','custom_activities','program','screening','consented_at','consent_version',
    'tour_done','movement_experience','injuries','prescribed_hr_zone'] loop
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = c) then
      execute format('update public.profiles set %1$I = (select %1$I from public.profiles where id = $1) where id = $2 and (select %1$I from public.profiles where id = $1) is not null', c) using old_id, new_id;
    end if;
  end loop;
end $$;

-- Check: these two numbers should be your workout and journal counts.
select (select count(*) from workouts where user_id = (select id from auth.users where lower(email) = 'gpspicer2@gmail.com')) as workouts,
       (select count(*) from journal_entries where user_id = (select id from auth.users where lower(email) = 'gpspicer2@gmail.com')) as journal_entries;
