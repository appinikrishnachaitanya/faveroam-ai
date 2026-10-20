-- MANUAL RESET: permanently deletes saved Passports, plans, reusable tastes and the city catalogue.
-- Run in Supabase SQL Editor as the project administrator. Existing Auth users remain.
-- This file is intentionally outside migrations: never run it automatically on deployment.
-- No city allowlist, city CHECK constraint or city foreign key. Starter cities are editable rows.
-- One transaction: any error rolls back the reset. No CASCADE into unrelated tables.
begin;
drop table if exists public.taste_profiles;
drop table if exists public.saved_plans;
drop table if exists public.saved_passports;
drop table if exists public.destinations;

-- Apply in your own Supabase project. No credentials or customer rows belong here.
create table public.saved_passports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  city text not null,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and snapshot ? 'version' and snapshot->>'version' = '1' and snapshot ? 'city' and snapshot->>'city' = city and octet_length(snapshot::text) <= 2000000),
  updated_at timestamptz not null default now(),
  unique(user_id,city)
);
alter table public.saved_passports enable row level security;
-- Browsers may read/delete their own rows. Only the authenticated server writer
-- can insert/update evidence: clients cannot fabricate Qloo snapshots directly.
revoke all on public.saved_passports from anon, authenticated;
grant select, delete on public.saved_passports to authenticated;
grant all on public.saved_passports to service_role;
create policy saved_passports_read_own on public.saved_passports for select to authenticated using ((select auth.uid()) = user_id);
create policy saved_passports_delete_own on public.saved_passports for delete to authenticated using ((select auth.uid()) = user_id);

create table public.saved_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  city text not null,
  scheduled_date date not null,
  time_zone text not null,
  stops jsonb not null check (jsonb_typeof(stops) = 'array' and jsonb_array_length(stops) between 1 and 5 and octet_length(stops::text) <= 120000),
  created_at timestamptz not null default now(),
  unique(user_id,city,scheduled_date)
);
alter table public.saved_plans enable row level security;
revoke all on public.saved_plans from anon, authenticated;
grant select, delete on public.saved_plans to authenticated;
grant all on public.saved_plans to service_role;
create policy saved_plans_read_own on public.saved_plans for select to authenticated using ((select auth.uid()) = user_id);
create policy saved_plans_delete_own on public.saved_plans for delete to authenticated using ((select auth.uid()) = user_id);

create table public.taste_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My tastes',
  profile jsonb not null check (jsonb_typeof(profile) = 'object' and profile->>'version' = '1' and octet_length(profile::text) <= 50000),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);
alter table public.taste_profiles enable row level security;
revoke all on public.taste_profiles from anon, authenticated;
grant select, delete on public.taste_profiles to authenticated;
grant all on public.taste_profiles to service_role;
create policy taste_profiles_read_own on public.taste_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy taste_profiles_delete_own on public.taste_profiles for delete to authenticated using ((select auth.uid()) = user_id);

-- Public, administrator-managed city catalogue. No customer data.
create table public.destinations (
  name text primary key,
  enabled boolean not null default true,
  sort_order integer not null default 100
);
alter table public.destinations enable row level security;
revoke all on public.destinations from anon, authenticated;
grant select on public.destinations to anon, authenticated;
grant all on public.destinations to service_role;
create policy destinations_public_read on public.destinations for select to anon, authenticated using (enabled = true);
insert into public.destinations (name, sort_order) values
('Toronto', 1), ('New York City', 2), ('London', 3), ('Paris', 4), ('Tokyo', 5),
('Bengaluru', 6), ('Mumbai', 7), ('Singapore', 8), ('Berlin', 9), ('Sydney', 10)
on conflict (name) do nothing;

commit;
