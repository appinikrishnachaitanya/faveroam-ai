begin;
create table if not exists public.saved_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  city text not null check (city in ('Toronto','New York City','London','Paris','Tokyo')),
  scheduled_date date not null,
  time_zone text not null,
  stops jsonb not null check (jsonb_typeof(stops) = 'array' and jsonb_array_length(stops) between 1 and 3 and octet_length(stops::text) <= 120000),
  created_at timestamptz not null default now(),
  unique(user_id,city,scheduled_date)
);
alter table public.saved_plans enable row level security;
revoke all on public.saved_plans from anon, authenticated;
grant select, delete on public.saved_plans to authenticated;
grant all on public.saved_plans to service_role;
drop policy if exists saved_plans_read_own on public.saved_plans;
drop policy if exists saved_plans_delete_own on public.saved_plans;
create policy saved_plans_read_own on public.saved_plans for select to authenticated using ((select auth.uid()) = user_id);
create policy saved_plans_delete_own on public.saved_plans for delete to authenticated using ((select auth.uid()) = user_id);
commit;
