-- ===========================================================================
-- Migration: replace transaction-based budget with a monthly cash-flow model.
-- Safe to run once in the Supabase SQL editor. Drops the old budget tables
-- (transactions / recurring_transactions / budget_categories) and creates the
-- new cash-flow tables.
-- ===========================================================================

-- 1. Remove the old budget tables (and their data).
drop table if exists public.transactions cascade;
drop table if exists public.recurring_transactions cascade;
drop table if exists public.budget_categories cascade;

-- 2. New cash-flow tables.
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
  month      date not null,
  amount     numeric(12,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (line_id, month)
);
create index if not exists budget_amounts_month_idx on public.budget_amounts (month);

create table if not exists public.budget_meta (
  id               boolean primary key default true check (id),
  start_month      date not null,
  starting_balance numeric(12,2) not null default 0,
  updated_at       timestamptz not null default now()
);

-- 3. RLS: shared household access for the new tables.
alter table public.budget_lines   enable row level security;
alter table public.budget_amounts enable row level security;
alter table public.budget_meta    enable row level security;

do $$
declare
  t text;
  shared_tables text[] := array['budget_lines','budget_amounts','budget_meta'];
begin
  foreach t in array shared_tables loop
    execute format('drop policy if exists "authenticated_all" on public.%I;', t);
    execute format(
      'create policy "authenticated_all" on public.%I
         for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- 4. Keep updated_at fresh (reuses public.touch_updated_at from the base schema).
drop trigger if exists budget_amounts_touch on public.budget_amounts;
create trigger budget_amounts_touch before update on public.budget_amounts
  for each row execute function public.touch_updated_at();

drop trigger if exists budget_meta_touch on public.budget_meta;
create trigger budget_meta_touch before update on public.budget_meta
  for each row execute function public.touch_updated_at();
