begin;
create table if not exists public.taste_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null check (jsonb_typeof(profile) = 'object' and profile->>'version' = '1' and octet_length(profile::text) <= 50000),
  updated_at timestamptz not null default now()
);
alter table public.taste_profiles enable row level security;
revoke all on public.taste_profiles from anon, authenticated;
grant select, delete on public.taste_profiles to authenticated;
grant all on public.taste_profiles to service_role;
drop policy if exists taste_profiles_read_own on public.taste_profiles;
drop policy if exists taste_profiles_delete_own on public.taste_profiles;
create policy taste_profiles_read_own on public.taste_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy taste_profiles_delete_own on public.taste_profiles for delete to authenticated using ((select auth.uid()) = user_id);
commit;
