create table public.token_action_costs (
  action text primary key,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
create table public.ai_token_usages (
  action text not null references public.token_action_costs(action)
);
insert into public.token_action_costs(action) values ('agent_prompt'), ('draft_patch'), ('verification_run'), ('security_analysis');
insert into public.ai_token_usages(action) values ('agent_prompt'), ('draft_patch'), ('verification_run');
create table public.repository_workspaces(id uuid primary key);
create table public.remediation_items(id uuid primary key);
create table public.change_drafts(id uuid primary key, remediation_id uuid references public.remediation_items(id));
create table public.launch_snapshots(id uuid primary key);
