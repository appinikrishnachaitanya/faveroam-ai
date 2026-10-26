-- Non-destructive add-on for public, expiring taste cards. Run once in Supabase SQL Editor.
create table if not exists public.share_links (
  token_hash text primary key,
  revoke_hash text not null,
  owner_session_hash text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists share_links_owner_expiry_idx on public.share_links(owner_session_hash,expires_at);
create index if not exists share_links_expiry_idx on public.share_links(expires_at);
alter table public.share_links enable row level security;
revoke all on public.share_links from anon, authenticated;
grant select, insert, delete on public.share_links to service_role;
