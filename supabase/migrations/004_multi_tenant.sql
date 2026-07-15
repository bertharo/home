-- ===========================================================================
-- 004_multi_tenant.sql — convert the single-shared-household app into a
-- multi-tenant product. Every household is isolated; anyone can sign up, get
-- their own household, and invite others.
--
-- Strategy:
--   * New `households` + `invites` tables.
--   * `household_id` on `profiles` (nullable until onboarding) and on every
--     data table (NOT NULL, defaulted to the caller's household).
--   * RLS rewritten from "any authenticated user sees everything" to
--     "rows are visible only within the caller's household".
--   * `current_household_id()` resolves the caller's household without RLS
--     recursion (SECURITY DEFINER), and doubles as the column DEFAULT so
--     inserts are auto-scoped with no app-code changes.
--
-- Safe to re-run: guarded with IF [NOT] EXISTS and idempotent backfill.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Tenancy tables
-- ---------------------------------------------------------------------------
create table if not exists public.households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'Our Home',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

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
-- 2. household_id columns
--    profiles: nullable (a brand-new user has no household until onboarding).
--    data tables: added nullable now, backfilled, then set NOT NULL below.
-- ---------------------------------------------------------------------------
alter table public.profiles          add column if not exists household_id uuid references public.households(id) on delete set null;
alter table public.todos             add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.chores            add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.grocery_items     add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.pickup_duties     add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.budget_categories add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.budget_overrides  add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.goals             add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.vacation_ideas    add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.budget_settings   add column if not exists household_id uuid references public.households(id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 3. Resolve caller's household. SECURITY DEFINER so it can read profiles
--    without tripping profiles' own RLS (prevents infinite recursion).
-- ---------------------------------------------------------------------------
create or replace function public.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.profiles where id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- 4. Backfill: fold all pre-existing data into a single household so the
--    current two-person household keeps working after the migration.
-- ---------------------------------------------------------------------------
do $$
declare
  hh uuid;
  first_user uuid;
begin
  if exists (select 1 from public.profiles)
     and not exists (select 1 from public.households) then

    select id into first_user
      from public.profiles order by created_at asc limit 1;

    insert into public.households (name, created_by)
      values ('Our Home', first_user)
      returning id into hh;

    update public.profiles          set household_id = hh where household_id is null;
    update public.todos             set household_id = hh where household_id is null;
    update public.chores            set household_id = hh where household_id is null;
    update public.grocery_items     set household_id = hh where household_id is null;
    update public.pickup_duties     set household_id = hh where household_id is null;
    update public.budget_categories set household_id = hh where household_id is null;
    update public.budget_overrides  set household_id = hh where household_id is null;
    update public.goals             set household_id = hh where household_id is null;
    update public.vacation_ideas    set household_id = hh where household_id is null;
    update public.budget_settings   set household_id = hh where household_id is null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Defaults + NOT NULL on data tables. The DEFAULT auto-scopes every insert
--    to the caller's household, so application inserts need no changes.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  data_tables text[] := array[
    'todos','chores','grocery_items','pickup_duties',
    'budget_categories','budget_overrides','goals','vacation_ideas'
  ];
begin
  foreach t in array data_tables loop
    execute format(
      'alter table public.%I alter column household_id set default public.current_household_id();', t);
    execute format(
      'alter table public.%I alter column household_id set not null;', t);
    execute format(
      'create index if not exists %I on public.%I (household_id);',
      t || '_household_idx', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6. budget_settings: was a global singleton (id boolean primary key). Make it
--    one row per household keyed by household_id.
-- ---------------------------------------------------------------------------
alter table public.budget_settings alter column household_id set default public.current_household_id();
alter table public.budget_settings alter column household_id set not null;
alter table public.budget_settings drop constraint if exists budget_settings_pkey;
alter table public.budget_settings drop column if exists id;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'budget_settings_pkey'
  ) then
    alter table public.budget_settings add primary key (household_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 7. New-user trigger: create a profile with NO household (the app's onboarding
--    creates or joins one). Color is assigned per-household at join time.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 8. RLS: replace "authenticated sees everything" with household isolation.
-- ---------------------------------------------------------------------------
alter table public.households enable row level security;
alter table public.invites    enable row level security;

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
    execute format('drop policy if exists "authenticated_all" on public.%I;', t);
    execute format('drop policy if exists "household_isolation" on public.%I;', t);
    execute format(
      'create policy "household_isolation" on public.%I
         for all to authenticated
         using (household_id = public.current_household_id())
         with check (household_id = public.current_household_id());', t);
  end loop;
end $$;

-- vacation_links / vacation_photos inherit isolation via their parent idea.
do $$
declare
  t text;
begin
  foreach t in array array['vacation_links','vacation_photos'] loop
    execute format('drop policy if exists "authenticated_all" on public.%I;', t);
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

-- profiles: visible within your household; you can always see + update yourself.
drop policy if exists "authenticated_all" on public.profiles;
drop policy if exists "profiles_read" on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_read" on public.profiles
  for select to authenticated
  using (id = auth.uid() or household_id = public.current_household_id());
create policy "profiles_self_update" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- households: members can read; the creator (owner) can update/delete; any
-- authenticated user can create one (they become the owner).
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

-- invites: members manage their own household's invites. Accepting an invite
-- happens server-side with the service role (invitee is not yet a member).
drop policy if exists "invites_household" on public.invites;
create policy "invites_household" on public.invites
  for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

-- ---------------------------------------------------------------------------
-- 9. Keep households.updated logic minimal (no updated_at column needed).
-- ---------------------------------------------------------------------------
