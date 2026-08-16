begin;

create table if not exists public.workspace_file_revisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.repository_workspaces(id) on delete cascade,
  workspace_file_id uuid not null references public.workspace_files(id) on delete cascade,
  path text not null check (char_length(path) between 1 and 1000),
  actor_id uuid not null references auth.users(id) on delete restrict,
  from_version integer not null check (from_version > 0),
  to_version integer not null check (to_version = from_version + 1),
  before_content text not null,
  after_content text not null,
  created_at timestamptz not null default now(),
  unique(workspace_file_id, to_version)
);

create index if not exists workspace_file_revisions_workspace_created_idx
  on public.workspace_file_revisions(workspace_id, created_at desc);
create index if not exists workspace_file_revisions_actor_created_idx
  on public.workspace_file_revisions(workspace_id, actor_id, created_at desc);

alter table public.workspace_file_revisions enable row level security;
alter table public.workspace_file_revisions force row level security;

create policy workspace_file_revisions_member_read on public.workspace_file_revisions
  for select to authenticated using (public.can_access_repository_workspace(workspace_id));

grant select on public.workspace_file_revisions to authenticated;

commit;
