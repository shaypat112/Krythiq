begin;

create extension if not exists pgcrypto;

alter table if exists public.change_drafts
  add column if not exists expires_at timestamptz not null default (now() + interval '7 days');

create table if not exists public.repository_workspaces (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  repository text not null check (repository ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'),
  base_branch text not null check (char_length(base_branch) between 1 and 255),
  base_commit_sha text not null check (base_commit_sha ~ '^[0-9a-f]{40}$'),
  title text not null default 'Repository workspace' check (char_length(title) between 1 and 200),
  status text not null default 'active' check (status in ('active', 'conflicted', 'published', 'archived')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists repository_workspaces_team_updated_idx
  on public.repository_workspaces(team_id, updated_at desc);
create index if not exists repository_workspaces_creator_updated_idx
  on public.repository_workspaces(created_by, updated_at desc);

create table if not exists public.workspace_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.repository_workspaces(id) on delete cascade,
  path text not null check (char_length(path) between 1 and 1000 and path !~ '(^/|(^|/)\.\.(/|$))'),
  base_blob_sha text check (base_blob_sha is null or base_blob_sha ~ '^[0-9a-f]{40}$'),
  original_content text not null,
  content text not null,
  last_edited_by uuid not null references auth.users(id) on delete restrict,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, path)
);

create index if not exists workspace_files_workspace_updated_idx
  on public.workspace_files(workspace_id, updated_at desc);

create table if not exists public.workspace_presence (
  workspace_id uuid not null references public.repository_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  active_file_path text,
  last_seen_at timestamptz not null default now(),
  primary key(workspace_id, user_id)
);

create index if not exists workspace_presence_recent_idx
  on public.workspace_presence(workspace_id, last_seen_at desc);

create table if not exists public.workspace_audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.repository_workspaces(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('workspace.created', 'file.modified', 'file.downloaded', 'patch.exported', 'zip.exported', 'sandbox.started', 'branch.published', 'pull_request.created', 'main.pushed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workspace_audit_workspace_created_idx
  on public.workspace_audit_events(workspace_id, created_at desc);

create or replace function public.can_access_repository_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.repository_workspaces workspace
    where workspace.id = target_workspace_id
      and (
        workspace.created_by = auth.uid()
        or (
          workspace.team_id is not null
          and (
            exists (select 1 from public.teams team where team.id = workspace.team_id and team.owner_id = auth.uid())
            or exists (select 1 from public.team_members member where member.team_id = workspace.team_id and member.user_id = auth.uid())
          )
        )
      )
  );
$$;

revoke all on function public.can_access_repository_workspace(uuid) from public, anon;
grant execute on function public.can_access_repository_workspace(uuid) to authenticated;

alter table public.repository_workspaces enable row level security;
alter table public.repository_workspaces force row level security;
alter table public.workspace_files enable row level security;
alter table public.workspace_files force row level security;
alter table public.workspace_presence enable row level security;
alter table public.workspace_presence force row level security;
alter table public.workspace_audit_events enable row level security;
alter table public.workspace_audit_events force row level security;

create policy repository_workspaces_member_read on public.repository_workspaces
  for select to authenticated using (public.can_access_repository_workspace(id));
create policy workspace_files_member_read on public.workspace_files
  for select to authenticated using (public.can_access_repository_workspace(workspace_id));
create policy workspace_presence_member_read on public.workspace_presence
  for select to authenticated using (public.can_access_repository_workspace(workspace_id));
create policy workspace_presence_own_write on public.workspace_presence
  for insert to authenticated with check (user_id = auth.uid() and public.can_access_repository_workspace(workspace_id));
create policy workspace_presence_own_update on public.workspace_presence
  for update to authenticated using (user_id = auth.uid() and public.can_access_repository_workspace(workspace_id))
  with check (user_id = auth.uid() and public.can_access_repository_workspace(workspace_id));
create policy workspace_presence_own_delete on public.workspace_presence
  for delete to authenticated using (user_id = auth.uid() and public.can_access_repository_workspace(workspace_id));
create policy workspace_audit_member_read on public.workspace_audit_events
  for select to authenticated using (public.can_access_repository_workspace(workspace_id));

grant select on public.repository_workspaces, public.workspace_files, public.workspace_audit_events to authenticated;
grant select, insert, update, delete on public.workspace_presence to authenticated;

alter table public.workspace_files replica identity full;
alter table public.workspace_presence replica identity full;
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workspace_files') then
    alter publication supabase_realtime add table public.workspace_files;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workspace_presence') then
    alter publication supabase_realtime add table public.workspace_presence;
  end if;
end $$;

commit;
