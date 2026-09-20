-- Kept in the repo for reference — this is exactly what was run in the
-- Supabase SQL editor to set up the Groove database. Not executed by the
-- app itself.

-- Every signed-in user gets a profile row automatically. Role defaults to
-- 'client' — Greg's own account gets flipped to 'trainer' by hand after
-- he signs up (see notes at the bottom of this file).
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'client',
  -- self-reported bodyweight, editable from Birdseye — used so "bodyweight"
  -- can be logged as a set's weight (e.g. pull-ups, dips) without retyping it
  bodyweight_lb numeric,
  -- which day starts the week for weekly-goal / calendar math — 'sunday' or 'monday'
  week_start_day text not null default 'sunday',
  -- a client's own saved custom movement types (Move's "what kind of
  -- movement" picker), so a typed-in activity is remembered next time
  custom_activities text[] not null default '{}',
  -- heart-rate-reserve inputs for ACSM-style intensity prescription
  resting_hr_bpm numeric,
  max_hr_bpm numeric,
  max_hr_measured boolean not null default false,
  -- trainer-set target intensity zone for this client's aerobic work
  prescribed_hr_zone text,
  -- client-adjustable weekly goals shown on Birdseye
  resistance_goal integer not null default 3,
  aerobic_goal integer not null default 3,
  -- self-reported, entered from Account — age feeds the age-based max HR
  -- estimate when no measured max HR is on file; gender only drives a
  -- cosmetic emoji next to "Start workout" in Move
  age integer,
  gender text,
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;

-- Everyone can see their own profile; a trainer can see every client's
-- profile (needed for the client list on the coach side).
create policy "profiles_self_select" on profiles for select
  using (auth.uid() = id);
create policy "profiles_trainer_select_all" on profiles for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'trainer'));
create policy "profiles_self_update" on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
-- lets the trainer set a client's prescribed_hr_zone from the client view
create policy "profiles_trainer_update" on profiles for update
  using (public.is_trainer()) with check (public.is_trainer());

-- Auto-create a profile row whenever someone signs up.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The full "Getting Acquainted" intake form, plus the physical
-- self-assessment (push-ups, plank, walk, stairs, estimated 1RMs).
-- Stored as JSONB since the question set is still evolving — each key
-- is a stable slug for one form question/section.
create table baseline_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  form_answers jsonb not null default '{}',
  fitness_assessment jsonb not null default '{}',
  submitted_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table baseline_responses enable row level security;
create policy "baseline_client_all" on baseline_responses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "baseline_trainer_select" on baseline_responses for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'trainer'));
create unique index baseline_responses_user_uq on baseline_responses(user_id);

-- A program is what Greg assigns; program_exercises is the prescribed
-- plan. A client's actual workouts/workout_sets can reference a program
-- (they followed it) or not (they trained on their own) — comparing the
-- two is how a "deviation" shows up on the coach side.
create table programs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id),
  trainer_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  created_at timestamptz not null default now()
);
alter table programs enable row level security;
create policy "programs_client_select" on programs for select
  using (auth.uid() = client_id);
create policy "programs_trainer_all" on programs for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'trainer'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'trainer'));

create table program_exercises (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  exercise_name text not null,
  muscle_group text not null,
  target_sets integer not null,
  target_reps text not null,
  order_index integer not null default 0
);
alter table program_exercises enable row level security;
create policy "program_exercises_client_select" on program_exercises for select
  using (exists (select 1 from programs pr where pr.id = program_id and pr.client_id = auth.uid()));
create policy "program_exercises_trainer_all" on program_exercises for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'trainer'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'trainer'));

-- Workout logging — same shape as LifeOS's Fitness tab tables, plus an
-- optional link back to the program it was following.
create table workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  program_id uuid references programs(id),
  muscle_groups text[] not null default '{}',
  -- training style picked for this session — drives the suggested
  -- sets/reps/progression (power: low reps, heavy; strength: moderate;
  -- endurance: high reps, lighter)
  style text,
  -- where the session happens: 'Outdoors' | 'In the Home' | 'At the Gym' —
  -- narrows the suggested exercise pool to what's realistically available
  location text,
  -- non-resistance activity types picked for this session (Walking,
  -- Yoga, Dancing, etc.) — shown alongside muscle_groups in the header
  activities text[] not null default '{}',
  -- soft delete: kept (not removed) so it can be restored from Birdseye's
  -- "Deleted Workouts" list; excluded from History/calendar/streak math
  deleted_at timestamptz,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table workouts enable row level security;
create policy "workouts_client_all" on workouts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workouts_trainer_select" on workouts for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'trainer'));

create table workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  exercise_name text not null,
  muscle_group text not null,
  set_number integer not null,
  weight numeric,
  reps integer,
  -- 'resistance' (default) or 'aerobic' — aerobic sets use duration/distance
  -- instead of weight/reps
  movement_type text not null default 'resistance',
  is_bodyweight boolean not null default false,
  duration_seconds integer,
  distance text,
  created_at timestamptz not null default now()
);
alter table workout_sets enable row level security;
create policy "workout_sets_client_all" on workout_sets for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workout_sets_trainer_select" on workout_sets for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'trainer'));

-- Journal: simple prompt-and-response entries.
create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  prompt text not null,
  response text not null,
  -- set for guided "daily check-in" entries (mood, favorite/least favorite
  -- movement, etc.) so they can render as structured fields instead of a
  -- single response string; null for freeform single-prompt entries
  structured jsonb,
  -- client-controlled: when true, hidden from the trainer's view entirely
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);
alter table journal_entries enable row level security;
create policy "journal_client_all" on journal_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "journal_trainer_select" on journal_entries for select
  using (is_private = false and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'trainer'));

-- Messages: real-time chat between a client and Greg. Since there's only
-- one trainer for now, each row is just sender -> recipient.
create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) default auth.uid(),
  recipient_id uuid not null references auth.users(id),
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
alter table messages enable row level security;
create policy "messages_participant_select" on messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "messages_sender_insert" on messages for insert
  with check (auth.uid() = sender_id);
create policy "messages_recipient_update" on messages for update
  using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

-- Realtime needs to know which tables to broadcast changes for.
alter publication supabase_realtime add table messages;

-- "Reasons to Move" — short weekly articles Greg posts, shown in the
-- Learn tab. Everyone can read; only the trainer can write.
create table articles (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) default auth.uid(),
  title text not null,
  summary text not null,
  url text,
  created_at timestamptz not null default now()
);
alter table articles enable row level security;
create policy "articles_select_all" on articles for select using (true);
create policy "articles_trainer_write" on articles for all
  using (public.is_trainer()) with check (public.is_trainer());

-- ── After running everything above, run this ONE line yourself, once ──
-- ── you've signed up your own account in the app, to make yourself   ──
-- ── the trainer (replace the email if you sign up with a different   ──
-- ── one):                                                             ──
--
-- update profiles set role = 'trainer' where email = 'gpspicer2@gmail.com';
