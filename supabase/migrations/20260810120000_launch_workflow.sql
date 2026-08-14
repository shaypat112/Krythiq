begin;

alter table public.change_drafts
  add column if not exists expires_at timestamptz not null default (now() + interval '7 days');

alter table public.remediation_items enable row level security;
alter table public.change_drafts enable row level security;
alter table public.verification_runs enable row level security;
alter table public.launch_snapshots enable row level security;

create policy "Users manage their remediation items" on public.remediation_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their change drafts" on public.change_drafts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their verification runs" on public.verification_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their launch snapshots" on public.launch_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists remediation_items_queue_idx on public.remediation_items (user_id, team_id, repository, status, updated_at desc);
create index if not exists change_drafts_remediation_idx on public.change_drafts (remediation_id, created_at desc);
create index if not exists verification_runs_remediation_idx on public.verification_runs (remediation_id, created_at desc);
create index if not exists launch_snapshots_repository_idx on public.launch_snapshots (user_id, team_id, repository, created_at desc);

insert into public.token_action_costs (action, cost, label, enabled)
values
  ('verification_run', 15, 'Focused fix verification', true),
  ('draft_patch', 25, 'Draft patch generation', true)
on conflict (action) do update set cost = excluded.cost, label = excluded.label, enabled = true, updated_at = now();

commit;
