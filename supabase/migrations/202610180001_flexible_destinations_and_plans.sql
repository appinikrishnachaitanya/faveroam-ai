-- Upgrade existing installations; keep RLS, ownership and server-only writes.
begin;
alter table public.saved_passports drop constraint if exists saved_passports_city_check;
alter table public.saved_passports add constraint saved_passports_city_check
  check (char_length(btrim(city)) between 2 and 100);
alter table public.saved_plans drop constraint if exists saved_plans_city_check;
alter table public.saved_plans add constraint saved_plans_city_check
  check (char_length(btrim(city)) between 2 and 100);
alter table public.saved_plans drop constraint if exists saved_plans_stops_check;
alter table public.saved_plans add constraint saved_plans_stops_check
  check (jsonb_typeof(stops) = 'array' and jsonb_array_length(stops) between 1 and 5 and octet_length(stops::text) <= 120000);
commit;
