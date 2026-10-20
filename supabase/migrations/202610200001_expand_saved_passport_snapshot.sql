-- Non-destructive upgrade for evidence-rich passports and My Vibe shortlists.
-- Run once after the earlier migrations. Does NOT reset customer data.
begin;
alter table public.saved_passports drop constraint if exists saved_passports_snapshot_check;
alter table public.saved_passports add constraint saved_passports_snapshot_check
  check (jsonb_typeof(snapshot) = 'object'
    and snapshot ? 'version' and snapshot->>'version' = '1'
    and snapshot ? 'city' and snapshot->>'city' = city
    and octet_length(snapshot::text) <= 2000000);
commit;
