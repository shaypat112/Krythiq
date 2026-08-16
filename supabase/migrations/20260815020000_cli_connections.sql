begin;

create table if not exists public.cli_device_codes (
  id uuid primary key default gen_random_uuid(),
  device_code_hash text not null unique check (char_length(device_code_hash) = 64),
  user_code text not null unique check (user_code ~ '^[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'consumed', 'denied')),
  expires_at timestamptz not null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.cli_access_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  name text not null default 'Krythiq CLI' check (char_length(name) between 1 and 100),
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.cli_scan_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cli_token_id uuid references public.cli_access_tokens(id) on delete set null,
  scan_history_id uuid,
  repository text not null check (char_length(repository) between 1 and 300),
  issues integer not null default 0 check (issues >= 0),
  token_cost integer not null default 0 check (token_cost >= 0),
  created_at timestamptz not null default now()
);

create index if not exists cli_device_codes_expiry_idx on public.cli_device_codes(expires_at);
create index if not exists cli_access_tokens_user_idx on public.cli_access_tokens(user_id, created_at desc);
create index if not exists cli_scan_events_user_created_idx on public.cli_scan_events(user_id, created_at desc);

alter table public.cli_device_codes enable row level security;
alter table public.cli_device_codes force row level security;
alter table public.cli_access_tokens enable row level security;
alter table public.cli_access_tokens force row level security;
alter table public.cli_scan_events enable row level security;
alter table public.cli_scan_events force row level security;

drop policy if exists cli_access_tokens_own_read on public.cli_access_tokens;
drop policy if exists cli_access_tokens_own_revoke on public.cli_access_tokens;
drop policy if exists cli_scan_events_own_read on public.cli_scan_events;

create policy cli_access_tokens_own_read on public.cli_access_tokens
  for select to authenticated using (user_id = auth.uid());
create policy cli_access_tokens_own_revoke on public.cli_access_tokens
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cli_scan_events_own_read on public.cli_scan_events
  for select to authenticated using (user_id = auth.uid());

grant select, update on public.cli_access_tokens to authenticated;
grant select on public.cli_scan_events to authenticated;

commit;
