begin;

-- Keep the notification contract in one explicit place. This migration is safe
-- to rerun after a partially applied or manually repaired production schema.
alter table public.notification_preferences
  drop constraint if exists notification_preferences_channel_check,
  drop constraint if exists notification_preferences_event_check;

alter table public.notification_preferences
  add constraint notification_preferences_channel_check check (channel in (
    'in_app', 'email', 'webhook', 'slack', 'discord', 'browser_push'
  )),
  add constraint notification_preferences_event_check check (event in (
    'scan.completed', 'vulnerability.critical', 'dependency.vulnerable',
    'repository.connection_failed', 'integration.error', 'scan.summary_ready',
    'report.weekly', 'deployment.failed', 'token.requested', 'token.approved',
    'token.rejected', 'token.refund_requested', 'team.invited', 'team.joined',
    'repository.synced', 'billing.updated', 'social.follow_requested',
    'social.follow_accepted', 'social.message_received', 'workspace.created',
    'workspace.conflict', 'workspace.zip_exported',
    'workspace.branch_published', 'workspace.pull_request_created',
    'workspace.main_pushed'
  ));

-- PostgREST uses this exact key for idempotent preference upserts. NULLS NOT
-- DISTINCT makes personal preferences (team_id is null) conflict correctly.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.notification_preferences'::regclass
      and contype = 'u'
      and conname = 'notification_preferences_user_team_channel_event_key'
  ) then
    alter table public.notification_preferences
      add constraint notification_preferences_user_team_channel_event_key
      unique nulls not distinct (user_id, team_id, channel, event);
  end if;
end
$$;

alter table public.notification_preferences enable row level security;
alter table public.notification_preferences force row level security;

drop policy if exists "Users can manage their notification preferences" on public.notification_preferences;
drop policy if exists notification_preferences_own on public.notification_preferences;
create policy notification_preferences_own on public.notification_preferences
  for all to authenticated
  using (
    user_id = (select auth.uid())
    and (team_id is null or public.is_team_member(team_id))
  )
  with check (
    user_id = (select auth.uid())
    and (team_id is null or public.is_team_member(team_id))
  );

grant select, insert, update, delete on public.notification_preferences to authenticated;
grant usage on schema public to authenticated;

create index if not exists notification_preferences_user_team_idx
  on public.notification_preferences (user_id, team_id, updated_at desc);

-- Reassert the CRUD grants used by current authenticated API routes. RLS still
-- limits every row; these grants only make the intended operations possible.
grant select, insert, update, delete on
  public.scan_history,
  public.connected_repos,
  public.notifications,
  public.finding_reviews,
  public.webhook_endpoints,
  public.webhook_deliveries,
  public.teams,
  public.team_members,
  public.integration_connections,
  public.user_settings,
  public.team_environments,
  public.team_invitations,
  public.social_projects,
  public.social_posts,
  public.social_reactions,
  public.social_comments,
  public.social_connections,
  public.social_messages,
  public.repository_workspaces,
  public.workspace_files,
  public.workspace_presence
to authenticated;

grant select on
  public.workspace_audit_events,
  public.workspace_file_revisions,
  public.cli_access_tokens,
  public.cli_scan_events,
  public.token_transactions,
  public.token_purchases,
  public.token_requests
to authenticated;

commit;
