create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  url text not null check (char_length(url) between 12 and 2048),
  enabled boolean not null default false,
  events jsonb not null default '["scan.completed"]'::jsonb,
  secret text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid not null references public.webhook_endpoints(id) on delete cascade,
  event text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0 and attempt_count <= 10),
  last_error text,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.webhook_endpoints enable row level security;
alter table public.webhook_deliveries enable row level security;

create policy "Users can manage their webhook endpoint"
  on public.webhook_endpoints for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can read their webhook deliveries"
  on public.webhook_deliveries for select using (
    exists (
      select 1 from public.webhook_endpoints endpoint
      where endpoint.id = webhook_id and endpoint.user_id = auth.uid()
    )
  );

create policy "Users can create their webhook deliveries"
  on public.webhook_deliveries for insert with check (
    exists (
      select 1 from public.webhook_endpoints endpoint
      where endpoint.id = webhook_id and endpoint.user_id = auth.uid()
    )
  );

create policy "Users can update their webhook deliveries"
  on public.webhook_deliveries for update using (
    exists (
      select 1 from public.webhook_endpoints endpoint
      where endpoint.id = webhook_id and endpoint.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.webhook_endpoints endpoint
      where endpoint.id = webhook_id and endpoint.user_id = auth.uid()
    )
  );

create index if not exists webhook_deliveries_retry_idx
  on public.webhook_deliveries (status, next_retry_at);
