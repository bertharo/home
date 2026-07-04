-- ===========================================================================
-- Home Hub — Postgres schema (run in Supabase SQL editor)
-- ---------------------------------------------------------------------------
-- Model notes:
-- * Exactly two users share ALL data (a household). RLS therefore grants any
--   authenticated user full access; row `created_by` provides attribution and
--   `assignee_id` provides assignment. The two-user limit is enforced at the
--   auth/app layer (ALLOWED_EMAILS + no public signup).
-- ===========================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, auto-created on signup
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text not null,
  color        text not null default '#2563eb',
  created_at   timestamptz not null default now()
);

-- Auto-create a profile whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  existing_count int;
  assigned_color text;
begin
  select count(*) into existing_count from public.profiles;
  -- First user gets blue, second gets pink.
  assigned_color := case when existing_count = 0 then '#2563eb' else '#db2777' end;

  insert into public.profiles (id, email, display_name, color)
  values (
    new.id,
    new.email,
    coalesce(split_part(new.email, '@', 1), 'Member'),
    assigned_color
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
-- To-dos
-- ---------------------------------------------------------------------------
create table if not exists public.todos (
  id           uuid primary key default gen_random_uuid(),
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

-- ---------------------------------------------------------------------------
-- Chores (recurring, with optional 2-person rotation)
-- ---------------------------------------------------------------------------
create table if not exists public.chores (
  id                  uuid primary key default gen_random_uuid(),
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

-- ---------------------------------------------------------------------------
-- Grocery list
-- ---------------------------------------------------------------------------
create table if not exists public.grocery_items (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  section    text not null default 'Other',
  qty        text,
  checked    boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Pickup / drop-off duties (lightweight weekly schedule)
-- ---------------------------------------------------------------------------
create table if not exists public.pickup_duties (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  day_of_week int not null check (day_of_week between 0 and 6),
  assignee_id uuid references public.profiles(id) on delete set null,
  notes       text,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Budget: spreadsheet-style monthly cash flow.
--   * budget_lines  = the row labels (each an expense or a revenue item)
--   * budget_amounts = one value per line per month
--   * budget_meta   = singleton: the starting month + opening balance.
-- Derived per month:
--   Total Expenses          = sum of expense-line amounts
--   Total Revenue           = sum of revenue-line amounts
--   Beginning Balance       = opening balance (start month) OR prior month's
--                             Total Remaining Balance
--   Total Remaining Balance = Beginning Balance + Total Revenue - Total Expenses
-- ---------------------------------------------------------------------------
create table if not exists public.budget_lines (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('expense','revenue')),
  name       text not null,
  sort_order int not null default 0,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists budget_lines_kind_idx on public.budget_lines (kind, sort_order);

create table if not exists public.budget_amounts (
  id         uuid primary key default gen_random_uuid(),
  line_id    uuid not null references public.budget_lines(id) on delete cascade,
  month      date not null, -- always the first day of the month
  amount     numeric(12,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (line_id, month)
);
create index if not exists budget_amounts_month_idx on public.budget_amounts (month);

-- Singleton row (id is always true) holding the opening balance.
create table if not exists public.budget_meta (
  id               boolean primary key default true check (id),
  start_month      date not null,
  starting_balance numeric(12,2) not null default 0,
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Annual goals
-- ---------------------------------------------------------------------------
create table if not exists public.goals (
  id            uuid primary key default gen_random_uuid(),
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

-- ---------------------------------------------------------------------------
-- Vacation ideas + links + photos
-- ---------------------------------------------------------------------------
create table if not exists public.vacation_ideas (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  notes        text,
  rough_cost   numeric(12,2),
  rough_timing text,
  status       text not null default 'idea'
                 check (status in ('idea','researching','planned','booked')),
  created_by   uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now()
);

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
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Two trusted users share everything -> any authenticated user has full CRUD.
-- google_accounts is the exception: users only see/write their own tokens.
-- ===========================================================================

alter table public.profiles              enable row level security;
alter table public.todos                 enable row level security;
alter table public.chores                enable row level security;
alter table public.grocery_items         enable row level security;
alter table public.pickup_duties         enable row level security;
alter table public.budget_lines          enable row level security;
alter table public.budget_amounts        enable row level security;
alter table public.budget_meta           enable row level security;
alter table public.goals                 enable row level security;
alter table public.vacation_ideas        enable row level security;
alter table public.vacation_links        enable row level security;
alter table public.vacation_photos       enable row level security;
alter table public.google_accounts       enable row level security;

-- Helper: create "authenticated users can do everything" policies.
do $$
declare
  t text;
  shared_tables text[] := array[
    'profiles','todos','chores','grocery_items','pickup_duties',
    'budget_lines','budget_amounts','budget_meta','goals',
    'vacation_ideas','vacation_links','vacation_photos'
  ];
begin
  foreach t in array shared_tables loop
    execute format('drop policy if exists "authenticated_all" on public.%I;', t);
    execute format(
      'create policy "authenticated_all" on public.%I
         for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- google_accounts: owner-only
drop policy if exists "own_google_account" on public.google_accounts;
create policy "own_google_account" on public.google_accounts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Keep goals.updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists goals_touch on public.goals;
create trigger goals_touch before update on public.goals
  for each row execute function public.touch_updated_at();

drop trigger if exists budget_amounts_touch on public.budget_amounts;
create trigger budget_amounts_touch before update on public.budget_amounts
  for each row execute function public.touch_updated_at();

drop trigger if exists budget_meta_touch on public.budget_meta;
create trigger budget_meta_touch before update on public.budget_meta
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
