-- Public, administrator-managed city catalogue. No customer data.
begin;
create table if not exists public.destinations (
  name text primary key check (char_length(btrim(name)) between 2 and 100),
  enabled boolean not null default true,
  sort_order integer not null default 100
);
alter table public.destinations enable row level security;
revoke all on public.destinations from anon, authenticated;
grant select on public.destinations to anon, authenticated;
grant all on public.destinations to service_role;
drop policy if exists destinations_public_read on public.destinations;
create policy destinations_public_read on public.destinations for select to anon, authenticated using (enabled = true);
insert into public.destinations (name, sort_order) values
('Toronto', 1), ('New York City', 2), ('London', 3), ('Paris', 4), ('Tokyo', 5),
('Bengaluru', 6), ('Mumbai', 7), ('Singapore', 8), ('Berlin', 9), ('Sydney', 10)
on conflict (name) do nothing;
commit;
