begin;
alter table public.taste_profiles add column if not exists id uuid not null default gen_random_uuid();
alter table public.taste_profiles add column if not exists name text not null default 'My tastes';
alter table public.taste_profiles drop constraint if exists taste_profiles_pkey;
alter table public.taste_profiles add constraint taste_profiles_pkey primary key (id);
create unique index if not exists taste_profiles_owner_name on public.taste_profiles(user_id, name);
commit;
