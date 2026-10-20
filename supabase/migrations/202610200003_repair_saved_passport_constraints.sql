-- SAFE REPAIR for existing installations that did not apply earlier constraint upgrades.
-- Preserves saved_passports rows, RLS, ownership and every saved plan.
-- Only replaces our two known named CHECK constraints, never drops data.
begin;
alter table public.saved_passports drop constraint if exists saved_passports_city_check;
alter table public.saved_passports add constraint saved_passports_city_check
  check (char_length(btrim(city)) between 2 and 100);
alter table public.saved_passports drop constraint if exists saved_passports_snapshot_check;
alter table public.saved_passports add constraint saved_passports_snapshot_check
  check (
    jsonb_typeof(snapshot) = 'object'
    and snapshot ? 'version' and snapshot->>'version' = '1'
    and snapshot ? 'city' and snapshot->>'city' = city
    and octet_length(snapshot::text) <= 2000000
  );
commit;
-- Read-only diagnostic query for app owners after applying the migration:
-- select conname, pg_get_constraintdef(oid) from pg_constraint
-- where conrelid = 'public.saved_passports'::regclass and contype = 'c';
