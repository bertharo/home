-- ===========================================================================
-- Home — Postgres schema (run in Supabase SQL editor for a fresh install)
-- ---------------------------------------------------------------------------
-- Multi-tenant model:
-- * A `household` is the tenant boundary. Anyone can sign up; each user belongs
--   to at most one household (profiles.household_id), joined by creating a new
--   household or accepting an invite.
-- * Every data row carries a `household_id`, defaulted to the caller's
--   household via current_household_id() and enforced by RLS so households
--   never see each other's data.
-- * `created_by` / `assignee_id` provide attribution/assignment within a
--   household.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- households: the tenant. One row per shared home.
-- ---------------------------------------------------------------------------
create table if not exists public.households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'Our Home',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, auto-created on signup. household_id is
-- null until the user creates or joins a household during onboarding.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text not null,
  color        text not null default '#2563eb',
  household_id uuid references public.households(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Resolve the caller's household without tripping profiles' RLS (SECURITY
-- DEFINER) — also used as the DEFAULT for household_id columns below.
create or replace function public.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.profiles where id = auth.uid()
$$;

-- Auto-create a profile (no household yet) whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, color)
  values (
    new.id,
    new.email,
    coalesce(split_part(new.email, '@', 1), 'Member'),
    '#2563eb'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- invites: share a link (or note an email) to let someone join a household.
-- ---------------------------------------------------------------------------
create table if not exists public.invites (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email        text,
  token        text not null unique default encode(gen_random_bytes(16), 'hex'),
  invited_by   uuid references public.profiles(id) on delete set null,
  expires_at   timestamptz not null default (now() + interval '14 days'),
  accepted_at  timestamptz,
  accepted_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists invites_token_idx on public.invites (token);
create index if not exists invites_household_idx on public.invites (household_id);

-- ---------------------------------------------------------------------------
-- To-dos
-- ---------------------------------------------------------------------------
create table if not exists public.todos (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.current_household_id()
                 references public.households(id) on delete cascade,
  title        text not null,
  notes        text,
  status       text not null default 'open' check (status in ('open','done')),
  assignee_id  uuid references public.profiles(id) on delete set null,
  for_both     boolean not null default false,
  due_date     date,
  created_by   uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists todos_household_idx on public.todos (household_id);

-- ---------------------------------------------------------------------------
-- Chores (recurring, with optional rotation)
-- ---------------------------------------------------------------------------
create table if not exists public.chores (
  id                  uuid primary key default gen_random_uuid(),
  household_id        uuid not null default public.current_household_id()
                        references public.households(id) on delete cascade,
  title               text not null,
  notes               text,
  recurrence          text not null default 'weekly'
                        check (recurrence in ('none','daily','weekly','biweekly','monthly','yearly')),
  rotate              boolean not null default false,
  current_assignee_id uuid references public.profiles(id) on delete set null,
  last_done_at        timestamptz,
  last_done_by        uuid references public.profiles(id) on delete set null,
  next_due            date,
  created_by          uuid not null references public.profiles(id) on delete cascade,
  created_at          timestamptz not null default now()
);
create index if not exists chores_household_idx on public.chores (household_id);

-- ---------------------------------------------------------------------------
-- Grocery list
-- ---------------------------------------------------------------------------
create table if not exists public.grocery_items (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.current_household_id()
                 references public.households(id) on delete cascade,
  name         text not null,
  section      text not null default 'Other',
  qty          text,
  checked      boolean not null default false,
  created_by   uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now()
);
create index if not exists grocery_items_household_idx on public.grocery_items (household_id);

-- ---------------------------------------------------------------------------
-- Pickup / drop-off duties
-- ---------------------------------------------------------------------------
create table if not exists public.pickup_duties (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.current_household_id()
                 references public.households(id) on delete cascade,
  label        text not null,
  day_of_week  int not null check (day_of_week between 0 and 6),
  assignee_id  uuid references public.profiles(id) on delete set null,
  notes        text,
  created_by   uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now()
);
create index if not exists pickup_duties_household_idx on public.pickup_duties (household_id);

-- ---------------------------------------------------------------------------
-- Budget: dynamic running-balance forecast (one settings row per household).
-- All money stored as INTEGER CENTS (bigint). Balances are computed by the
-- app engine, never stored as source of truth.
-- ---------------------------------------------------------------------------
create table if not exists public.budget_settings (
  household_id     uuid primary key default public.current_household_id()
                     references public.households(id) on delete cascade,
  starting_balance bigint not null default 0, -- cents
  start_year       int not null,
  start_month      int not null check (start_month between 1 and 12),
  horizon_months   int not null default 24 check (horizon_months between 1 and 120),
  onboarded        boolean not null default false,
  updated_at       timestamptz not null default now()
);

create table if not exists public.budget_categories (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null default public.current_household_id()
                   references public.households(id) on delete cascade,
  name           text not null,
  kind           text not null check (kind in ('revenue','expense')),
  default_amount bigint not null default 0, -- cents
  cadence        text not null default 'monthly'
                   check (cadence in ('monthly','specific_months','none')),
  cadence_months int[] not null default '{}',
  active         boolean not null default true,
  sort_order     int not null default 0,
  created_by     uuid not null references public.profiles(id) on delete cascade,
  updated_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists budget_categories_kind_idx
  on public.budget_categories (kind, sort_order);
create index if not exists budget_categories_household_idx
  on public.budget_categories (household_id);

create table if not exists public.budget_overrides (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.current_household_id()
                 references public.households(id) on delete cascade,
  category_id  uuid not null references public.budget_categories(id) on delete cascade,
  year         int not null,
  month        int not null check (month between 1 and 12),
  amount       bigint not null default 0, -- cents
  created_by   uuid not null references public.profiles(id) on delete cascade,
  updated_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (category_id, year, month)
);
create index if not exists budget_overrides_cat_idx
  on public.budget_overrides (category_id, year, month);
create index if not exists budget_overrides_household_idx
  on public.budget_overrides (household_id);

-- ---------------------------------------------------------------------------
-- Annual goals
-- ---------------------------------------------------------------------------
create table if not exists public.goals (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null default public.current_household_id()
                  references public.households(id) on delete cascade,
  title         text not null,
  description   text,
  kind          text not null default 'joint' check (kind in ('individual','joint')),
  owner_id      uuid references public.profiles(id) on delete set null,
  status        text not null default 'not_started'
                  check (status in ('not_started','in_progress','on_hold','done')),
  progress_note text,
  year          int not null default extract(year from current_date),
  created_by    uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists goals_household_idx on public.goals (household_id);

-- ---------------------------------------------------------------------------
-- Vacation ideas + links + photos (links/photos inherit isolation via idea)
-- ---------------------------------------------------------------------------
create table if not exists public.vacation_ideas (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.current_household_id()
                 references public.households(id) on delete cascade,
  title        text not null,
  notes        text,
  rough_cost   numeric(12,2),
  rough_timing text,
  status       text not null default 'idea'
                 check (status in ('idea','researching','planned','booked')),
  created_by   uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now()
);
create index if not exists vacation_ideas_household_idx on public.vacation_ideas (household_id);

create table if not exists public.vacation_links (
  id         uuid primary key default gen_random_uuid(),
  idea_id    uuid not null references public.vacation_ideas(id) on delete cascade,
  url        text not null,
  label      text,
  created_at timestamptz not null default now()
);

create table if not exists public.vacation_photos (
  id           uuid primary key default gen_random_uuid(),
  idea_id      uuid not null references public.vacation_ideas(id) on delete cascade,
  storage_path text not null,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Google Calendar OAuth tokens (one per user)
-- ---------------------------------------------------------------------------
create table if not exists public.google_accounts (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  google_email  text,
  access_token  text not null,
  refresh_token text not null,
  expiry        timestamptz not null,
  calendar_id   text not null default 'primary',
  updated_at    timestamptz not null default now()
);

-- ===========================================================================
-- Row Level Security — household isolation.
-- ===========================================================================

alter table public.households            enable row level security;
alter table public.invites               enable row level security;
alter table public.profiles              enable row level security;
alter table public.todos                 enable row level security;
alter table public.chores                enable row level security;
alter table public.grocery_items         enable row level security;
alter table public.pickup_duties         enable row level security;
alter table public.budget_settings       enable row level security;
alter table public.budget_categories     enable row level security;
alter table public.budget_overrides      enable row level security;
alter table public.goals                 enable row level security;
alter table public.vacation_ideas        enable row level security;
alter table public.vacation_links        enable row level security;
alter table public.vacation_photos       enable row level security;
alter table public.google_accounts       enable row level security;

-- Data tables that carry household_id directly.
do $$
declare
  t text;
  scoped_tables text[] := array[
    'todos','chores','grocery_items','pickup_duties',
    'budget_settings','budget_categories','budget_overrides',
    'goals','vacation_ideas'
  ];
begin
  foreach t in array scoped_tables loop
    execute format('drop policy if exists "household_isolation" on public.%I;', t);
    execute format(
      'create policy "household_isolation" on public.%I
         for all to authenticated
         using (household_id = public.current_household_id())
         with check (household_id = public.current_household_id());', t);
  end loop;
end $$;

-- vacation_links / vacation_photos: isolate via parent idea's household.
do $$
declare
  t text;
begin
  foreach t in array array['vacation_links','vacation_photos'] loop
    execute format('drop policy if exists "household_isolation" on public.%I;', t);
    execute format(
      'create policy "household_isolation" on public.%I
         for all to authenticated
         using (exists (
           select 1 from public.vacation_ideas i
           where i.id = %I.idea_id
             and i.household_id = public.current_household_id()))
         with check (exists (
           select 1 from public.vacation_ideas i
           where i.id = %I.idea_id
             and i.household_id = public.current_household_id()));',
      t, t, t);
  end loop;
end $$;

-- profiles: visible within your household; always see + update yourself.
drop policy if exists "profiles_read" on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_read" on public.profiles
  for select to authenticated
  using (id = auth.uid() or household_id = public.current_household_id());
create policy "profiles_self_update" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- households: members read; owner writes; any authenticated user can create.
drop policy if exists "households_read" on public.households;
drop policy if exists "households_insert" on public.households;
drop policy if exists "households_owner_write" on public.households;
create policy "households_read" on public.households
  for select to authenticated
  using (id = public.current_household_id() or created_by = auth.uid());
create policy "households_insert" on public.households
  for insert to authenticated
  with check (created_by = auth.uid());
create policy "households_owner_write" on public.households
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- invites: members manage their household's invites (accept happens server-side).
drop policy if exists "invites_household" on public.invites;
create policy "invites_household" on public.invites
  for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

-- google_accounts: owner-only
drop policy if exists "own_google_account" on public.google_accounts;
create policy "own_google_account" on public.google_accounts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- updated_at touch triggers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists goals_touch on public.goals;
create trigger goals_touch before update on public.goals
  for each row execute function public.touch_updated_at();

drop trigger if exists budget_settings_touch on public.budget_settings;
create trigger budget_settings_touch before update on public.budget_settings
  for each row execute function public.touch_updated_at();

drop trigger if exists budget_categories_touch on public.budget_categories;
create trigger budget_categories_touch before update on public.budget_categories
  for each row execute function public.touch_updated_at();

drop trigger if exists budget_overrides_touch on public.budget_overrides;
create trigger budget_overrides_touch before update on public.budget_overrides
  for each row execute function public.touch_updated_at();

-- ===========================================================================
-- Storage bucket for vacation photos
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('vacation-photos', 'vacation-photos', true)
on conflict (id) do nothing;

drop policy if exists "vacation_photos_read" on storage.objects;
create policy "vacation_photos_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'vacation-photos');

drop policy if exists "vacation_photos_write" on storage.objects;
create policy "vacation_photos_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vacation-photos');

drop policy if exists "vacation_photos_delete" on storage.objects;
create policy "vacation_photos_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'vacation-photos');
