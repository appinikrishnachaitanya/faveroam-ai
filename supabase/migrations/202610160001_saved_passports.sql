-- Apply in your own Supabase project. No credentials or customer rows belong here.
begin;
create table if not exists public.saved_passports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  city text not null check (city in ('Toronto','New York City','London','Paris','Tokyo')),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and snapshot ? 'version' and snapshot->>'version' = '1' and snapshot ? 'city' and snapshot->>'city' = city and octet_length(snapshot::text) <= 600000),
  updated_at timestamptz not null default now(),
  unique(user_id,city)
);
alter table public.saved_passports enable row level security;
-- Browsers may read/delete their own rows. Only the authenticated server writer
-- can insert/update evidence: clients cannot fabricate Qloo snapshots directly.
revoke all on public.saved_passports from anon, authenticated;
grant select, delete on public.saved_passports to authenticated;
grant all on public.saved_passports to service_role;
drop policy if exists saved_passports_read_own on public.saved_passports;
drop policy if exists saved_passports_delete_own on public.saved_passports;
create policy saved_passports_read_own on public.saved_passports for select to authenticated using ((select auth.uid()) = user_id);
create policy saved_passports_delete_own on public.saved_passports for delete to authenticated using ((select auth.uid()) = user_id);

commit;
