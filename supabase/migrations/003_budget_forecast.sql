-- ===========================================================================
-- Migration: dynamic running-balance budget forecast.
-- Replaces every earlier budget model (transactions, budget_lines/amounts/meta)
-- with categories + per-month overrides + a settings singleton. Money is stored
-- as INTEGER CENTS to keep long balance chains exact.
-- Safe to run once in the Supabase SQL editor.
-- ===========================================================================

-- 1. Drop all prior budget tables (and their data).
drop table if exists public.budget_amounts cascade;
drop table if exists public.budget_lines cascade;
drop table if exists public.budget_meta cascade;
drop table if exists public.transactions cascade;
drop table if exists public.recurring_transactions cascade;
drop table if exists public.budget_categories cascade;

-- 2. New tables.
create table if not exists public.budget_settings (
  id               boolean primary key default true check (id),
  starting_balance bigint not null default 0,
  start_year       int not null,
  start_month      int not null check (start_month between 1 and 12),
  horizon_months   int not null default 24 check (horizon_months between 1 and 120),
  onboarded        boolean not null default false,
  updated_at       timestamptz not null default now()
);

create table if not exists public.budget_categories (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  kind           text not null check (kind in ('revenue','expense')),
  default_amount bigint not null default 0,
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

create table if not exists public.budget_overrides (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.budget_categories(id) on delete cascade,
  year        int not null,
  month       int not null check (month between 1 and 12),
  amount      bigint not null default 0,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  updated_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (category_id, year, month)
);
create index if not exists budget_overrides_cat_idx
  on public.budget_overrides (category_id, year, month);

-- 3. RLS: shared household access.
alter table public.budget_settings   enable row level security;
alter table public.budget_categories enable row level security;
alter table public.budget_overrides  enable row level security;

do $$
declare
  t text;
  shared_tables text[] := array['budget_settings','budget_categories','budget_overrides'];
begin
  foreach t in array shared_tables loop
    execute format('drop policy if exists "authenticated_all" on public.%I;', t);
    execute format(
      'create policy "authenticated_all" on public.%I
         for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- 4. Keep updated_at fresh (reuses public.touch_updated_at from the base schema).
drop trigger if exists budget_settings_touch on public.budget_settings;
create trigger budget_settings_touch before update on public.budget_settings
  for each row execute function public.touch_updated_at();

drop trigger if exists budget_categories_touch on public.budget_categories;
create trigger budget_categories_touch before update on public.budget_categories
  for each row execute function public.touch_updated_at();

drop trigger if exists budget_overrides_touch on public.budget_overrides;
create trigger budget_overrides_touch before update on public.budget_overrides
  for each row execute function public.touch_updated_at();
