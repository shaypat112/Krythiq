create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid,
  provider_id text not null check (char_length(provider_id) between 2 and 64),
  status text not null default 'connected' check (status in ('connected', 'expired', 'error', 'disconnected')),
  account_label text check (account_label is null or char_length(account_label) <= 200),
  permissions jsonb not null default '[]'::jsonb,
  credential_encrypted text,
  credential_hint text check (credential_hint is null or char_length(credential_hint) <= 32),
  expires_at timestamptz,
  last_sync_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 1000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, team_id, provider_id)
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid,
  channel text not null check (channel in ('in_app', 'email', 'slack', 'discord', 'webhook', 'browser_push')),
  event text not null check (event in ('scan.completed', 'vulnerability.critical', 'dependency.vulnerable', 'repository.connection_failed', 'integration.error', 'scan.summary_ready', 'report.weekly', 'deployment.failed')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, team_id, channel, event)
);

alter table public.integration_connections enable row level security;
alter table public.notification_preferences enable row level security;

create policy "Users can read their integration connections"
  on public.integration_connections for select using (auth.uid() = user_id);
create policy "Users can create their integration connections"
  on public.integration_connections for insert with check (auth.uid() = user_id);
create policy "Users can update their integration connections"
  on public.integration_connections for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their integration connections"
  on public.integration_connections for delete using (auth.uid() = user_id);

create policy "Users can manage their notification preferences"
  on public.notification_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists integration_connections_user_status_idx
  on public.integration_connections (user_id, status, provider_id);
create index if not exists notification_preferences_user_event_idx
  on public.notification_preferences (user_id, event, channel);
