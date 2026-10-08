-- Bootstrap the original tables before the incremental feature migrations.
-- Existing installations retain their tables and data.
begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, username text unique, avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null, slug text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(), unique (team_id, user_id)
);
create table if not exists public.connected_repos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null, private boolean not null default false,
  last_scanned_at timestamptz, created_at timestamptz not null default now(),
  unique (user_id, full_name)
);
create table if not exists public.scan_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  repo_id uuid references public.connected_repos(id) on delete set null,
  repo text not null, severity text not null default 'low',
  issues integer not null default 0, score numeric not null default 0,
  findings jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, data jsonb not null default '{}'::jsonb,
  read_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique, stripe_subscription_id text,
  status text, price_id text, current_period_end timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete cascade,
  action text not null, target_type text, target_id text,
  meta jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.team_environments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null, slug text not null,
  created_at timestamptz not null default now(), unique (team_id, slug)
);

-- Historical migrations still reference these retired tables before locking
-- them down or removing them. Bootstrap them without public access.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'repositories', 'reviews', 'repo_reviews', 'messages', 'review_flags', 'scans'
  ] loop
    execute format('create table if not exists public.%I (id uuid primary key default gen_random_uuid())', table_name);
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
  foreach table_name in array array[
    'remediation_items', 'change_drafts', 'verification_runs', 'launch_snapshots'
  ] loop
    execute format('create table if not exists public.%I (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      team_id uuid references public.teams(id) on delete cascade,
      repository text, status text, remediation_id uuid,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    )', table_name);
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create index if not exists scan_history_user_created_idx on public.scan_history (user_id, created_at desc);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
commit;
