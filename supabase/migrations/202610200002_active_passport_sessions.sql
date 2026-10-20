-- Temporary server-side active Passport sessions, independent from explicitly saved Passports.
-- Safe, non-destructive; apply after the 202610200001 snapshot migration.
-- A service_role-only row can be recovered across Railway restarts/replicas.
begin;
create table if not exists public.active_passport_sessions (
  id uuid primary key,
  revision integer not null default 0 check (revision >= 0),
  state jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint active_passport_session_payload_check check (
    jsonb_typeof(state) = 'object'
    and state->>'id' = id::text
    and octet_length(state::text) <= 5000000
  )
);
create index if not exists active_passport_sessions_expires_idx
  on public.active_passport_sessions (expires_at);
alter table public.active_passport_sessions enable row level security;
revoke all on public.active_passport_sessions from anon, authenticated;
grant select, insert, update, delete on public.active_passport_sessions to service_role;
commit;
-- Expired rows are never loadable. Schedule periodic cleanup in your DB maintenance:
-- delete from public.active_passport_sessions where expires_at < now();
